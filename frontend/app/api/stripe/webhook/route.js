import { handleStripeWebhook } from "../../../../lib/stripe-webhook-handler";

export async function POST(request) {
  return handleStripeWebhook(request, {
    stripeMode: "live",
    orderKind: "live",
  });
}
