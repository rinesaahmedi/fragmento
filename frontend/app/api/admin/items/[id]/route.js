import { NextResponse } from "next/server";
import { prepareKitchenItemMutation } from "../../../../../lib/admin-kitchen-items";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let kitchenId = "";

  try {
    const formData = await request.formData();
    const intentValues = formData.getAll("_intent");
    const intent = String(intentValues[intentValues.length - 1] || "update");
    const existingItem = await prisma.kitchenItem.findUnique({
      where: { id },
      select: {
        kitchenId: true,
        price: true,
        blendePrice: true,
        catalogBlendeId: true,
        catalogBlendeQuantity: true,
        kitchen: {
          select: {
            id: true,
            slug: true,
            programmId: true,
          },
        },
      },
    });
    kitchenId = existingItem?.kitchenId || "";

    if (intent === "delete") {
      const item = await prisma.kitchenItem.delete({
        where: { id },
        select: { kitchenId: true },
      });
      return redirectWithFlash(request, `/admin/kitchens/${item.kitchenId}`, "success", "Item deleted.");
    }

    if (!existingItem?.kitchen) {
      throw new Error("Kitchen not found.");
    }

    const data = await prepareKitchenItemMutation({
      formData,
      kitchen: existingItem.kitchen,
      excludeItemId: id,
      existingItem,
    });

    const item = await prisma.kitchenItem.update({
      where: { id },
      data,
      select: { kitchenId: true },
    });

    return redirectWithFlash(request, `/admin/kitchens/${item.kitchenId}`, "success", "Item updated.");
  } catch (error) {
    const fallbackPath = kitchenId ? `/admin/kitchens/${kitchenId}` : "/admin/kitchens";
    return redirectWithFlash(request, fallbackPath, "error", mapAdminMutationError(error, "Item"));
  }
}
