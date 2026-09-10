const DISHWASHER_CLAIM_PARTS_BY_FRONT = {
  TGV45: [
    {
      partKey: "dishwasher",
      articleCode: "A-EGSPV587915",
      name: "Fully Integrated Dishwasher 45 cm",
      nameDe: "Vollintegrierter Geschirrspüler 45 cm",
      sortOrder: 32,
    },
    {
      partKey: "furniture-front",
      articleCode: "TGV45",
      name: "Furniture Front (Dishwasher)",
      nameDe: "Möbelfront (Geschirrspüler)",
      sortOrder: 34,
    },
  ],
  TGV60: [
    {
      partKey: "dishwasher",
      articleCode: "A-EGSPV597210",
      name: "Fully Integrated Dishwasher 60 cm",
      nameDe: "Vollintegrierter Geschirrspüler 60 cm",
      sortOrder: 32,
    },
    {
      partKey: "furniture-front",
      articleCode: "TGV60",
      name: "Furniture Front (Dishwasher)",
      nameDe: "Möbelfront (Geschirrspüler)",
      sortOrder: 34,
    },
  ],
};

const DISHWASHER_PART_KEYS = ["dishwasher", "furniture-front"];
const PRODUCT_INFORMATION_FIELDS = {
  productImagePath: null,
  productInfoPdfPath: null,
  productInfoSummary: null,
  productInfoKeyFacts: null,
  productInfoExtractedText: null,
  productInfoUpdatedAt: null,
};

function getDishwasherFrontCode(item) {
  if (!item || item.isActive === false) return null;
  if (!String(item.code || "").trim().toUpperCase().startsWith("DISH-")) return null;

  const articleCodes = String(item.articleNumber || "")
    .split("+")
    .map((code) => code.trim().toUpperCase());

  if (articleCodes.includes("TGV45")) return "TGV45";
  if (articleCodes.includes("TGV60")) return "TGV60";
  return null;
}

export function getDishwasherClaimPartDefinitions(item) {
  const frontCode = getDishwasherFrontCode(item);
  return frontCode ? DISHWASHER_CLAIM_PARTS_BY_FRONT[frontCode] : [];
}

export async function syncDishwasherClaimPartsForAdminItem({ tx, item, previousItem }) {
  const claimParts = getDishwasherClaimPartDefinitions(item);
  const wasDishwasher = getDishwasherClaimPartDefinitions(previousItem).length > 0;

  if (!claimParts.length) {
    if (!wasDishwasher) return;

    await tx.kitchenClaimPart.updateMany({
      where: {
        kitchenId: previousItem.kitchenId,
        partKey: { in: DISHWASHER_PART_KEYS },
        sourceKitchenItemCode: previousItem.code,
      },
      data: { isActive: false },
    });
    return;
  }

  const existingParts = await tx.kitchenClaimPart.findMany({
    where: {
      kitchenId: item.kitchenId,
      partKey: { in: DISHWASHER_PART_KEYS },
    },
    select: { partKey: true, articleCode: true },
  });
  const existingByPartKey = new Map(existingParts.map((part) => [part.partKey, part]));

  for (const part of claimParts) {
    const articleChanged = existingByPartKey.get(part.partKey)?.articleCode !== part.articleCode;
    const source = {
      sourceKitchenItemCode: item.code,
      sourceComponentKey: item.componentKey,
      isActive: true,
    };

    await tx.kitchenClaimPart.upsert({
      where: {
        kitchenId_partKey: {
          kitchenId: item.kitchenId,
          partKey: part.partKey,
        },
      },
      update: {
        ...part,
        ...source,
        ...(articleChanged ? PRODUCT_INFORMATION_FIELDS : {}),
      },
      create: {
        kitchenId: item.kitchenId,
        ...part,
        ...source,
      },
    });
  }
}
