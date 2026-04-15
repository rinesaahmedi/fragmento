import { NextResponse } from "next/server";
import { getContractOrderState, getKitchenContractForAccess } from "../../../lib/kitchen-contracts";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`kitchen-access:${clientIp}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const contract = await getKitchenContractForAccess(body?.contractNumber);
    const contractOrderState = await getContractOrderState(contract.id);

    return NextResponse.json({
      ok: true,
      kitchenSlug: contract.kitchen.slug,
      contractNumber: contract.contractNumber,
      hasExistingOrder: Boolean(contractOrderState.editableOrder),
      existingOrderId: contractOrderState.editableOrder?.id || null,
      hasConfirmedBaseline: contractOrderState.confirmedItems.length > 0,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Contract access failed." },
      { status: error.status || 400 },
    );
  }
}
