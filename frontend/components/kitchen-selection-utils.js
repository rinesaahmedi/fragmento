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

const PRODUCT_INFO_DOCUMENTS_BY_CODE = {
  "DISH-B-600-STD": [
    { label: "E-Label PDF", href: "/product-info/A-EGSPV597210_Elabel_Eco21_2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/AMICA_A-EGSPV597210_Produktinformation_Eco21.pdf" },
  ],
  "DISH-C-600-STD": [
    { label: "E-Label PDF", href: "/product-info/A-EGSPV597210_Elabel_Eco21_2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/AMICA_A-EGSPV597210_Produktinformation_Eco21.pdf" },
  ],
  "REF-B-545-1800-700": [
    { label: "E-Label PDF", href: "/product-info/KGC_15495_S_Elabel_Eco21_2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/AMICA_KGC_15495_S_Produktinformation_Eco21.pdf" },
  ],
  "REF-C-545-1800-700": [
    { label: "E-Label PDF", href: "/product-info/KGC_15495_S_Elabel_Eco21_2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/AMICA_KGC_15495_S_Produktinformation_Eco21.pdf" },
  ],
  "HOOD-B-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/FH_664_621_S_ELabel_Eco21_2512.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/AMICA_FH_664_621_S_Produktinformation.pdf" },
  ],
  "HOOD-C-FH664621E": [
    { label: "Produktinfo PDF", href: "/product-info/extractor-hood-chimney-product-info.pdf" },
  ],
  "OVEN-B-600-HOB": [
    { label: "Backofen E-Label", href: "/product-info/EBX_943_600_S_ELabel_1901.pdf" },
    { label: "Backofen PDF", href: "/product-info/AMICA_EBX_943_600_S_Produktinformation.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/AMICA_OL-KMI_754_000_E_Produktinformation.pdf" },
  ],
  "OVEN-C-600-HOB": [
    { label: "Backofen E-Label", href: "/product-info/EBX_943_600_S_ELabel_1901.pdf" },
    { label: "Backofen PDF", href: "/product-info/AMICA_EBX_943_600_S_Produktinformation.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/AMICA_OL-KMI_754_000_E_Produktinformation.pdf" },
  ],
};

export function getProductInfoHref(item) {
  return item?.productInfoPdfPath || "";
}

function getProductInfoDocuments(item) {
  const mappedDocuments = PRODUCT_INFO_DOCUMENTS_BY_CODE[item?.code];
  if (Array.isArray(mappedDocuments) && mappedDocuments.length) {
    return mappedDocuments;
  }

  const href = getProductInfoHref(item);
  if (!href) return [];

  return [{ label: "Produktinfo PDF", href }];
}

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
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const linkedItems = getCatalogLinkedItems(allItems, slug, item);
  if (linkedItems.length <= 1) {
    return {
      item: {
        ...item,
        productInfoItemId: item.id,
        productInfoKeyFacts: Array.isArray(item.productInfoKeyFacts) ? item.productInfoKeyFacts : [],
        productInfoDocuments: getProductInfoDocuments(item),
      },
      price: Number(item.price || 0),
      infoPdfHref: getProductInfoHref(item),
    };
  }

  const hoodItem =
    linkedItems.find((entry) => String(entry.componentKey || "").toLowerCase() === "extractor-hood") || null;
  const primaryItem = linkedItems[0];
  const infoSource = hoodItem?.productInfoPdfPath ? hoodItem : primaryItem;

  return {
    item: {
      ...primaryItem,
      name: hoodItem
        ? normalizedSlug === "kitchen-model-b"
          ? `${primaryItem.name} + Extractor Hood`
          : `${primaryItem.name} + ${hoodItem.name}`
        : primaryItem.name,
      linkedInfoBadge: hoodItem ? "Includes extractor hood" : "",
      infoText: hoodItem
        ? `${primaryItem.infoText || ""}${primaryItem.infoText ? " • " : ""}${hoodItem.infoText || ""}`.trim()
        : primaryItem.infoText,
      iconKey: hoodItem?.iconKey || primaryItem.iconKey,
      productInfoPdfPath: infoSource?.productInfoPdfPath || "",
      productInfoSummary: infoSource?.productInfoSummary || "",
      productInfoKeyFacts: Array.isArray(infoSource?.productInfoKeyFacts) ? infoSource.productInfoKeyFacts : [],
      productInfoExtractedText: infoSource?.productInfoExtractedText || "",
      productInfoUpdatedAt: infoSource?.productInfoUpdatedAt || "",
      productInfoItemId: infoSource?.id || primaryItem.id,
      productInfoDocuments: getProductInfoDocuments(infoSource || primaryItem),
      tooltipPreviewCode: infoSource?.code || primaryItem.code,
    },
    price: Number((hoodItem || primaryItem).price || 0),
    infoPdfHref: getProductInfoHref(hoodItem) || getProductInfoHref(primaryItem),
  };
}
