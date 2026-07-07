import { NextResponse } from "next/server";
import { getContractOrderState, getKitchenContractForAccess } from "../../../lib/kitchen-contracts";
import { getOrderKindForContractNumber, ORDER_KIND_TEST } from "../../../lib/order-kind";
import {
  PUBLIC_VISIT_EVENT_TYPES,
  safelyTrackPublicVisitEvent,
} from "../../../lib/public-visit-tracking";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";

export async function POST(request) {
  let submittedContractNumber = "";

  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`kitchen-access:${clientIp}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    submittedContractNumber = body?.contractNumber || "";
    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.CONTRACT_SUBMITTED,
      contractNumber: submittedContractNumber,
      path: "/api/kitchen-access",
    });

    const contract = await getKitchenContractForAccess(submittedContractNumber);
    const contractOrderState = await getContractOrderState(contract.id);
    const orderKind = getOrderKindForContractNumber(contract.contractNumber);
    await safelyTrackPublicVisitEvent({
      request,
      eventType: orderKind === ORDER_KIND_TEST
        ? PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED
        : PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED,
      contractNumber: contract.contractNumber,
      path: "/api/kitchen-access",
      metadata: { orderKind },
    });

    return NextResponse.json({
      ok: true,
      kitchenSlug: contract.kitchen.slug,
      contractNumber: contract.contractNumber,
      hasExistingOrder: Boolean(contractOrderState.editableOrder),
      existingOrderId: contractOrderState.editableOrder?.id || null,
      hasConfirmedBaseline: contractOrderState.confirmedItems.length > 0,
    });
  } catch (error) {
    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED,
      contractNumber: submittedContractNumber,
      path: "/api/kitchen-access",
      metadata: { status: error.status || 400 },
    });

    return NextResponse.json(
      { ok: false, error: error.message || "Contract access failed." },
      { status: error.status || 400 },
    );
  }
}
