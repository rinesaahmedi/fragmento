import { NextResponse } from "next/server";
import { prepareKitchenItemMutation } from "../../../../../../lib/admin-kitchen-items";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { autoSyncKitchenHotspots } from "../../../../../../lib/kitchen-hotspots";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  try {
    const formData = await request.formData();
    const kitchen = await prisma.kitchen.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!kitchen) {
      throw new Error("Kitchen not found.");
    }

    const data = await prepareKitchenItemMutation({
      formData,
      kitchen,
    });

    await prisma.kitchenItem.create({
      data: {
        kitchenId: id,
        ...data,
      },
    });

    if (data.componentKey) {
      await autoSyncKitchenHotspots(prisma, id, { force: true });
    }

    return redirectWithFlash(request, `/admin/kitchens/${id}`, "success", "Item created.");
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Item"));
  }
}
