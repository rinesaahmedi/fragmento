import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
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
      select: { id: true, kitchenId: true, usedAt: true },
    });

    if (!contract) {
      throw new Error("Contract number not found.");
    }
    kitchenId = contract.kitchenId;

    if (intent === "reactivate" && contract.usedAt) {
      throw new Error("Used contract numbers cannot be reactivated.");
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
