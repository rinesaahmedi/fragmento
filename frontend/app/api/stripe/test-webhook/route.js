import { handleStripeWebhook } from "../../../../lib/stripe-webhook-handler";

export async function POST(request) {
  return handleStripeWebhook(request, {
    stripeMode: "test",
    orderKind: "test",
  });
}
