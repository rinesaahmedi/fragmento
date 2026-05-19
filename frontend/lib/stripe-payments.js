import { prisma } from "./prisma";

export function getPaymentStatusLabel(status) {
  const value = String(status || "UNPAID").toUpperCase();
  if (value === "PAID") return "Paid";
  if (value === "PENDING") return "Pending";
  if (value === "FAILED") return "Failed";
  if (value === "CANCELLED") return "Cancelled";
  return "Unpaid";
}

export async function updateOrderFromCheckoutSession(session) {
  if (!session?.id) {
    return null;
  }

  const orderNumber = session.client_reference_id || session.metadata?.orderNumber || "";
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;
  const isPaid = session.payment_status === "paid" || session.status === "complete";
  const isFailed = session.payment_status === "failed" || session.status === "expired";

  const data = {
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    paymentStatus: isPaid ? "PAID" : isFailed ? "FAILED" : "PENDING",
    paidAt: isPaid ? new Date() : null,
  };

  if (orderNumber) {
    return prisma.order.update({
      where: { orderNumber },
      data,
    });
  }

  return prisma.order.update({
    where: { stripeCheckoutSessionId: session.id },
    data,
  });
}
