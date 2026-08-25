import { buildSyncedKitchenItemPrice, getCatalogProgramPrice, shouldSyncKitchenItemPrice } from "./catalog-pricing";

export function requireCatalogProgramId(formData) {
  const programmId = String(formData.get("programmId") || "").trim();
  if (!programmId) throw new Error("Program ID is required.");
  return programmId;
}

export function catalogProgramPath(programmId) {
  return `/admin/catalog/articles?programmId=${encodeURIComponent(programmId)}`;
}

export function splitProgramPrice(data) {
  const { price, isActive, ...masterData } = data;
  return { masterData, price, isActive };
}

export async function syncCatalogProgramKitchenItemPrices(tx, { programmId, where, syncBlendePrice = false }) {
  const items = await tx.kitchenItem.findMany({
    where: {
      ...where,
      kitchen: { programmId },
    },
    include: {
      kitchen: { select: { slug: true, programmId: true } },
      catalogArticle: {
        include: { programPrices: { where: { programmId, isActive: true }, take: 1 } },
      },
      catalogBlende: {
        include: { programPrices: { where: { programmId, isActive: true }, take: 1 } },
      },
      catalogService: {
        include: { programPrices: { where: { programmId, isActive: true }, take: 1 } },
      },
    },
  });

  let syncedCount = 0;
  for (const item of items) {
    if (!shouldSyncKitchenItemPrice(item, { requireMatched: false })) continue;
    const pricedItem = {
      ...item,
      catalogArticleProgramPrice: item.catalogArticle?.programPrices?.[0] || null,
      catalogBlendeProgramPrice: item.catalogBlende?.programPrices?.[0] || null,
      catalogServiceProgramPrice: item.catalogService?.programPrices?.[0] || null,
    };
    const price = buildSyncedKitchenItemPrice(pricedItem);
    if (price == null) continue;
    await tx.kitchenItem.update({
      where: { id: item.id },
      data: {
        price,
        ...(syncBlendePrice && item.catalogBlende
          ? { blendePrice: getCatalogProgramPrice(item.catalogBlende) }
          : {}),
      },
    });
    syncedCount += 1;
  }

  return syncedCount;
}

export async function deleteProgramPriceOrMaster(tx, {
  programmId,
  entityId,
  programPriceDelegate,
  programPriceDeleteWhere,
  programPriceEntityWhere,
  masterDelegate,
  linkedItemWhere,
}) {
  const linkedCount = await tx.kitchenItem.count({
    where: {
      ...linkedItemWhere,
      kitchen: { programmId },
    },
  });
  if (linkedCount > 0) return { linkedCount, masterDeleted: false };

  await programPriceDelegate.deleteMany({ where: programPriceDeleteWhere });
  const remainingProgramPrices = await programPriceDelegate.count({ where: programPriceEntityWhere });
  const globalLinkedCount = await tx.kitchenItem.count({ where: linkedItemWhere });
  if (remainingProgramPrices === 0 && globalLinkedCount === 0) {
    await masterDelegate.delete({ where: { id: entityId } });
    return { linkedCount: 0, masterDeleted: true };
  }

  return { linkedCount: 0, masterDeleted: false };
}
