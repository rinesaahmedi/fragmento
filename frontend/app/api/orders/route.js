import { NextResponse } from "next/server";
import { createOrderFromSubmission } from "../../../lib/orders";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";

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

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
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
