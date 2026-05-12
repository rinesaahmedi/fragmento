import { NextResponse } from "next/server";
import { getServiceClaimKitchenPlan } from "../../../../../lib/service-claim-kitchen-plan";
import { getServiceClaimContractDetails } from "../../../../../lib/service-claims";

export async function GET(_request, { params }) {
  try {
    const { contractNumber } = await params;
    const contract = await getServiceClaimContractDetails(contractNumber);

    if (!contract) {
      return NextResponse.json(
        { ok: false, error: "Contract number was not found." },
        { status: 404 },
      );
    }

    const kitchenPlan = await getServiceClaimKitchenPlan(contractNumber);

    return NextResponse.json({
      ok: true,
      contract,
      kitchenPlan,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Contract lookup failed." },
      { status: error.status || 500 },
    );
  }
}
