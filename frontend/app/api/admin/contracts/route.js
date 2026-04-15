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
    ownerId: searchParams.get("ownerId") || "",
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
    const createdContract = await prisma.kitchenContract.create({
      data: {
        contractNumber: data.contractNumber,
        kitchenId,
        isActive: true,
        country: data.country,
        city: data.city,
        postalCode: data.postalCode,
        address1: data.address1,
        address2: data.address2,
        building: data.building,
        floor: data.floor,
        unitNumber: data.unitNumber,
        notes: data.notes,
      },
    });
    await prisma.$executeRaw`
      UPDATE "KitchenContract"
      SET "ownerId" = ${data.ownerId}
      WHERE "id" = ${createdContract.id}
    `;

    return redirectWithFlash(request, "/admin/contracts", "success", "Contract number created.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/contracts", "error", mapAdminMutationError(error, "Contract number"));
  }
}
