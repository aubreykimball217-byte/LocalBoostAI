import { Request, Response } from 'express';
import { stripe, STRIPE_PLANS } from '../config/stripe.js';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const { planId, interval, businessId } = req.body;

    if (!planId || !interval || !businessId) {
      return res.status(400).json({ error: 'planId, interval, and businessId are required' });
    }

    const plan = Object.values(STRIPE_PLANS).find((p) => p.id === planId);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid planId' });
    }

    const priceId = interval === 'annual' ? plan.priceIdAnnual : plan.priceIdMonthly;
    if (!priceId) {
      return res.status(500).json({ error: 'Stripe Price ID not configured for this plan' });
    }

    // Get user email
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user?.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userEmail = userResult.rows[0].email;

    // Check if business already has a stripe_customer_id
    const businessResult = await db.query('SELECT stripe_customer_id FROM subscriptions WHERE business_id = $1', [businessId]);
    let stripeCustomerId = businessResult.rows[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          businessId,
          userId: req.user?.id || '',
        },
      });
      stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard/settings/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/settings/billing?status=cancel`,
      metadata: {
        businessId,
        planId,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Create Checkout Session Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const businessId = session.metadata.businessId;
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription;

      // Update subscription in DB
      // Note: We'll get more details from the subscription event or fetch it
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const planLevel = session.metadata.planId;
      const status = subscription.status;
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

      await db.query(
        `INSERT INTO subscriptions (business_id, stripe_customer_id, stripe_subscription_id, plan_level, status, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (business_id) 
         DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id, 
                       stripe_subscription_id = EXCLUDED.stripe_subscription_id, 
                       plan_level = EXCLUDED.plan_level, 
                       status = EXCLUDED.status, 
                       current_period_end = EXCLUDED.current_period_end`,
        [businessId, stripeCustomerId, stripeSubscriptionId, planLevel, status, currentPeriodEnd]
      );
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      const status = subscription.status;
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      const stripeSubscriptionId = subscription.id;

      await db.query(
        'UPDATE subscriptions SET status = $1, current_period_end = $2 WHERE stripe_subscription_id = $3',
        [status, currentPeriodEnd, stripeSubscriptionId]
      );
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

export const getCurrentSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const result = await db.query(
      'SELECT * FROM subscriptions WHERE business_id = $1',
      [businessId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: 'none' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const result = await db.query(
      'SELECT stripe_subscription_id FROM subscriptions WHERE business_id = $1',
      [businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const stripeSubscriptionId = result.rows[0].stripe_subscription_id;

    const deletedSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

    res.json({ message: 'Subscription cancelled', status: deletedSubscription.status });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const updateSubscriptionPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, newPlanId, interval } = req.body;
    if (!businessId || !newPlanId || !interval) {
      return res.status(400).json({ error: 'businessId, newPlanId, and interval are required' });
    }

    const result = await db.query(
      'SELECT stripe_subscription_id FROM subscriptions WHERE business_id = $1',
      [businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const stripeSubscriptionId = result.rows[0].stripe_subscription_id;

    const plan = Object.values(STRIPE_PLANS).find((p) => p.id === newPlanId);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid planId' });
    }

    const priceId = interval === 'annual' ? plan.priceIdAnnual : plan.priceIdMonthly;
    if (!priceId) {
      return res.status(500).json({ error: 'Stripe Price ID not configured for this plan' });
    }

    // Retrieve the subscription to find the current item ID
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'always_invoice',
      metadata: {
        planId: newPlanId,
      },
    });

    res.json({
      message: 'Subscription updated',
      status: updatedSubscription.status,
      planLevel: newPlanId,
    });
  } catch (error: any) {
    console.error('Update Plan Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
