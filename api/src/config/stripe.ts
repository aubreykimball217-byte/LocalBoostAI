import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in the environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24' as any, // Use the latest API version or a specific one
});

export const STRIPE_PLANS = {
  LITE: {
    id: 'lite',
    name: 'Lite',
    monthlyPrice: 2900, // in cents
    annualPrice: 2300 * 12, // in cents
    priceIdMonthly: process.env.STRIPE_PRICE_LITE_MONTHLY,
    priceIdAnnual: process.env.STRIPE_PRICE_LITE_ANNUAL,
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 5900,
    annualPrice: 4700 * 12,
    priceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    priceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
  },
  GROWTH: {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 10900,
    annualPrice: 8700 * 12,
    priceIdMonthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
    priceIdAnnual: process.env.STRIPE_PRICE_GROWTH_ANNUAL,
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 21900,
    annualPrice: 17500 * 12,
    priceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    priceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
};
