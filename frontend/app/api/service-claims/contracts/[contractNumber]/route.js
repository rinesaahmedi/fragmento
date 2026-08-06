import { NextResponse } from "next/server";
import { getOrderKindForContractNumber } from "../../../../../lib/order-kind";
import { getServiceClaimKitchenPlan } from "../../../../../lib/service-claim-kitchen-plan";
import { getServiceClaimContractDetails } from "../../../../../lib/service-claims";
import {
  PUBLIC_VISIT_EVENT_TYPES,
  SERVICE_PAGE_PATH,
  safelyTrackPublicVisitEvent,
} from "../../../../../lib/public-visit-tracking";

export async function GET(request, { params }) {
  let submittedContractNumber = "";

  try {
    const { contractNumber } = await params;
    submittedContractNumber = String(contractNumber || "").trim();

    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_LOOKUP,
      contractNumber: submittedContractNumber,
      path: SERVICE_PAGE_PATH,
    });

    const contract = await getServiceClaimContractDetails(contractNumber);

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

    const kitchenPlan = await getServiceClaimKitchenPlan(contractNumber);

    return NextResponse.json({
      ok: true,
      contract,
      kitchenPlan,
    });
  } catch (error) {
    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
      contractNumber: submittedContractNumber,
      path: SERVICE_PAGE_PATH,
      metadata: { status: error.status || 500 },
    });

    return NextResponse.json(
      { ok: false, error: error.message || "Contract lookup failed." },
      { status: error.status || 500 },
    );
  }
}
