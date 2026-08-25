import { ItemType } from "@prisma/client";
import { validateKitchenItemInput } from "./admin-forms";
import { findKitchenStructureSlot, getKitchenStructureSlots } from "./kitchen-structure";
import { getCompatibilityMessage, isItemCompatibleWithSlot } from "./kitchen-slot-compatibility";
import { isStandaloneCatalogBlendeItem } from "./catalog-pricing";
import { prisma } from "./prisma";

function moneyToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function centsToMoney(cents) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function getBlendeTotalCents({ blendePrice, catalogBlendeQuantity, catalogBlendeId }) {
  if (blendePrice == null) return 0;
  const quantity = catalogBlendeId ? Math.max(1, Number.parseInt(String(catalogBlendeQuantity || 1), 10) || 1) : 0;
  return moneyToCents(blendePrice) * quantity;
}

function applyBlendePriceDelta(input, existingItem, catalogBlende) {
  const newQuantity = catalogBlende ? (input.catalogBlendeQuantity || 1) : null;
  const newBlendeTotalCents = catalogBlende
    ? getBlendeTotalCents({
        blendePrice: catalogBlende.price,
        catalogBlendeQuantity: newQuantity,
        catalogBlendeId: catalogBlende.id,
      })
    : 0;

  if (input.articleBasePrice != null) {
    return centsToMoney(moneyToCents(input.articleBasePrice) + newBlendeTotalCents);
  }

  const oldBlendeTotalCents = existingItem
    ? getBlendeTotalCents({
        blendePrice: existingItem.blendePrice,
        catalogBlendeQuantity: existingItem.catalogBlendeQuantity,
        catalogBlendeId: existingItem.catalogBlendeId,
      })
    : 0;

  const submittedPriceCents = moneyToCents(input.price);
  const existingPriceCents = existingItem ? moneyToCents(existingItem.price) : null;
  const adminChangedPriceManually = existingPriceCents != null && submittedPriceCents !== existingPriceCents;
  const blendeChanged = oldBlendeTotalCents !== newBlendeTotalCents;

  if (!blendeChanged || adminChangedPriceManually) {
    return input.price;
  }

  return centsToMoney(submittedPriceCents - oldBlendeTotalCents + newBlendeTotalCents);
}

export async function prepareKitchenItemMutation({ formData, kitchen, excludeItemId = "", existingItem = null }) {
  const input = validateKitchenItemInput(formData);
  const structureSlots = getKitchenStructureSlots(kitchen.slug);
  const duplicateCode = await prisma.kitchenItem.findFirst({
    where: {
      kitchenId: kitchen.id,
      code: input.code,
      ...(excludeItemId ? { NOT: { id: excludeItemId } } : {}),
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (duplicateCode) {
    throw new Error(`Item code "${input.code}" is already used by "${duplicateCode.name}". Article numbers must be unique.`);
  }

  const [catalogArticle, catalogBlende, catalogService] = await Promise.all([
    input.catalogArticleId
      ? prisma.catalogArticle.findUnique({ where: { id: input.catalogArticleId } })
      : null,
    input.catalogBlendeId
      ? prisma.catalogBlende.findUnique({ where: { id: input.catalogBlendeId } })
      : null,
    input.catalogServiceId
      ? prisma.catalogService.findUnique({ where: { id: input.catalogServiceId } })
      : null,
  ]);

  if (input.catalogArticleId && !catalogArticle) {
    throw new Error("Selected catalog article was not found.");
  }

  if (input.catalogBlendeId && !catalogBlende) {
    throw new Error("Selected blende was not found.");
  }

  if (input.catalogServiceId && !catalogService) {
    throw new Error("Selected service was not found.");
  }

  const standaloneCatalogBlende = isStandaloneCatalogBlendeItem({
    ...input,
    catalogArticle,
    catalogBlende,
  });

  if (catalogBlende && !catalogArticle && !standaloneCatalogBlende) {
    throw new Error("A blende can only be attached to a linked catalog article.");
  }

  if (input.itemType === ItemType.SERVICE && !catalogService) {
    throw new Error("Choose a service from the catalog.");
  }

  if (
    input.itemType !== ItemType.SERVICE
    && input.isActive
    && !input.isLocked
    && !catalogArticle
    && !standaloneCatalogBlende
  ) {
    throw new Error("Choose an article from the catalog. Active kitchen items cannot use free-text article data.");
  }

  if (input.itemType !== ItemType.SERVICE && catalogService) {
    throw new Error("Only service items can use a service catalog link.");
  }

  if (catalogArticle) {
    input.articleBasePrice = String(catalogArticle.price);
  }

  if (catalogService && !catalogArticle && !catalogBlende && moneyToCents(input.price) === 0) {
    input.price = String(catalogService.price);
  }

  const data = {
    ...input,
    articleNumber: catalogArticle?.articleNumber
      || (standaloneCatalogBlende ? catalogBlende?.code : null),
    name: catalogArticle?.name
      || catalogService?.name
      || (standaloneCatalogBlende ? catalogBlende?.name : input.name),
    nameDe: catalogArticle?.nameDe
      || catalogService?.nameDe
      || (standaloneCatalogBlende ? catalogBlende?.nameDe : input.nameDe)
      || null,
    price: standaloneCatalogBlende
      ? String(catalogBlende.price)
      : applyBlendePriceDelta(input, existingItem, catalogBlende),
    articleBasePrice: undefined,
    catalogBlendeQuantity: catalogBlende
      ? standaloneCatalogBlende ? 1 : (input.catalogBlendeQuantity || 1)
      : null,
    blendeCode: standaloneCatalogBlende ? null : catalogBlende?.code || null,
    blendeLabel: standaloneCatalogBlende
      ? null
      : catalogBlende?.nameDe || catalogBlende?.name || null,
    blendePrice: standaloneCatalogBlende ? null : catalogBlende?.price || null,
    catalogArticleId: catalogArticle?.id || null,
    catalogServiceId: catalogService?.id || null,
    catalogLinkStatus: catalogArticle || catalogBlende || catalogService ? "MATCHED" : null,
  };

  if (data.itemType !== ItemType.COMPONENT) {
    return {
      ...data,
      componentKey: null,
    };
  }

  if (structureSlots.length) {
    if (!data.componentKey) {
      throw new Error("Choose a kitchen position for this component.");
    }

    const slot = findKitchenStructureSlot(kitchen.slug, data.componentKey);
    if (!slot) {
      throw new Error("Selected kitchen position is not valid for this kitchen.");
    }

    if (!isItemCompatibleWithSlot(data, slot)) {
      throw new Error(getCompatibilityMessage(data, slot) || "This component is not compatible with the selected slot.");
    }
  }

  if (data.componentKey) {
    const duplicate = await prisma.kitchenItem.findFirst({
      where: {
        kitchenId: kitchen.id,
        componentKey: data.componentKey,
        ...(excludeItemId ? { NOT: { id: excludeItemId } } : {}),
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (duplicate) {
      const slot = findKitchenStructureSlot(kitchen.slug, data.componentKey);
      throw new Error(
        `${slot?.label || data.componentKey} is already assigned to "${duplicate.name}". Edit that item instead or clear the slot first.`,
      );
    }
  }

  return data;
}
