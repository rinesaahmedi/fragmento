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

export function getLocalizedItemName(item, translate) {
  const code = String(item?.code || "").trim().toUpperCase();
  const rawName = String(item?.name || "").trim();
  const rawDimensions = rawName.match(/\((\d+(?:[.,]\d+)?\s*(?:x|×)\s*\d+(?:[.,]\d+)?(?:\s*(?:x|×)\s*\d+(?:[.,]\d+)?)?\s*(?:mm|cm|m))\)/i)?.[1] || "";
  const withRawDimensions = (label) => rawDimensions ? `${label} (${rawDimensions})` : label;

  if (rawName === "Sink and Worktop") {
    return translate("configurator.catalogItemNames.sinkAndWorktop", "Sink and Worktop");
  }

  switch (code) {
    case "OVEN-B-600-HOB":
    case "OVEN-C-600-HOB":
      return withRawDimensions(translate("configurator.itemNameOvenHob", "Built-in Oven and Hob"));
    case "CAB-WALL-B-L-600":
      return withRawDimensions(translate("configurator.catalogItemNames.wallCabinetLeft", "Wall Cabinet left"));
    case "CAB-WALL-B-ML-600":
      return withRawDimensions(translate("configurator.catalogItemNames.wallCabinetMidLeft", "Wall Cabinet mid-left"));
    case "CAB-WALL-B-MR-600":
      return withRawDimensions(rawName.includes("+")
        ? translate("configurator.catalogItemNames.wallCabinetMidRightExtractorHood", "Wall Cabinet mid-right + Extractor Hood")
        : translate("configurator.catalogItemNames.wallCabinetMidRight", "Wall Cabinet mid-right"));
    case "CAB-WALL-B-R-600":
      return withRawDimensions(translate("configurator.catalogItemNames.wallCabinetRight", "Wall Cabinet right"));
    case "CAB-HOOD-B-600":
      return withRawDimensions(translate("configurator.catalogItemNames.hoodWallCabinet", "Hood Wall Cabinet"));
    case "CAB-WALL-C-L-600":
      return withRawDimensions(translate("configurator.catalogItemNames.wallCabinetLeft", "Wall Cabinet left"));
    case "CAB-WALL-C-ML-600":
      return withRawDimensions(translate("configurator.catalogItemNames.wallCabinetMidLeft", "Wall Cabinet mid-left"));
    case "CAB-WALL-C-MR-600":
      return withRawDimensions(translate("configurator.catalogItemNames.wallCabinetMidRight", "Wall Cabinet mid-right"));
    case "CAB-WALL-C-R-600":
      return withRawDimensions(translate("configurator.catalogItemNames.wallCabinetRight", "Wall Cabinet right"));
    case "HOOD-B-FH664621E":
      return translate("configurator.catalogItemNames.extractorHood", "Extractor Hood");
    case "HOOD-C-FH664621E":
      return translate("configurator.catalogItemNames.chimneyExtractorHood", "Chimney Extractor Hood");
    case "LIGHT-B-LED-001":
    case "LIGHT-C-LED-001":
      return translate("configurator.catalogItemNames.ledLightingSet", "LED Lighting Set");
    case "WM-B-EWA34660W":
    case "WM-C-EWA34660W":
      return withRawDimensions(translate("configurator.catalogItemNames.washingMachine", "Washing Machine"));
    case "SINKBASE-B-600":
    case "SINKBASE-C-600":
      return withRawDimensions(translate("configurator.catalogItemNames.sinkBaseCabinet", "Sink Base Cabinet"));
    case "DISH-B-600-STD":
    case "DISH-C-600-STD":
    case "DISH-600-STD":
      return withRawDimensions(translate("configurator.catalogItemNames.dishwasher", "Dishwasher"));
    case "TOP-B-3036":
    case "TOP-C-4000":
      return withRawDimensions(translate("configurator.catalogItemNames.worktop", "Worktop"));
    case "CAB-BASE-B-STR":
      return withRawDimensions(translate("configurator.catalogItemNames.baseStorageCabinet", "Base Storage Cabinet"));
    case "REF-B-545-1800-700":
    case "REF-C-545-1800-700":
    case "REF-545-1800-700":
      return withRawDimensions(translate("configurator.catalogItemNames.refrigerator", "Refrigerator"));
    case "SINK-B-BOTTON-45":
    case "SINK-C-BOTTON-45":
      return translate("configurator.catalogItemNames.sinkAndWasteSystem", "Sink and Waste System");
    case "ACC-CUTLERY-ZB60SG":
      return translate("configurator.catalogItemNames.cutleryInsert60", "Cutlery insert ZB60SG");
    case "CAB-COOK-C-L-600":
      return withRawDimensions(translate("configurator.catalogItemNames.baseCabinetTwoDrawersLeft", "Base Cabinet (2 Drawers) Left"));
    case "CAB-COOK-C-R-600":
      return withRawDimensions(translate("configurator.catalogItemNames.baseCabinetTwoDrawersRight", "Base Cabinet (2 Drawers) Right"));
    case "CAB-DRAWER-C-3D":
      return withRawDimensions(translate("configurator.catalogItemNames.baseCabinetThreeDrawers", "Base Cabinet (3 Drawers)"));
    default:
      return rawName;
  }
}

