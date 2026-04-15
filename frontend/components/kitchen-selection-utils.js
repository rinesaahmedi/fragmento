export function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function getSummaryPriceLabel(item) {
  const price = Number(item?.price || 0);
  if ((item?.isLocked || item?.isOrderLocked) && price <= 0) {
    return "Inklusive";
  }
  return formatCurrency(price);
}

export function getSummaryMetaLabel(item) {
  const price = Number(item?.price || 0);
  if (item?.isOrderLocked) {
    return "Bereits bestaetigt";
  }
  if (!item?.isLocked) {
    return "Ausgewaehlt";
  }
  if (price <= 0) {
    return "Im Grundmodell enthalten";
  }
  return "Standardausstattung";
}

export function normalizeColor(value) {
  if (!value) return "";
  const color = String(value).trim().toLowerCase();
  if (!color.startsWith("rgb")) return color;
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return color;
  const toHex = (channel) => `0${Number.parseInt(channel, 10).toString(16)}`.slice(-2);
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

export function componentIdForColor(colorKey) {
  return `component-${String(colorKey || "")
    .replace(/[^a-z0-9#-]/gi, "")
    .toLowerCase()}`;
}

export function componentIdForKey(componentKey) {
  return `component-${String(componentKey || "")
    .replace(/[^a-z0-9#-]/gi, "")
    .toLowerCase()}`;
}

export function componentIdForItem(item) {
  if (item?.componentKey) {
    return componentIdForKey(item.componentKey);
  }
  return componentIdForColor(normalizeColor(item?.colorKey));
}

export function selectedMap(items, codes) {
  return items.filter((item) => codes.includes(item.code));
}

const LINKED_COMPONENT_GROUPS_BY_SLUG = {
  "kitchen-model-b": [["component-wall-cabinet-4", "component-extractor-hood"]],
};

const PRODUCT_INFO_BY_CODE = {
  "DISH-600-STD": "/product-info/dishwasher-product-info.pdf",
  "REF-545-1800-700": "/product-info/fridge-product-info.pdf",
  "HOOD-600-FLAT": "/product-info/extractor-hood-flat-product-info.pdf",
  "WM-B-EWA34660W": "/product-info/washing-machine-product-info.pdf",
  "DISH-B-600-STD": "/product-info/dishwasher-product-info.pdf",
  "REF-B-545-1800-700": "/product-info/fridge-product-info.pdf",
  "HOOD-B-FH664621E": "/product-info/extractor-hood-flat-product-info.pdf",
  "REF-C-545-1800-700": "/product-info/fridge-product-info.pdf",
  "HOOD-C-FH664621E": "/product-info/extractor-hood-chimney-product-info.pdf",
  "WM-C-EWA34660W": "/product-info/washing-machine-product-info.pdf",
  "DISH-C-600-STD": "/product-info/dishwasher-product-info.pdf",
};

export function getLinkedComponentIds(slug, componentId) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const linkedGroups = LINKED_COMPONENT_GROUPS_BY_SLUG[normalizedSlug] || [];
  const linkedGroup = linkedGroups.find((group) => group.includes(componentId));
  return linkedGroup || [componentId];
}

export function isHiddenLinkedComponent(slug, componentId) {
  const linkedIds = getLinkedComponentIds(slug, componentId);
  return linkedIds.length > 1 && linkedIds[0] !== componentId;
}

export function isLinkedComponentSelected(slug, selectedIds, componentId) {
  return getLinkedComponentIds(slug, componentId).every((id) => selectedIds.includes(id));
}

export function toggleLinkedComponentSelection(slug, currentIds, componentId, lockedIds = []) {
  const linkedIds = getLinkedComponentIds(slug, componentId);
  const currentSet = new Set(currentIds);
  const lockedSet = new Set(lockedIds);
  const shouldRemove = linkedIds.every((id) => currentSet.has(id));

  linkedIds.forEach((id) => {
    if (lockedSet.has(id)) return;
    if (shouldRemove) {
      currentSet.delete(id);
    } else {
      currentSet.add(id);
    }
  });

  return [...currentSet];
}

function getCatalogLinkedItems(allItems, slug, item) {
  const componentId = componentIdForItem(item);
  const linkedIds = getLinkedComponentIds(slug, componentId);
  if (linkedIds.length <= 1) return [item];

  const linkedItems = linkedIds
    .map((linkedId) => allItems.find((candidate) => componentIdForItem(candidate) === linkedId))
    .filter(Boolean);

  return linkedItems.length ? linkedItems : [item];
}

export function getCatalogDisplayItem(allItems, slug, item) {
  const linkedItems = getCatalogLinkedItems(allItems, slug, item);
  if (linkedItems.length <= 1) {
    return {
      item,
      price: Number(item.price || 0),
      infoPdfHref: PRODUCT_INFO_BY_CODE[item.code] || "",
    };
  }

  const hoodItem =
    linkedItems.find((entry) => String(entry.componentKey || "").toLowerCase() === "extractor-hood") || null;
  const primaryItem = linkedItems[0];

  return {
    item: {
      ...primaryItem,
      name: hoodItem ? `${primaryItem.name} + ${hoodItem.name}` : primaryItem.name,
      infoText: hoodItem
        ? `${primaryItem.infoText || ""}${primaryItem.infoText ? " • " : ""}${hoodItem.infoText || ""}`.trim()
        : primaryItem.infoText,
      iconKey: hoodItem?.iconKey || primaryItem.iconKey,
    },
    price: Number((hoodItem || primaryItem).price || 0),
    infoPdfHref:
      (hoodItem && PRODUCT_INFO_BY_CODE[hoodItem.code]) ||
      PRODUCT_INFO_BY_CODE[primaryItem.code] ||
      "",
  };
}
