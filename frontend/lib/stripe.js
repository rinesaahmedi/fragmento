import Stripe from "stripe";

const stripeClients = new Map();

function getStripeSecretKey(mode = "live") {
  return mode === "test"
    ? process.env.STRIPE_TEST_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY;
}

export function getStripeClient(mode = "live") {
  const secretKey = getStripeSecretKey(mode);

  if (!secretKey) {
    return null;
  }

  if (!stripeClients.has(mode)) {
    stripeClients.set(mode, new Stripe(secretKey));
  }

  return stripeClients.get(mode);
}

export function isStripeConfigured(mode = "live") {
  return Boolean(getStripeSecretKey(mode));
}
