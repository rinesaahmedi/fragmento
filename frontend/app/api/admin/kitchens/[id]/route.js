import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { getKitchenById } from "../../../../../lib/catalog";
import { autoSyncKitchenHotspots } from "../../../../../lib/kitchen-hotspots";
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
    const existingKitchen = await prisma.kitchen.findUnique({
      where: { id },
      select: { slug: true, planImagePath: true, planPdfPath: true },
    });

    if (!existingKitchen) {
      throw new Error("Kitchen not found.");
    }

    const input = validateKitchenInput(formData, { fallbackSlug: existingKitchen.slug });
    const hotspotsFieldEmpty = !String(formData.get("hotspots") || "").trim();
    const planChanged =
      input.planImagePath !== existingKitchen.planImagePath ||
      input.planPdfPath !== existingKitchen.planPdfPath;

    await prisma.kitchen.update({
      where: { id },
      data: input,
    });

    if ((hotspotsFieldEmpty || planChanged) && (input.planImagePath || input.planPdfPath)) {
      await autoSyncKitchenHotspots(prisma, id, { force: true });
    }

    return redirectWithFlash(request, `/admin/kitchens/${id}`, "success", "Kitchen updated.");
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Kitchen"));
  }
}
