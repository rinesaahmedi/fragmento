import { KitchenStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenInput } from "../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../lib/auth";
import { listKitchensForAdmin } from "../../../../lib/catalog";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  await requireAdminApi();
  return NextResponse.json(await listKitchensForAdmin());
}

export async function POST(request) {
  await requireAdminApi();
  try {
    const formData = await request.formData();
    const kitchen = await prisma.kitchen.create({
      data: validateKitchenInput(formData),
    });

    return redirectWithFlash(request, `/admin/kitchens/${kitchen.id}`, "success", "Kitchen created.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/kitchens", "error", mapAdminMutationError(error, "Kitchen"));
  }
}
