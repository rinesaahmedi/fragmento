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
    await prisma.kitchenContract.create({
      data: {
        contractNumber: data.contractNumber,
        kitchenId: kitchen.id,
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

    return redirectWithFlash(request, `/admin/kitchens/${id}`, "success", "Contract number created.");
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Contract number"));
  }
}
