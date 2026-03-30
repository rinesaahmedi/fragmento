import { NextResponse } from "next/server";
import { createOrderFromSubmission } from "../../../lib/orders";

export async function POST(request) {
  try {
    const body = await request.json();
    const order = await createOrderFromSubmission({
      kitchenSlug: body.kitchen_slug,
      orderPayload: body.order_payload,
      pdfBase64: body.pdf_base64,
      pdfFilename: body.pdf_filename,
    });

    return NextResponse.json({ success: true, orderNumber: order.orderNumber });
  } catch (error) {
    console.error("Order submission failed:", error);
    return NextResponse.json({ error: error.message || "Order submission failed" }, { status: 400 });
  }
}
