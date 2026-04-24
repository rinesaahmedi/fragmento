import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenContractInput } from "../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../lib/auth";
import { listKitchenContractsForAdmin } from "../../../../lib/catalog";
import { prisma } from "../../../../lib/prisma";

export async function GET(request) {
  await requireAdminApi();
  const { searchParams } = new URL(request.url);
  return NextResponse.json(await listKitchenContractsForAdmin({
    kitchenId: searchParams.get("kitchenId") || "",
    housingCompanyId: searchParams.get("housingCompanyId") || searchParams.get("ownerId") || "",
    propertyObjectId: searchParams.get("propertyObjectId") || "",
    status: searchParams.get("status") || "",
    usage: searchParams.get("usage") || "",
    query: searchParams.get("q") || "",
  }));
}

export async function POST(request) {
  await requireAdminApi();

  try {
    const formData = await request.formData();
    const kitchenId = String(formData.get("kitchenId") || "").trim();
    if (!kitchenId) {
      throw new Error("Kitchen is required.");
    }

    const data = validateKitchenContractInput(formData);
    const [propertyObject] = await prisma.$queryRaw`
      SELECT "id"
      FROM "PropertyObject"
      WHERE "id" = ${data.propertyObjectId}
        AND "housingCompanyId" = ${data.housingCompanyId}
      LIMIT 1
    `;
    if (!propertyObject) {
      throw new Error("Select a valid property object for the housing company.");
    }

    await prisma.kitchenContract.create({
      data: {
        contractNumber: data.contractNumber,
        kitchenId,
        propertyObjectId: data.propertyObjectId,
        isActive: true,
        building: data.building,
        floor: data.floor,
        unitNumber: data.unitNumber,
        notes: data.notes,
      },
    });

    return redirectWithFlash(request, "/admin/contracts", "success", "Contract number created.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/contracts", "error", mapAdminMutationError(error, "Contract number"));
  }
}
