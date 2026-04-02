import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenItemInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let kitchenId = "";

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "update");
    kitchenId = (
      await prisma.kitchenItem.findUnique({
        where: { id },
        select: { kitchenId: true },
      })
    )?.kitchenId || "";

    if (intent === "delete") {
      const item = await prisma.kitchenItem.delete({
        where: { id },
        select: { kitchenId: true },
      });
      return redirectWithFlash(request, `/admin/kitchens/${item.kitchenId}`, "success", "Item deleted.");
    }

    const item = await prisma.kitchenItem.update({
      where: { id },
      data: validateKitchenItemInput(formData),
      select: { kitchenId: true },
    });

    return redirectWithFlash(request, `/admin/kitchens/${item.kitchenId}`, "success", "Item updated.");
  } catch (error) {
    const fallbackPath = kitchenId ? `/admin/kitchens/${kitchenId}` : "/admin/kitchens";
    return redirectWithFlash(request, fallbackPath, "error", mapAdminMutationError(error, "Item"));
  }
}
