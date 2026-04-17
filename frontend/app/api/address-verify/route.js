import { NextResponse } from "next/server";
import {
  ADDRESS_VERIFICATION_STATUS,
  buildAddressVerificationSnapshot,
} from "../../../lib/address-verification";
import {
  createAddressVerificationRecord,
  verifyAddressWithProvider,
} from "../../../lib/address-verification-server";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`address-verify:${clientIp}`, {
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const snapshot = buildAddressVerificationSnapshot(body || {});
    const result = await verifyAddressWithProvider(snapshot);

    if (result.status === ADDRESS_VERIFICATION_STATUS.VALID) {
      const verification = createAddressVerificationRecord(snapshot);
      return NextResponse.json({
        ok: true,
        status: ADDRESS_VERIFICATION_STATUS.VALID,
        message: result.message,
        suggestion: result.suggestion || "",
        provider: result.provider,
        verification,
      });
    }

    return NextResponse.json(
      {
        ok: result.status !== ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE,
        status: result.status,
        message: result.message,
        suggestion: result.suggestion || "",
        provider: result.provider,
      },
      {
        status:
          result.status === ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE
            ? 503
            : result.status === ADDRESS_VERIFICATION_STATUS.PARTIAL_MATCH
              ? 200
              : 400,
      },
    );
  } catch (error) {
    console.error("Address verification failed:", error);
    return NextResponse.json(
      {
        ok: false,
        status: ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE,
        message: error.message || "Address verification failed.",
        suggestion: "",
      },
      { status: 503 },
    );
  }
}
