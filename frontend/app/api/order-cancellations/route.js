import { NextResponse } from "next/server";
import { createCancellationRequest } from "../../../lib/order-cancellations";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";

function getRequestOrigin(request) {
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host");
  return host ? `${proto || "https"}://${host}` : request.nextUrl.origin;
}

export async function POST(request) {
  try {
    enforceRateLimit(`order-cancellations:${getRequestClientIp(request)}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    const body = await request.json();
    const result = await createCancellationRequest(body, { origin: getRequestOrigin(request) });
    return NextResponse.json({
      success: true,
      referenceNumber: result.request.referenceNumber,
      duplicate: result.duplicate,
      notificationPending: result.emailErrors.length > 0,
      message: "Your withdrawal has been registered and will be reviewed. The order is not cancelled yet.",
    });
  } catch (error) {
    console.error("Order cancellation request failed:", error);
    return NextResponse.json(
      { error: error.message || "The withdrawal could not be registered." },
      { status: error.status || 400 },
    );
  }
}
