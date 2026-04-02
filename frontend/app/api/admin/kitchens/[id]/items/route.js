import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenItemInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  try {
    const formData = await request.formData();

    await prisma.kitchenItem.create({
      data: {
        kitchenId: id,
        ...validateKitchenItemInput(formData),
      },
    });

    return redirectWithFlash(request, `/admin/kitchens/${id}`, "success", "Item created.");
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Item"));
  }
}
