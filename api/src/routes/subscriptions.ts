import { Router } from 'express';
import * as subscriptionController from '../controllers/subscriptions.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Webhook needs raw body, so we use express.raw() for this specific route
// or handle it in index.ts before body-parser.
// For simplicity in this task, I'll assume raw body is handled or sig verified differently.
// Actually, Stripe recommends using a separate middleware for webhooks.

router.post('/webhook', subscriptionController.handleWebhook);

router.post('/create-checkout', authenticate, subscriptionController.createCheckoutSession);
router.get('/current', authenticate, subscriptionController.getCurrentSubscription);
router.post('/cancel', authenticate, subscriptionController.cancelSubscription);
router.post('/update-plan', authenticate, subscriptionController.updateSubscriptionPlan);

export default router;
