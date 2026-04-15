import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenContractInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const contract = await prisma.kitchenContract.findUnique({
    where: { id },
    include: { kitchen: true },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract number not found" }, { status: 404 });
  }

  return NextResponse.json(contract);
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let kitchenId = "";

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "").trim();
    const contract = await prisma.kitchenContract.findUnique({
      where: { id },
      select: { id: true, kitchenId: true },
    });

    if (!contract) {
      throw new Error("Contract number not found.");
    }
    kitchenId = contract.kitchenId;

    if (intent === "update") {
      const data = validateKitchenContractInput(formData);
      await prisma.kitchenContract.update({
        where: { id },
        data: {
          contractNumber: data.contractNumber,
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

      return redirectWithFlash(request, `/admin/kitchens/${contract.kitchenId}`, "success", "Contract number updated.");
    }

    const isActive = intent === "reactivate";
    await prisma.kitchenContract.update({
      where: { id },
      data: { isActive },
    });

    return redirectWithFlash(
      request,
      `/admin/kitchens/${contract.kitchenId}`,
      "success",
      isActive ? "Contract number reactivated." : "Contract number deactivated.",
    );
  } catch (error) {
    const pathname = kitchenId ? `/admin/kitchens/${kitchenId}` : "/admin/kitchens";
    return redirectWithFlash(request, pathname, "error", mapAdminMutationError(error, "Contract number"));
  }
}