export function getLocalizedItemInfoText(item, translate) {
  const code = String(item?.code || "").trim().toUpperCase();

  switch (code) {
    case "CAB-WALL-B-L-600":
    case "CAB-WALL-B-ML-600":
    case "CAB-WALL-B-MR-600":
    case "CAB-WALL-B-R-600":
    case "CAB-WALL-C-L-600":
    case "CAB-WALL-C-ML-600":
    case "CAB-WALL-C-MR-600":
    case "CAB-WALL-C-R-600":
      return translate("configurator.catalogItemInfo.adjustableShelves", "H6002, 2 adjustable shelves");
    case "CAB-HOOD-B-600":
      return translate("configurator.catalogItemInfo.lightHoodSetup", "HD6002, light hood setup");
    case "HOOD-B-FH664621E":
      return translate("configurator.catalogItemInfo.flatPullOutHood", "Flat pull-out hood, 60 cm");
    case "HOOD-C-FH664621E":
      return translate("configurator.catalogItemInfo.chimneyHood", "Chimney hood, 60 cm");
    case "LIGHT-B-LED-001":
    case "LIGHT-C-LED-001":
      return translate("configurator.catalogItemInfo.ledLightingSet", "LED lighting set");
    case "WM-B-EWA34660W":
    case "WM-C-EWA34660W":
      return translate("configurator.catalogItemInfo.washingMachine", "Washing machine, 8 kg, 1400 rpm");
    case "SINKBASE-B-600":
    case "SINKBASE-C-600":
      return translate("configurator.catalogItemInfo.bottonWasteSystem", "Blanco Botton Pro 45/2 waste system");
    case "DISH-B-600-STD":
    case "DISH-C-600-STD":
      return translate("configurator.catalogItemInfo.integratedDishwasher", "Fully integrated dishwasher, 60 cm");
    case "TOP-B-3036":
    case "TOP-C-4000":
      return translate("configurator.catalogItemInfo.concreteSlateGray", "PLS, concrete slate gray");
    case "OVEN-B-600-HOB":
    case "OVEN-C-600-HOB":
      return translate("configurator.catalogItemInfo.ovenInductionHob", "Built-in oven + induction hob");
    case "CAB-BASE-B-STR":
      return translate("configurator.catalogItemInfo.strBaseStorageCabinet", "STR base storage cabinet");
    case "REF-B-545-1800-700":
    case "REF-C-545-1800-700":
      return translate("configurator.catalogItemInfo.fridgeFreezerNoFrost", "Fridge-freezer, 180 cm, NoFrost");
    case "SINK-B-BOTTON-45":
    case "SINK-C-BOTTON-45":
      return translate("configurator.catalogItemInfo.manualWasteSystem", "Blanco Botton Pro 45/2 manual waste system");
    case "ACC-CUTLERY-ZB60SG":
      return translate("configurator.catalogItemInfo.cutleryInsert60", "Cutlery insert for 60 cm cabinet");
    default:
      return item?.infoText || "";
  }
}

const LINKED_COMPONENT_GROUPS_BY_SLUG = {
  "kitchen-model-b": [["component-wall-cabinet-4", "component-extractor-hood"]],
};

const PRODUCT_INFO_DOCUMENTS_BY_CODE = {
  "DISH-B-600-STD": [
    { label: "E-Label PDF", href: "/product-info/A-EGSPV597210_Elabel_Eco21_2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/A-EGSPV597210_Produktinformation_Eco21.pdf" },
  ],
  "DISH-C-600-STD": [
    { label: "E-Label PDF", href: "/product-info/A-EGSPV597210_Elabel_Eco21_2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/A-EGSPV597210_Produktinformation_Eco21.pdf" },
  ],
  "REF-B-545-1800-700": [
    { label: "E-Label PDF", href: "/product-info/KGC_15495_S_Elabel_Eco21_2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/KGC_15495_S_Produktinformation_Eco21.pdf" },
  ],
  "REF-C-545-1800-700": [
    { label: "E-Label PDF", href: "/product-info/KGC_15495_S_Elabel_Eco21_2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/KGC_15495_S_Produktinformation_Eco21.pdf" },
  ],
  "HOOD-B-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/FH_664_621_S_ELabel_Eco21_2512.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/FH_664_621_S_Produktinformation.pdf" },
  ],
  "HOOD-C-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/KHF_664_611_S_ELabel_Eco21_2407.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/khf664611s-chimney-extractor-hood-product-info.pdf" },
  ],
  "WM-B-EWA34660W": [
    { label: "E-Label PDF", href: "/product-info/EWA_34660_W_ELabel_Eco21_2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/ewa34660w-washing-machine-product-info.pdf" },
  ],
  "WM-C-EWA34660W": [
    { label: "E-Label PDF", href: "/product-info/EWA_34660_W_ELabel_Eco21_2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/ewa34660w-washing-machine-product-info.pdf" },
  ],
  "OVEN-B-600-HOB": [
    { label: "Backofen E-Label", href: "/product-info/EBX_943_600_S_ELabel_1901.pdf" },
    { label: "Backofen PDF", href: "/product-info/EBX_943_600_S_Produktinformation.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/OL-KMI_754_000_E_Produktinformation.pdf" },
  ],
  "OVEN-C-600-HOB": [
    { label: "Backofen E-Label", href: "/product-info/EBX_943_600_S_ELabel_1901.pdf" },
    { label: "Backofen PDF", href: "/product-info/EBX_943_600_S_Produktinformation.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/OL-KMI_754_000_E_Produktinformation.pdf" },
  ],
};

