import { ItemType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const formData = await request.formData();
  const itemType = String(formData.get("itemType") || "");
  const item = await prisma.kitchenItem.update({
    where: { id },
    data: {
      itemType: Object.values(ItemType).includes(itemType) ? itemType : ItemType.COMPONENT,
      code: String(formData.get("code") || "").trim(),
      name: String(formData.get("name") || "").trim(),
      price: String(formData.get("price") || "0").trim(),
      iconKey: String(formData.get("iconKey") || "").trim() || null,
      colorKey: String(formData.get("colorKey") || "").trim() || null,
      componentKey: String(formData.get("componentKey") || "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") || 0),
      infoText: String(formData.get("infoText") || "").trim() || null,
      isLocked: formData.get("isLocked") === "true",
      isActive: formData.get("isActive") === "true",
    },
    select: { kitchenId: true },
  });

  return NextResponse.redirect(new URL(`/admin/kitchens/${item.kitchenId}`, request.url), 303);
}
