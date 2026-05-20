import Stripe from "stripe";

let stripeClient = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
