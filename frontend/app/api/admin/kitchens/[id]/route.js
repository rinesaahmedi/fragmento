import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { getKitchenById } from "../../../../../lib/catalog";
import { prisma } from "../../../../../lib/prisma";

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const kitchen = await getKitchenById(id);
  if (!kitchen) {
    return NextResponse.json({ error: "Kitchen not found" }, { status: 404 });
  }
  return NextResponse.json(kitchen);
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  try {
    const formData = await request.formData();

    await prisma.kitchen.update({
      where: { id },
      data: validateKitchenInput(formData),
    });

    return redirectWithFlash(request, `/admin/kitchens/${id}`, "success", "Kitchen updated.");
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Kitchen"));
  }
}