const PRODUCT_INFO_DISPLAY_OVERRIDES_BY_CODE = {
  "WM-B-EWA34660W": {
    infoText: "Washing machine, 8 kg, 1400 rpm",
    productInfoSummary:
      "Freestanding washing machine EWA34660W for the kitchen configuration. The current product information lists 8 kg capacity and 1400 rpm spin speed.",
    productInfoKeyFacts: [
      "Capacity: 8 kg",
      "Spin speed: 1400 rpm",
      "Model: EWA34660W",
      "Freestanding appliance",
      "Check water and power connection requirements",
    ],
  },
  "WM-C-EWA34660W": {
    infoText: "Washing machine, 8 kg, 1400 rpm",
    productInfoSummary:
      "Freestanding washing machine EWA34660W for the kitchen configuration. The current product information lists 8 kg capacity and 1400 rpm spin speed.",
    productInfoKeyFacts: [
      "Capacity: 8 kg",
      "Spin speed: 1400 rpm",
      "Model: EWA34660W",
      "Freestanding appliance",
      "Check water and power connection requirements",
    ],
  },
};

function applyProductInfoDisplayOverrides(item) {
  if (!item) return item;

  const override = PRODUCT_INFO_DISPLAY_OVERRIDES_BY_CODE[item.code];
  if (!override) return item;

  return {
    ...item,
    ...override,
  };
}

export function getProductInfoHref(item) {
  return item?.productInfoPdfPath || "";
}

export function getProductInfoDocuments(item) {
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
  const linkedItems = getCatalogLinkedItems(allItems, slug, item).map(applyProductInfoDisplayOverrides);
  const displayItem = applyProductInfoDisplayOverrides(item);

  if (linkedItems.length <= 1) {
    return {
      item: {
        ...displayItem,
        productInfoItemId: displayItem.id,
        productAssistantName: displayItem.name || "",
        productInfoKeyFacts: Array.isArray(displayItem.productInfoKeyFacts) ? displayItem.productInfoKeyFacts : [],
        productInfoDocuments: getProductInfoDocuments(displayItem),
      },
      price: Number(displayItem.price || 0),
      infoPdfHref: getProductInfoHref(displayItem),
    };
  }

  const hoodItem =
    linkedItems.find((entry) => String(entry.componentKey || "").toLowerCase() === "extractor-hood") || null;
  const primaryItem = linkedItems[0];
  const infoSource = hoodItem?.productInfoPdfPath ? hoodItem : primaryItem;
  const assistantHoverExtractorHoodOnly = Boolean(hoodItem && infoSource === hoodItem);

  return {
    item: {
      ...primaryItem,
      name: hoodItem
        ? normalizedSlug === "kitchen-model-b"
          ? `${primaryItem.name} + Extractor Hood`
          : `${primaryItem.name} + ${hoodItem.name}`
        : primaryItem.name,
      linkedInfoBadge: hoodItem ? "Includes extractor hood" : "",
      productAssistantName: infoSource?.name || primaryItem.name || "",
      infoText: hoodItem
        ? `${primaryItem.infoText || ""}${primaryItem.infoText ? " • " : ""}${hoodItem.infoText || ""}`.trim()
        : primaryItem.infoText,
      iconKey: hoodItem?.iconKey || primaryItem.iconKey,
      productInfoPdfPath: infoSource?.productInfoPdfPath || "",
      productInfoSummary: infoSource?.productInfoSummary || "",
      productInfoKeyFacts: Array.isArray(infoSource?.productInfoKeyFacts) ? infoSource.productInfoKeyFacts : [],
      productInfoExtractedText: infoSource?.productInfoExtractedText || "",
      productInfoUpdatedAt: infoSource?.productInfoUpdatedAt || "",
      productInfoCode: infoSource?.code || primaryItem.code,
      productInfoItemId: infoSource?.id || primaryItem.id,
      productInfoDocuments: getProductInfoDocuments(infoSource || primaryItem),
      tooltipPreviewCode: infoSource?.code || primaryItem.code,
      assistantHoverExtractorHoodOnly,
    },
    price: Number((hoodItem || primaryItem).price || 0),
    infoPdfHref: getProductInfoHref(hoodItem) || getProductInfoHref(primaryItem),
  };
}

export function hasAssistantProductInfo(item) {
  const itemId = item?.productInfoItemId || item?.id;
  return Boolean(itemId && (item?.productInfoExtractedText || item?.productInfoSummary || item?.productInfoPdfPath));
}
