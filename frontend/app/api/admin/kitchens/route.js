import { ItemType } from "@prisma/client";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenInput } from "../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../lib/auth";
import { listKitchensForAdmin } from "../../../../lib/catalog";
import { prisma } from "../../../../lib/prisma";

const DEFAULT_KITCHEN_ITEMS = [
  {
    itemType: ItemType.ACCESSORY,
    code: "ACC-WASTE-001",
    articleNumber: "517467",
    name: "Waste separation system",
    nameDe: "Muelltrennsystem",
    price: "89.00",
    iconKey: "waste_system",
    sortOrder: 200,
    infoText: "Blanco Botton 517467",
    isActive: true,
  },
  {
    itemType: ItemType.ACCESSORY,
    code: "ACC-CUTLERY-ZB60SG",
    articleNumber: "ZB60SG",
    name: "Cutlery insert 60 cm",
    nameDe: "Besteckeinsatz 60 cm",
    price: "25.00",
    iconKey: "cutlery_insert",
    sortOrder: 210,
    infoText: "Cutlery insert 60 cm",
    isActive: true,
  },
  {
    itemType: ItemType.ACCESSORY,
    code: "ACC-LIGHT-003",
    articleNumber: "KA220043_S3",
    name: "Beleuchtungsset 3 LED-Spots",
    nameDe: "Beleuchtungsset 3 LED-Spots",
    price: "69.00",
    iconKey: "lighting_set",
    sortOrder: 220,
    isActive: true,
  },
];

export async function GET() {
  await requireAdminApi();
  return NextResponse.json(await listKitchensForAdmin());
}

export async function POST(request) {
  await requireAdminApi();
  try {
    const formData = await request.formData();
    const kitchen = await prisma.$transaction(async (tx) => {
      const createdKitchen = await tx.kitchen.create({
        data: validateKitchenInput(formData),
      });

      await tx.kitchenItem.createMany({
        data: DEFAULT_KITCHEN_ITEMS.map((item) => ({
          kitchenId: createdKitchen.id,
          ...item,
        })),
      });

      return createdKitchen;
    });

    return redirectWithFlash(request, `/admin/kitchens/${kitchen.id}`, "success", "Kitchen created with default catalog items.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/kitchens", "error", mapAdminMutationError(error, "Kitchen"));
  }
}
