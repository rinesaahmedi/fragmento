import { NextResponse } from "next/server";
import { createOrderFromSubmission } from "../../../lib/orders";
import { prisma } from "../../../lib/prisma";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";
import { getStripeClient } from "../../../lib/stripe";

function getRequestOrigin(request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

function buildCheckoutCancelUrl({ request, origin, order, kitchenSlug }) {
  const fallbackUrl = new URL(`/kitchens/${encodeURIComponent(kitchenSlug)}`, origin);
  const referer = request.headers.get("referer");
  let cancelUrl = fallbackUrl;

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (
        refererUrl.origin === origin &&
        refererUrl.pathname === `/kitchens/${kitchenSlug}`
      ) {
        cancelUrl = refererUrl;
      }
    } catch {
      cancelUrl = fallbackUrl;
    }
  }

  cancelUrl.searchParams.set("checkout", "cancelled");
  cancelUrl.searchParams.set("order", order.orderNumber);
  if (!cancelUrl.searchParams.get("contractNumber") && order.customer.contractNumber) {
    cancelUrl.searchParams.set("contractNumber", order.customer.contractNumber);
  }

  return cancelUrl.toString();
}

async function createCheckoutSession({ request, order, kitchenSlug }) {
  const stripe = getStripeClient();

  if (!stripe) {
    return null;
  }

  const origin = getRequestOrigin(request);
  const amount = Math.round(Number(order.total || 0) * 100);
  const cancelUrl = buildCheckoutCancelUrl({ request, origin, order, kitchenSlug });

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: order.customer.email,
    client_reference_id: order.orderNumber,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: process.env.STRIPE_CURRENCY || "eur",
          unit_amount: amount,
          product_data: {
            name: `Fragmento order ${order.orderNumber}`,
            description: order.kitchen.name,
          },
        },
      },
    ],
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      kitchenSlug,
      paymentMethod: order.customer.paymentMethod || "",
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order=${encodeURIComponent(order.orderNumber)}`,
    cancel_url: cancelUrl,
  });
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`orders:${clientIp}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const order = await createOrderFromSubmission({
      kitchenSlug: body.kitchen_slug,
      orderPayload: body.order_payload,
      pdfBase64: body.pdf_base64,
      pdfFilename: body.pdf_filename,
    });
    const checkoutSession = await createCheckoutSession({
      request,
      order,
      kitchenSlug: body.kitchen_slug,
    });

    if (checkoutSession?.id) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PENDING",
          stripeCheckoutSessionId: checkoutSession.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      checkoutUrl: checkoutSession?.url || null,
      notifications: order.notifications || null,
    });
  } catch (error) {
    console.error("Order submission failed:", error);
    return NextResponse.json(
      { error: error.message || "Order submission failed" },
      { status: error.status || 400 },
    );
  }
}
