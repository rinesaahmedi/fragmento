import { redirectWithFlash, mapAdminMutationError, validateKitchenInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { autoSyncKitchenHotspots } from "../../../../../lib/kitchen-hotspots";
import { prisma } from "../../../../../lib/prisma";

function optionalString(value) {
  const nextValue = String(value || "").trim();
  return nextValue || null;
}

function getCopiedKitchenData(formData, sourceKitchen) {
  const input = validateKitchenInput(formData);

  return {
    ...input,
    planImagePath: input.planImagePath || sourceKitchen.planImagePath || null,
    planPdfPath: input.planPdfPath || sourceKitchen.planPdfPath || null,
    hotspots: null,
    linkedComponentGroups: input.linkedComponentGroups || sourceKitchen.linkedComponentGroups || null,
  };
}

function copyItemData(item) {
  return {
    itemType: item.itemType,
    code: item.code,
    articleNumber: item.articleNumber,
    name: item.name,
    nameDe: item.nameDe,
    price: item.price,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    depthMm: item.depthMm,
    infoText: item.infoText,
    productImagePath: item.productImagePath,
    productInfoPdfPath: item.productInfoPdfPath,
    productInfoSummary: item.productInfoSummary,
    productInfoKeyFacts: item.productInfoKeyFacts,
    productInfoExtractedText: item.productInfoExtractedText,
    productInfoUpdatedAt: item.productInfoUpdatedAt,
    iconKey: item.iconKey,
    colorKey: item.colorKey,
    componentKey: item.componentKey,
    calloutNumber: item.calloutNumber,
    isLocked: item.isLocked,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
  };
}

export async function POST(request) {
  await requireAdminApi();

  try {
    const formData = await request.formData();
    const sourceKitchenId = String(formData.get("sourceKitchenId") || "").trim();
    const contractNumber = optionalString(formData.get("contractNumber"));
    if (!sourceKitchenId) {
      throw new Error("Source kitchen is required.");
    }

    const sourceKitchen = await prisma.kitchen.findUnique({
      where: { id: sourceKitchenId },
      include: { items: true },
    });

    if (!sourceKitchen) {
      throw new Error("Source kitchen was not found.");
    }

    const createdKitchen = await prisma.$transaction(async (tx) => {
      const kitchen = await tx.kitchen.create({
        data: getCopiedKitchenData(formData, sourceKitchen),
      });

      if (sourceKitchen.items.length) {
        await tx.kitchenItem.createMany({
          data: sourceKitchen.items.map((item) => ({
            kitchenId: kitchen.id,
            ...copyItemData(item),
          })),
        });
      }

      if (contractNumber) {
        await tx.kitchenContract.create({
          data: {
            contractNumber,
            kitchenId: kitchen.id,
            isActive: true,
          },
        });
      }

      return kitchen;
    });

    await autoSyncKitchenHotspots(prisma, createdKitchen.id, { force: true });

    return redirectWithFlash(request, `/admin/kitchens/${createdKitchen.id}`, "success", "Kitchen duplicated.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/kitchens", "error", mapAdminMutationError(error, "Kitchen"));
  }
}
