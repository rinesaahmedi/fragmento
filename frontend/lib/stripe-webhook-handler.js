import { NextResponse } from "next/server";
import { getStripeClient } from "./stripe";
import { updateOrderFromCheckoutSession } from "./stripe-payments";

function getWebhookSecret(mode = "live") {
  return mode === "test"
    ? process.env.STRIPE_TEST_WEBHOOK_SECRET
    : process.env.STRIPE_WEBHOOK_SECRET;
}

export async function handleStripeWebhook(request, { stripeMode = "live", orderKind = "live" } = {}) {
  const stripe = getStripeClient(stripeMode);
  const webhookSecret = getWebhookSecret(stripeMode);

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${error.message}` }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await updateOrderFromCheckoutSession(event.data.object, { orderKind });
    }

    if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const session = event.data.object;
      await updateOrderFromCheckoutSession({
        ...session,
        payment_status: "unpaid",
        status: "expired",
      }, { orderKind });
    }
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
