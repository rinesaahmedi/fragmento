import { prisma } from "./prisma";
import { getStripeClient } from "./stripe";

export function getPaymentStatusLabel(status) {
  const value = String(status || "UNPAID").toUpperCase();
  if (value === "PAID") return "Paid";
  if (value === "PENDING") return "Pending";
  if (value === "FAILED") return "Failed";
  if (value === "CANCELLED") return "Cancelled";
  return "Unpaid";
}

function normalizeStripeCheckoutPaymentMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "card" || normalized === "visa" || normalized === "mastercard") {
    return "card";
  }
  return "card";
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
  const paidAt = session.created ? new Date(Number(session.created) * 1000) : new Date();

  const data = {
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    paymentStatus: isPaid ? "PAID" : isFailed ? "FAILED" : "PENDING",
    paidAt: isPaid ? paidAt : null,
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

export async function createCheckoutSessionForOrder({ order, origin, successPath = "/checkout/success", cancelUrl }) {
  const stripe = getStripeClient();

  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const amount = Math.round(Number(order.totalPrice ?? order.total ?? 0) * 100);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Order total must be greater than zero.");
  }

  const orderNumber = order.orderNumber;
  const kitchenSlug = order.kitchen?.slug || "";
  const customerEmail = order.email || order.customer?.email || "";
  const paymentMethod = normalizeStripeCheckoutPaymentMethod(order.paymentMethod || order.customer?.paymentMethod);
  const successUrl = new URL(successPath, origin);
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  successUrl.searchParams.set("order", orderNumber);
  const stripeSuccessUrl = successUrl.toString().replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: customerEmail || undefined,
    client_reference_id: orderNumber,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: process.env.STRIPE_CURRENCY || "eur",
          unit_amount: amount,
          product_data: {
            name: `Fragmento order ${orderNumber}`,
            description: order.kitchen?.name || "Fragmento order",
          },
        },
      },
    ],
    metadata: {
      orderId: order.id,
      orderNumber,
      kitchenSlug,
      paymentMethod,
    },
    success_url: stripeSuccessUrl,
    cancel_url: cancelUrl,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PENDING",
      paymentMethod,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: null,
      paidAt: null,
    },
  });

  return session;
}

export async function cancelOrderPayment(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentStatus: true,
      stripeCheckoutSessionId: true,
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  const currentPaymentStatus = String(order.paymentStatus || "UNPAID").toUpperCase();

  if (currentPaymentStatus !== "PAID" && order.stripeCheckoutSessionId) {
    const stripe = getStripeClient();
    if (stripe) {
      try {
        await stripe.checkout.sessions.expire(order.stripeCheckoutSessionId);
      } catch (error) {
        if (error?.code !== "resource_missing" && error?.code !== "checkout_session_not_open") {
          throw error;
        }
      }
    }
  }

  if (currentPaymentStatus === "PAID") {
    return prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      paymentStatus: "CANCELLED",
    },
  });
}
