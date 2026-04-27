import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenContractInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { getKitchenById } from "../../../../../../lib/catalog";
import { prisma } from "../../../../../../lib/prisma";

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const kitchen = await getKitchenById(id);
  if (!kitchen) {
    return NextResponse.json({ error: "Kitchen not found" }, { status: 404 });
  }

  return NextResponse.json(kitchen.contracts || []);
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  try {
    const formData = await request.formData();
    const kitchen = await getKitchenById(id);
    if (!kitchen) {
      throw new Error("Kitchen not found.");
    }

    const data = validateKitchenContractInput(formData);
    if (data.housingCompanyId && data.propertyObjectId) {
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
    }

    await prisma.kitchenContract.create({
      data: {
        contractNumber: data.contractNumber,
        kitchenId: kitchen.id,
        propertyObjectId: data.propertyObjectId || null,
        isActive: true,
        building: data.building,
        floor: data.floor,
        unitNumber: data.unitNumber,
        notes: data.notes,
      },
    });

    return redirectWithFlash(request, `/admin/kitchens/${id}`, "success", "Contract number created.");
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Contract number"));
  }
}
