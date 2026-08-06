import { NextResponse } from "next/server";
import { getOrderKindForContractNumber } from "../../../../../lib/order-kind";
import { getServiceClaimKitchenPlan } from "../../../../../lib/service-claim-kitchen-plan";
import {
  isServiceClaimContractLookupReady,
  normalizeServiceClaimContractNumber,
} from "../../../../../lib/service-claim-lookup";
import { getServiceClaimContractDetails } from "../../../../../lib/service-claims";
import {
  PUBLIC_VISIT_EVENT_TYPES,
  SERVICE_PAGE_PATH,
  safelyTrackPublicVisitEvent,
} from "../../../../../lib/public-visit-tracking";
import { enforceRateLimit, getRequestClientIp } from "../../../../../lib/rate-limit";

export async function GET(request, { params }) {
  let submittedContractNumber = "";

  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`service-claim-lookup:${clientIp}`, {
      limit: 40,
      windowMs: 15 * 60 * 1000,
    });

    const { contractNumber } = await params;
    submittedContractNumber = normalizeServiceClaimContractNumber(contractNumber);

    if (!isServiceClaimContractLookupReady(submittedContractNumber)) {
      return NextResponse.json(
        { ok: false, error: "Contract number was not found." },
        { status: 404 },
      );
    }

    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_LOOKUP,
      contractNumber: submittedContractNumber,
      path: SERVICE_PAGE_PATH,
    });

    const contract = await getServiceClaimContractDetails(submittedContractNumber);

    if (!contract) {
      await safelyTrackPublicVisitEvent({
        request,
        eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
        contractNumber: submittedContractNumber,
        path: SERVICE_PAGE_PATH,
      });

      return NextResponse.json(
        { ok: false, error: "Contract number was not found." },
        { status: 404 },
      );
    }

    const orderKind = getOrderKindForContractNumber(contract.contractNumber);
    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND,
      contractNumber: contract.contractNumber,
      kitchenContractId: contract.id,
      path: SERVICE_PAGE_PATH,
      metadata: { orderKind },
    });

    const kitchenPlan = await getServiceClaimKitchenPlan(submittedContractNumber);

    return NextResponse.json({
      ok: true,
      contract,
      kitchenPlan,
    });
  } catch (error) {
    if (isServiceClaimContractLookupReady(submittedContractNumber)) {
      await safelyTrackPublicVisitEvent({
        request,
        eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
        contractNumber: submittedContractNumber,
        path: SERVICE_PAGE_PATH,
        metadata: { status: error.status || 500 },
      });
    }

    return NextResponse.json(
      { ok: false, error: error.message || "Contract lookup failed." },
      { status: error.status || 500 },
    );
  }
}
