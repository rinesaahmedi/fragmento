import Link from "next/link";
import { getStripeClient } from "../../../lib/stripe";
import { updateOrderFromCheckoutSession } from "../../../lib/stripe-payments";

export default async function CheckoutSuccessPage({ searchParams }) {
  const params = await searchParams;
  const orderNumber = params?.order || "";
  const sessionId = params?.session_id || "";
  let paymentStatus = "received";

  if (sessionId) {
    try {
      const stripe = getStripeClient();
      const session = stripe ? await stripe.checkout.sessions.retrieve(sessionId) : null;
      if (session) {
        await updateOrderFromCheckoutSession(session);
        paymentStatus = session.payment_status === "paid" ? "confirmed" : "received";
      }
    } catch (error) {
      console.error("Could not confirm Stripe checkout session:", error);
    }
  }

  return (
    <main className="public-page-shell" style={{ padding: "48px 20px" }}>
      <section className="public-section" style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1>Payment received</h1>
        <p>
          Thank you. Your payment was {paymentStatus}
          {orderNumber ? ` for order ${orderNumber}` : ""}.
        </p>
        <Link href="/" className="button-primary">Back to Fragmento</Link>
      </section>
    </main>
  );
}
