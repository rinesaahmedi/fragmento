import { getCabinetWidthDisplayName } from "../lib/cabinet-name-utils.js";

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
  return "Basisausstattung";
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

export function getStructuredDimensions(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const name = String(item?.name || "").trim().toLowerCase();
  if (code.startsWith("DISH-") || iconKey === "dishwasher_base" || name.includes("dishwasher")) {
    return "";
  }

  const values = [item?.widthMm, item?.heightMm, item?.depthMm].filter(
    (value) => value !== null && value !== undefined && value !== "",
  );
  if (!values.length) return "";
  if (item?.componentKey === "refrigerator") {
    return `${values.map((value) => Number(value) / 10).join(" x ")} cm`;
  }
  return `${values.join(" x ")} mm`;
}

export function splitCatalogItemNameAndDimensions(name) {
  const normalizedName = String(name || "").trim();
  const dimensionValue = "(?:-|\\d+(?:[.,]\\d+)?)";
  const dimensionsMatch = normalizedName.match(
    new RegExp(
      `\\s*\\(\\s*(${dimensionValue}\\s*(?:x|\\u00d7)\\s*${dimensionValue}(?:\\s*(?:x|\\u00d7)\\s*${dimensionValue})?\\s*(?:mm|cm|m))\\s*\\)`,
      "i",
    ),
  );

  if (!dimensionsMatch) {
    return { title: normalizedName, dimensions: "" };
  }

  return {
    title: normalizedName.replace(dimensionsMatch[0], "").replace(/\s+/g, " ").trim(),
    dimensions: dimensionsMatch[1].replace(/\s*(?:x|\u00d7)\s*/gi, " x ").trim(),
  };
}

export function getCatalogItemDetails(item) {
  return {
    articleNumber: String(item?.articleNumber || "").trim(),
    dimensions: getStructuredDimensions(item),
  };
}

// Element names must never carry dimensions (they are shown separately under the article as a
// W x H x D line). Strip every common dimension format: parenthesised "(600 x 720 x 340 mm)",
// bare "600 x 720 x 340 mm" / "600/600 mm", and a trailing single measure "178 cm" / "600 mm".
function stripDimensionsFromName(name) {
  const sep = "(?:x|\\u00d7|\\u00f7|/)";
  const num = "[-\\d.,]+";
  const unit = "(?:mm|cm|m)";
  return String(name || "")
    .replace(new RegExp(`\\s*\\(\\s*${num}(?:\\s*${sep}\\s*${num})*\\s*${unit}\\s*\\)`, "gi"), "")
    .replace(new RegExp(`\\s*${num}(?:\\s*${sep}\\s*${num})+\\s*${unit}\\b`, "gi"), "")
    .replace(new RegExp(`\\s+${num}\\s*${unit}\\b`, "gi"), "")
    .replace(/\s+/g, " ")
    .trim();
}

// Plan callout numbers, keyed by item code. Reused codes keep their original numbers;
// kitchen-specific codes are minted when an otherwise identical item appears under a
// different callout number.
const AB_105806_PHOTO_NUMBER_BY_CODE = {
  "OVEN-B-600-HOB": "1",
  "OVEN-AB105806-600-HOB": "1",
  "TOP-AB105806": "2",
  "SINKBASE-B-600": "3",
  "SINKBASE-AB105806-600": "3",
  "REF-AB105806-KGCN388140E": "4",
  "CAB-BASE-AB105806-400-L": "5",
  "CAB-BASE-AB105806-400-R": "6",
  "DISH-AB105806-600": "7",
  "CAB-BASE-AB105806-US60": "8",
  "CAB-WALL-AB105806-400-L": "9",
  "CAB-HOOD-AB105806-600": "10",
  "CAB-WALL-AB105806-400-R": "11",
  "CAB-WALL-AB105806-1": "12",
  "CAB-WALL-AB105806-2": "13",
  "CAB-WALL-AB105806-3": "14",
  "CAB-BASE-AB105820-US30-300": "5",
  "CAB-BASE-AB105820-US60": "6",
  "CAB-WALL-AB105820-H3002-300": "9",
  "CAB-WALL-AB105820-H6002": "11",
  "CAB-WALL-AB105816-H6002-L": "11",
  "CAB-BASE-AB105819-US60-R": "4",
  "DISH-AB105819-600": "5",
  "REF-AB105819-KGCN388140E": "6",
  "CAB-WALL-AB105819-H6002-R": "7",
  "CAB-WALL-AB105819-H6002-L1": "8",
  "CAB-WALL-AB105819-H6002-L2": "9",
  "CAB-BASE-AB105841-US60-1": "4",
  "CAB-BASE-AB105841-US60-2": "5",
  "DISH-AB105841-600": "6",
  "CAB-BASE-AB105841-US60-3": "7",
  "REF-AB105841-KGCN388140E": "8",
  "CAB-WALL-AB105841-H6002-1": "9",
  "CAB-WALL-AB105841-H6002-2": "11",
  "CAB-BASE-AB105811-US60": "4",
  "DISH-AB105811-600": "5",
  "REF-AB105811-KGCN388140E": "6",
  "CAB-WALL-AB105811-1": "7",
  "CAB-WALL-AB105811-2": "8",
  "CAB-WALL-AB105811-3": "9",
  "CAB-BASE-AB105815-US60": "4",
  "DISH-AB105815-600": "5",
  "REF-AB105815-KGCN388140E": "6",
  "CAB-WALL-AB105815-1": "7",
  "CAB-WALL-AB105815-2": "8",
  "CAB-WALL-AB105815-3": "9",
  "CAB-BASE-AB105810-US45": "5",
  "CAB-BASE-AB105810-FILLER-400": "6",
  "CAB-WALL-AB105810-H4502": "9",
  "CAB-WALL-AB105810-FILLER-400": "11",
  "CAB-BASE-AB105821-FILLER-500": "4",
  "DISH-AB105821-600": "5",
  "CAB-BASE-AB105821-US30": "6",
  "CAB-WALL-AB105821-FILLER-500": "7",
  "CAB-WALL-AB105821-H6002-R": "8",
  "CAB-WALL-AB105821-H6002-L": "9",
  "CAB-WALL-AB105821-H3002": "11",
  "REF-AB105821-KGCN388140E": "12",
  "CAB-BASE-AB105822-FILLER-500": "5",
  "CAB-BASE-AB105822-US60": "6",
  "DISH-AB105822-600": "7",
  "CAB-WALL-AB105822-FILLER-500": "8",
  "CAB-WALL-AB105822-H6002-1": "10",
  "CAB-WALL-AB105822-H6002-2": "11",
  "CAB-WALL-AB105822-H6002-3": "12",
  "CAB-BASE-AB105833-FILLER-500-R": "7",
  "DISH-AB105833-600": "8",
  "CAB-WALL-AB105833-FILLER-500-L": "9",
  "CAB-WALL-AB105833-H6002-L1": "11",
  "CAB-WALL-AB105833-FILLER-500-R": "12",
  "CAB-WALL-AB105833-H6002-L2": "13",
  "CAB-WALL-AB105833-H6002-L3": "14",
  "CAB-BASE-AB105826-US60-R": "5",
  "CAB-BASE-AB105826-US60-L": "6",
  "CAB-WALL-AB105826-H6002-R": "8",
  "CAB-WALL-AB105826-H6002-L1": "10",
  "CAB-WALL-AB105826-H6002-L2": "11",
  "CAB-WALL-AB105826-H6002-L3": "12",
  "CAB-BASE-AB105827-FILLER-500": "4",
  "DISH-AB105827-600": "5",
  "CAB-BASE-AB105827-US30": "6",
  "CAB-WALL-AB105827-FILLER-500": "7",
  "CAB-BASE-AB105835-US60-R": "4",
  "CAB-BASE-AB105835-US60-L1": "5",
  "CAB-BASE-AB105835-US60-L2": "7",
  "CAB-WALL-AB105835-H6002-R": "9",
  "CAB-WALL-AB105835-H6002-L": "11",
  "CAB-WALL-AB105835-H6002-R2": "12",
  "CAB-WALL-AB105835-H6002-R3": "13",
  "CAB-WALL-AB105835-H6002-L2": "14",
  "CAB-BASE-AB105836-US60-R": "5",
  "CAB-BASE-AB105836-US60-L": "6",
  "CAB-BASE-AB105836-FILLER-500": "7",
  "DISH-AB105836-600": "8",
  "CAB-WALL-AB105836-H6002-R": "9",
  "CAB-WALL-AB105836-H6002-L1": "11",
  "CAB-WALL-AB105836-FILLER-500": "12",
  "CAB-WALL-AB105836-H6002-L2": "13",
  "CAB-WALL-AB105836-H6002-L3": "14",
  "CAB-BASE-AB105842-US60-R": "5",
  "CAB-BASE-AB105842-US60-L": "6",
  "CAB-BASE-AB105842-FILLER-500": "7",
  "DISH-AB105842-600": "8",
  "CAB-WALL-AB105842-H6002-R": "9",
  "CAB-WALL-AB105842-H6002-L1": "11",
  "CAB-WALL-AB105842-FILLER-500": "12",
  "CAB-WALL-AB105842-H6002-L2": "13",
  "CAB-WALL-AB105842-H6002-L3": "14",
  "WM-AB105845-EWA34660W": "4",
  "DISH-AB105845-600": "5",
  "CAB-BASE-AB105845-US2A60": "6",
  "CAB-WALL-AB105845-US60-1": "7",
  "CAB-WALL-AB105845-US60-2": "8",
  "CAB-WALL-AB105845-US60-3": "9",
  "CAB-WALL-AB105845-US60-4": "10",
  "LIGHT-AB105845-LED": "11",
  "REF-AB105845-KGCN388140E": "4",
  "CAB-COOK-AB105845-US60-L": "5",
  "CAB-COOK-AB105845-US60-R": "6",
  "HOOD-AB105845-KHF664611S": "7",
  "CAB-BASE-AB105809-400-R": "5",
  "CAB-BASE-AB105809-500-L": "6",
  "SINKBASE-B-600": "8",
  "SINKBASE-AB105809-US30": "8",
  "CAB-WALL-AB105809-FILLER": "9",
  "CAB-WALL-AB105809-500-L": "11",
  "CAB-WALL-AB105809-H6002-L": "12",
  "SINKBASE-AB105805-US30-L": "8",
  "CAB-WALL-AB105805-400-R": "9",
  "CAB-BASE-AB105834-500-R": "5",
  "CAB-BASE-AB105834-500-R2": "6",
  "DISH-AB105834-600": "7",
  "CAB-WALL-AB105834-500-R": "8",
  "CAB-WALL-AB105834-H6002-L": "10",
  "CAB-BASE-AB105837-US60-R": "5",
  "CAB-BASE-AB105837-500-R": "6",
  "DISH-AB105837-600": "7",
  "CAB-WALL-AB105837-US60-R": "8",
  "CAB-HOOD-AB105837-600": "9",
  "CAB-WALL-AB105837-US60-L": "10",
  "SINKBASE-AB105831-DEFAULT": "3",
  "CAB-BASE-AB105831-US30-R": "4",
  "DISH-AB105831-600": "5",
  "CAB-BASE-AB105831-US60-L": "6",
  "CAB-BASE-AB105831-500-L": "7",
  "CAB-BASE-AB105831-US30-L": "8",
  "REF-AB105831-KGCN388140E": "9",
  "CAB-WALL-AB105831-H6002-R": "10",
  "CAB-HOOD-AB105831-600": "11",
  "CAB-WALL-AB105831-500-L": "12",
  "CAB-WALL-AB105831-H3002-L": "13",
  "SINKBASE-AB105825-600": "3",
  "CAB-BASE-AB105825-US30-R": "4",
  "DISH-AB105825-600": "5",
  "CAB-BASE-AB105825-US60-R": "6",
  "CAB-BASE-AB105825-US60-L": "7",
  "CAB-BASE-AB105825-US30-L": "8",
  "REF-AB105825-KGCN388140E": "9",
  "CAB-WALL-AB105825-H6002-R": "10",
  "CAB-HOOD-AB105825-600": "11",
  "CAB-WALL-AB105825-H6002-L": "12",
  "CAB-WALL-AB105825-H3002-L": "13",
  "CAB-BASE-AB105822-US30-R": "4",
  "DISH-AB105822-600": "5",
  "CAB-BASE-AB105822-US60-R": "6",
  "CAB-BASE-AB105822-US60-L": "7",
  "CAB-BASE-AB105822-US30-L": "8",
  "REF-AB105822-KGCN388140E": "9",
  "CAB-WALL-AB105822-H6002-R": "10",
  "CAB-HOOD-AB105822-600": "11",
  "CAB-WALL-AB105822-H6002-L": "12",
  "CAB-WALL-AB105822-H3002-L": "13",
  "CAB-BASE-AB105828-US30-R": "4",
  "DISH-AB105828-600": "5",
  "CAB-BASE-AB105828-US60-R": "6",
  "CAB-BASE-AB105828-US60-L": "7",
  "CAB-BASE-AB105828-US30-L": "8",
  "REF-AB105828-KGCN388140E": "9",
  "CAB-WALL-AB105828-H6002-R": "10",
  "CAB-HOOD-AB105828-600": "11",
  "CAB-WALL-AB105828-H6002-L": "12",
  "CAB-WALL-AB105828-H3002-L": "13",
};

["105840", "105843"].forEach((targetCode) => {
  [
    "CAB-BASE-AB105837-US60-R",
    "CAB-BASE-AB105837-500-R",
    "DISH-AB105837-600",
    "CAB-WALL-AB105837-US60-R",
    "CAB-HOOD-AB105837-600",
    "CAB-WALL-AB105837-US60-L",
  ].forEach((sourceCode) => {
    AB_105806_PHOTO_NUMBER_BY_CODE[sourceCode.replace("AB105837", `AB${targetCode}`)] =
      AB_105806_PHOTO_NUMBER_BY_CODE[sourceCode];
  });
});

export function getLocalizedItemName(item, translate, language = "en", includeCalloutNumber = true) {
  const code = String(item?.code || "").trim().toUpperCase();
  const rawName = String(language === "de" && item?.nameDe ? item.nameDe : item?.name || "").trim();
  const rawDimensions = rawName.match(/\((\d+(?:[.,]\d+)?\s*(?:x|×)\s*\d+(?:[.,]\d+)?(?:\s*(?:x|×)\s*\d+(?:[.,]\d+)?)?\s*(?:mm|cm|m))\)/i)?.[1] || "";
  const rawTitle = stripDimensionsFromName(rawName);
  const photoNumber = AB_105806_PHOTO_NUMBER_BY_CODE[code] || "";
  const withPhotoNumber = (label) => (
    includeCalloutNumber && photoNumber ? `${photoNumber}. ${label}` : label
  );
  const withDimensions = (label) => {
    return withPhotoNumber(stripDimensionsFromName(label));
  };
  const withRefrigeratorHeight = (label) => {
    return withPhotoNumber(label);
  };
  const dishwasherName = () => translate(
    "configurator.catalogItemNames.dishwasher",
    language === "de" ? "Vollintegrierter Geschirrspüler" : "Fully integrated dishwasher",
  );

  if (rawName === "Sink and Worktop" || rawName === "Spüle und Arbeitsplatte") {
    return translate("configurator.catalogItemNames.worktop", "Worktop");
  }

  // General appliance naming across every kitchen: any dishwasher/refrigerator (identified by
  // its icon) shows a single short name instead of the longer per-kitchen product description.
  const iconKey = String(item?.iconKey || "").trim();
  if (iconKey === "dishwasher_base") {
    return withDimensions(dishwasherName());
  }
  if (iconKey === "tall_refrigerator") {
    return withRefrigeratorHeight(translate("configurator.catalogItemNames.refrigerator", "Freestanding refrigerator 178cm"));
  }
  if (code.startsWith("SINKBASE-") || code === "T3D-SINKBASE-001") {
    return withDimensions(translate("configurator.catalogItemNames.sinkBaseCabinet", "Sink Lower Cabinet"));
  }

  const cabinetWidthName = getCabinetWidthDisplayName({
    ...item,
    name: rawName,
  }, language);
  if (cabinetWidthName) {
    return withPhotoNumber(cabinetWidthName);
  }

  const normalizedRawTitle = rawTitle.toLowerCase();
  if (normalizedRawTitle === "base cabinet with drawer") {
    return withDimensions(translate("configurator.catalogItemNames.baseCabinetTwoDrawers", "Base Cabinet (2 Drawers)"));
  }
  if (normalizedRawTitle === "base cabinet left") {
    return withDimensions(translate("configurator.catalogItemNames.baseCabinetLeft", "Base Cabinet left"));
  }
  if (normalizedRawTitle === "base cabinet right") {
    return withDimensions(translate("configurator.catalogItemNames.baseCabinetRight", "Base Cabinet right"));
  }
  if (normalizedRawTitle === "base cabinet") {
    return withDimensions(translate("configurator.catalogItemNames.baseCabinet", "Base Cabinet"));
  }
  if (/^wall cabinet(?:\s+\d+)?$/.test(normalizedRawTitle)) {
    return withDimensions(translate("configurator.catalogItemNames.wallCabinet", "Wall Cabinet"));
  }

  switch (code) {
    case "OVEN-B-600-HOB":
    case "OVEN-C-600-HOB":
    case "OVEN-AB105806-600-HOB":
    case "OVEN-AB105807-600-HOB":
    case "T3D-OVEN-HOB-001":
      return withDimensions(translate("configurator.itemNameOvenHob", "Built-in oven and induction hob"));
    case "CAB-WALL-B-L-600":
      return withDimensions(translate("configurator.catalogItemNames.wallCabinetLeft", "Wall Cabinet left"));
    case "CAB-WALL-B-ML-600":
      return withDimensions(translate("configurator.catalogItemNames.wallCabinetMidLeft", "Wall Cabinet mid-left"));
    case "CAB-WALL-B-MR-600":
      return withDimensions(rawName.includes("+")
        ? translate("configurator.catalogItemNames.wallCabinetMidRightExtractorHood", "Wall Cabinet mid-right + extractor hood")
        : translate("configurator.catalogItemNames.wallCabinetMidRight", "Wall Cabinet mid-right"));
    case "CAB-WALL-B-R-600":
      return withDimensions(translate("configurator.catalogItemNames.wallCabinetRight", "Wall Cabinet right"));
    case "CAB-HOOD-B-600":
    case "CAB-HOOD-AB105806-600":
    case "CAB-HOOD-AB105807-600":
    case "CAB-HOOD-AB105837-600":
    case "CAB-HOOD-AB105840-600":
    case "CAB-HOOD-AB105843-600":
    case "CAB-HOOD-AB105825-600":
    case "CAB-HOOD-AB105828-600":
    case "CAB-HOOD-AB105831-600":
      return withDimensions(translate("configurator.catalogItemNames.hoodWallCabinet", "Upper Cabinet with Extractor Hood 60"));
    case "CAB-WALL-C-L-600":
      return withDimensions(translate("configurator.catalogItemNames.wallCabinetLeft", "Wall Cabinet left"));
    case "CAB-WALL-C-ML-600":
      return withDimensions(translate("configurator.catalogItemNames.wallCabinetMidLeft", "Wall Cabinet mid-left"));
    case "CAB-WALL-C-MR-600":
      return withDimensions(translate("configurator.catalogItemNames.wallCabinetMidRight", "Wall Cabinet mid-right"));
    case "CAB-WALL-C-R-600":
      return withDimensions(translate("configurator.catalogItemNames.wallCabinetRight", "Wall Cabinet right"));
    case "CAB-WALL-LS-400":
      return translate("configurator.catalogItemNames.wallCabinetLeftLs", "Wall Cabinet left");
    case "CAB-WALL-LS-500":
      return translate("configurator.catalogItemNames.wallCabinetRightLs1", "Wall Cabinet right 1");
    case "CAB-WALL-LS-600":
      return translate("configurator.catalogItemNames.wallCabinetRightLs2", "Wall Cabinet right 2");
    case "HOOD-B-FH664621E":
    case "HOOD-AB105806-FH664621E":
    case "HOOD-AB105807-FH664621E":
    case "HOOD-AB105837-FH664621E":
    case "HOOD-AB105840-FH664621E":
    case "HOOD-AB105843-FH664621E":
    case "HOOD-AB105825-FH664621E":
    case "HOOD-AB105828-FH664621E":
    case "HOOD-AB105831-FH664621E":
      return translate("configurator.catalogItemNames.extractorHood", "Extractor hood");
    case "HOOD-C-FH664621E":
    case "HOOD-AB105845-KHF664611S":
      return translate(
        "configurator.catalogItemNames.chimneyExtractorHood",
        language === "de" ? "Schrägesse + Filter" : "Angled extractor hood + Filter",
      );
    case "LIGHT-B-LED-001":
    case "LIGHT-C-LED-001":
    case "LIGHT-AB105845-LED":
      return translate("configurator.catalogItemNames.ledLightingSet", "LED Lighting Set");
    case "WM-B-EWA34660W":
    case "WM-C-EWA34660W":
    case "WM-AB105845-EWA34660W":
      return withDimensions(translate("configurator.catalogItemNames.washingMachine", "Washing machine"));
    case "SINKBASE-B-600":
    case "SINKBASE-AB105806-600":
    case "SINKBASE-AB105807-600":
    case "SINKBASE-AB105831-DEFAULT":
    case "SINKBASE-C-600":
      return withDimensions(translate("configurator.catalogItemNames.sinkBaseCabinet", "Sink Lower Cabinet"));
    case "SINKBASE-LS-600":
      return translate("configurator.catalogItemNames.sinkBaseCabinet", "Sink Lower Cabinet");
    case "DISH-B-600-STD":
    case "DISH-AB105806-600":
    case "DISH-AB105807-600":
    case "DISH-AB105815-600":
    case "DISH-AB105819-600":
    case "DISH-AB105821-600":
    case "DISH-AB105822-600":
    case "DISH-AB105827-600":
    case "DISH-AB105833-600":
    case "DISH-AB105836-600":
    case "DISH-AB105842-600":
    case "DISH-AB105845-600":
    case "DISH-AB105834-600":
    case "DISH-AB105837-600":
    case "DISH-AB105840-600":
    case "DISH-AB105843-600":
    case "DISH-AB105825-600":
    case "DISH-AB105828-600":
    case "DISH-AB105831-600":
    case "DISH-C-600-STD":
    case "DISH-LS-600-STD":
    case "DISH-600-STD":
      return withDimensions(dishwasherName());
    case "TOP-B-3036":
    case "TOP-AB105806":
    case "TOP-AB105807":
    case "TOP-C-4000":
      return withDimensions(translate("configurator.catalogItemNames.worktop", "Worktop"));
    case "CAB-BASE-B-STR":
    case "CAB-BASE-AB105806-US60":
    case "CAB-BASE-AB105807-US60":
    case "CAB-BASE-AB105815-US60":
    case "CAB-BASE-AB105819-US60-R":
      return withDimensions(translate("configurator.catalogItemNames.baseCabinetTwoDrawers", "Base Cabinet (2 Drawers)"));
    case "CAB-BASE-LS-400":
      return translate("configurator.catalogItemNames.baseCabinetLeftLs", "Base Cabinet left");
    case "CAB-BASE-LS-500":
      return translate("configurator.catalogItemNames.baseCabinetRightLs", "Base Cabinet right");
    case "REF-B-545-1800-700":
    case "REF-AB105806-KGCN388140E":
    case "REF-AB105807-KGCN388140E":
    case "REF-AB105815-KGCN388140E":
    case "REF-AB105819-KGCN388140E":
    case "REF-AB105821-KGCN388140E":
    case "REF-AB105845-KGCN388140E":
    case "REF-AB105825-KGCN388140E":
    case "REF-AB105828-KGCN388140E":
    case "REF-C-545-1800-700":
    case "REF-545-1800-700":
      return withRefrigeratorHeight(translate("configurator.catalogItemNames.refrigerator", "Freestanding refrigerator 178cm"));
    case "SINK-WORKTOP":
    case "SINK-B-BOTTON-45":
    case "SINK-AB105806-BOTTON-45":
    case "SINK-AB105807-BOTTON-45":
    case "SINK-C-BOTTON-45":
    case "SINK-LS-BOTTON-45":
      return translate("configurator.catalogItemNames.worktop", "Worktop");
    case "ACC-WASTE-001":
    case "T3D-ACC-WASTE-001":
      return translate("configurator.catalogItemNames.wasteSeparationSystem", "Waste separation system");
    case "ACC-CUTLERY-ZB60SG":
      return translate("configurator.catalogItemNames.cutleryInsert60", "Cutlery insert ZB60SG");
    case "ACC-LIGHT-003":
      return translate("configurator.catalogItemNames.lightingSet3Spots", "Lighting set, 3 LED spots");
    case "SVC-MONTAGE-001":
      return translate("configurator.catalogItemNames.serviceMontage", "Delivery, transport, assembly and connection");
    case "SVC-PICKUP-001":
      return translate("configurator.catalogItemNames.servicePickup", "Pickup at logistics location");
    case "CAB-COOK-C-L-600":
      return withDimensions(translate("configurator.catalogItemNames.baseCabinetTwoDrawersLeft", "Base Cabinet (2 Drawers) Left"));
    case "CAB-COOK-C-R-600":
      return withDimensions(translate("configurator.catalogItemNames.baseCabinetTwoDrawersRight", "Base Cabinet (2 Drawers) Right"));
    case "CAB-DRAWER-C-3D":
      return withDimensions(translate("configurator.catalogItemNames.baseCabinetTwoDrawers", "Base Cabinet (2 Drawers)"));
    case "T3D-CAB-WALL-01":
    case "T3D-CAB-WALL-02":
    case "T3D-CAB-WALL-03":
    case "T3D-CAB-WALL-04":
    case "T3D-CAB-WALL-05":
      return withDimensions(translate("configurator.catalogItemNames.wallCabinet", "Wall Cabinet"));
    case "T3D-LIGHT-001":
      return translate("configurator.catalogItemNames.ledLightingSet", "LED Lighting Set");
    case "T3D-WASHER-001":
      return withDimensions(translate("configurator.catalogItemNames.washingMachine", "Washing machine"));
    case "T3D-SINKBASE-001":
      return withDimensions(translate("configurator.catalogItemNames.sinkBaseCabinet", "Sink Lower Cabinet"));
    case "T3D-DISH-001":
      return withDimensions(dishwasherName());
    case "T3D-CAB-STORAGE-001":
      return withDimensions(translate("configurator.catalogItemNames.baseStorageCabinet", "Base Storage Cabinet"));
    case "T3D-CAB-CORNER-001":
      return withDimensions(translate("configurator.catalogItemNames.cornerBaseCabinet", "Corner Base Cabinet"));
    case "T3D-CAB-BASE-001":
      return withDimensions(translate("configurator.catalogItemNames.returnBaseCabinet", "Return Base Cabinet"));
    case "T3D-CAB-DRAWERS-001":
      return withDimensions(translate("configurator.catalogItemNames.baseCabinetThreeDrawers", "Base Cabinet (3 Drawers)"));
    case "T3D-TOP-MAIN-001":
    case "T3D-TOP-RETURN-001":
      return withDimensions(translate("configurator.catalogItemNames.worktop", "Worktop"));
    case "T3D-SINK-001":
      return translate("configurator.catalogItemNames.sinkAndWasteSystem", "Sink and Waste System");
    case "T3D-HOOD-001":
      return translate("configurator.catalogItemNames.extractorHood", "Extractor hood");
    default:
      return withPhotoNumber(rawTitle);
  }
}

export function getLocalizedItemInfoText(item, translate) {
  const code = String(item?.code || "").trim().toUpperCase();

  switch (code) {
    case "CAB-WALL-B-L-600":
    case "CAB-WALL-B-ML-600":
    case "CAB-WALL-B-MR-600":
    case "CAB-WALL-B-R-600":
    case "CAB-WALL-AB105806-1":
    case "CAB-WALL-AB105806-2":
    case "CAB-WALL-AB105806-3":
    case "CAB-WALL-AB105807-1":
    case "CAB-WALL-AB105807-2":
    case "CAB-WALL-AB105807-3":
    case "CAB-WALL-C-L-600":
    case "CAB-WALL-C-ML-600":
    case "CAB-WALL-C-MR-600":
    case "CAB-WALL-C-R-600":
    case "T3D-CAB-WALL-01":
    case "T3D-CAB-WALL-02":
    case "T3D-CAB-WALL-03":
    case "T3D-CAB-WALL-04":
    case "T3D-CAB-WALL-05":
      return translate("configurator.catalogItemInfo.adjustableShelves", "H6002, 2 adjustable shelves");
    case "CAB-WALL-LS-400":
    case "CAB-WALL-LS-500":
    case "CAB-WALL-LS-600":
      return translate("configurator.catalogItemInfo.oneDoorTwoShelves", "1 door, 2 adjustable shelves");
    case "CAB-HOOD-B-600":
    case "CAB-HOOD-AB105806-600":
    case "CAB-HOOD-AB105807-600":
    case "CAB-HOOD-AB105837-600":
    case "CAB-HOOD-AB105840-600":
    case "CAB-HOOD-AB105843-600":
    case "CAB-HOOD-AB105825-600":
    case "CAB-HOOD-AB105828-600":
    case "CAB-HOOD-AB105831-600":
      return translate("configurator.catalogItemInfo.lightHoodSetup", "HD6002, light hood setup");
    case "HOOD-B-FH664621E":
    case "HOOD-AB105806-FH664621E":
    case "HOOD-AB105807-FH664621E":
    case "HOOD-AB105837-FH664621E":
    case "HOOD-AB105840-FH664621E":
    case "HOOD-AB105843-FH664621E":
    case "HOOD-AB105825-FH664621E":
    case "HOOD-AB105828-FH664621E":
    case "HOOD-AB105831-FH664621E":
    case "T3D-HOOD-001":
      return translate("configurator.catalogItemInfo.flatPullOutHood", "Flat pull-out hood, 60 cm");
    case "HOOD-C-FH664621E":
    case "HOOD-AB105845-KHF664611S":
      return translate("configurator.catalogItemInfo.chimneyHood", "Chimney hood, 60 cm");
    case "LIGHT-B-LED-001":
    case "LIGHT-C-LED-001":
    case "LIGHT-AB105845-LED":
    case "T3D-LIGHT-001":
      return translate("configurator.catalogItemInfo.ledLightingSet", "LED lighting set");
    case "WM-B-EWA34660W":
    case "WM-C-EWA34660W":
    case "WM-AB105845-EWA34660W":
    case "T3D-WASHER-001":
      return translate("configurator.catalogItemInfo.washingMachine", "Washing machine, 8 kg, 1400 rpm");
    case "SINKBASE-B-600":
    case "SINKBASE-AB105806-600":
    case "SINKBASE-AB105807-600":
    case "SINKBASE-AB105831-DEFAULT":
    case "SINKBASE-C-600":
    case "T3D-SINKBASE-001":
      return translate("configurator.catalogItemInfo.defaultSinkBaseCabinet", "Default sink base cabinet");
    case "SINKBASE-LS-600":
      return translate("configurator.catalogItemInfo.us30SinkBaseCabinet", "US30, sink base cabinet");
    case "DISH-B-600-STD":
    case "DISH-AB105806-600":
    case "DISH-AB105807-600":
    case "DISH-AB105815-600":
    case "DISH-AB105819-600":
    case "DISH-AB105821-600":
    case "DISH-AB105822-600":
    case "DISH-AB105827-600":
    case "DISH-AB105833-600":
    case "DISH-AB105836-600":
    case "DISH-AB105842-600":
    case "DISH-AB105845-600":
    case "DISH-AB105834-600":
    case "DISH-AB105837-600":
    case "DISH-AB105840-600":
    case "DISH-AB105843-600":
    case "DISH-AB105825-600":
    case "DISH-AB105828-600":
    case "DISH-AB105831-600":
    case "DISH-C-600-STD":
    case "DISH-LS-600-STD":
    case "T3D-DISH-001":
      return translate("configurator.catalogItemInfo.integratedDishwasher", "Fully integrated dishwasher, 60 cm");
    case "TOP-B-3036":
    case "TOP-AB105806":
    case "TOP-AB105807":
    case "TOP-C-4000":
    case "T3D-TOP-MAIN-001":
    case "T3D-TOP-RETURN-001":
      return translate("configurator.catalogItemInfo.concreteSlateGray", "PLS, concrete slate gray");
    case "OVEN-B-600-HOB":
    case "OVEN-AB105806-600-HOB":
    case "OVEN-AB105807-600-HOB":
    case "OVEN-C-600-HOB":
    case "T3D-OVEN-HOB-001":
      return translate("configurator.catalogItemInfo.ovenInductionHob", "Built-in oven + induction hob");
    case "CAB-BASE-B-STR":
    case "CAB-BASE-AB105806-US60":
    case "CAB-BASE-AB105807-US60":
    case "T3D-CAB-STORAGE-001":
      return translate("configurator.catalogItemInfo.strBaseStorageCabinet", "STR base storage cabinet");
    case "CAB-BASE-LS-400":
    case "CAB-BASE-LS-500":
      return translate("configurator.catalogItemInfo.oneDrawerOneDoorOneShelf", "1 drawer, 1 door, 1 adjustable shelf");
    case "REF-B-545-1800-700":
    case "REF-AB105806-KGCN388140E":
    case "REF-AB105807-KGCN388140E":
    case "REF-AB105815-KGCN388140E":
    case "REF-AB105819-KGCN388140E":
    case "REF-AB105821-KGCN388140E":
    case "REF-AB105845-KGCN388140E":
    case "REF-AB105825-KGCN388140E":
    case "REF-AB105828-KGCN388140E":
    case "REF-C-545-1800-700":
      return translate("configurator.catalogItemInfo.fridgeFreezerNoFrost", "Fridge-freezer, 180 cm, NoFrost");
    case "SINK-WORKTOP":
    case "SINK-B-BOTTON-45":
    case "SINK-AB105806-BOTTON-45":
    case "SINK-AB105807-BOTTON-45":
    case "SINK-C-BOTTON-45":
    case "SINK-LS-BOTTON-45":
    case "T3D-SINK-001":
      return translate("configurator.catalogItemInfo.manualWasteSystem", "Blanco Botton Pro 45/2 manual waste system");
    case "ACC-CUTLERY-ZB60SG":
      return translate("configurator.catalogItemInfo.cutleryInsert60", "Cutlery insert for 60 cm cabinet");
    case "ACC-WASTE-001":
    case "T3D-ACC-WASTE-001":
      return translate("configurator.catalogItemInfo.wasteSeparationSystem", "Blanco Botton 517467");
    default:
      return item?.infoText || "";
  }
}

const LINKED_COMPONENT_GROUPS_BY_SLUG = {
  "ab-105806": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105808": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105805": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105809": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105813": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105817": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105834": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105810": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105812": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105814": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105816": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105818": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105815": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105819": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105820": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105821": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105824": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105822": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105823": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105829": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105832": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105837": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105840": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105843": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105825": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105828": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105831": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105833": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105826": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105827": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105830": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105835": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105836": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105842": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105839": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105841": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105838": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105844": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105811": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105807": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "kitchen-model-b": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "108134-modul-1": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "l-shaped-kitchen": [["component-wall-cabinet-2", "component-under-cabinet-light"]],
  "l-kitchen-new": [["component-top-400", "component-aspirator"]],
};

const PRODUCT_INFO_DOCUMENTS_BY_CODE = {
  "DISH-B-600-STD": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-C-600-STD": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-LS-600-STD": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105806-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105807-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105837-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105819-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105821-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105822-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105833-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105811-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105827-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "DISH-AB105815-600": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "T3D-DISH-001": [
    { label: "E-Label PDF", href: "/product-info/a-egspv597210-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
  ],
  "REF-B-545-1800-700": [
    { label: "E-Label PDF", href: "/product-info/kgc-15495-s-elabel-eco21-2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/kgc-15495-s-product-info-eco21.pdf" },
  ],
  "REF-C-545-1800-700": [
    { label: "E-Label PDF", href: "/product-info/kgc-15495-s-elabel-eco21-2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/kgc-15495-s-product-info-eco21.pdf" },
  ],
  "REF-AB105806-KGCN388140E": [
    { label: "E-Label PDF", href: "/product-info/kgc-15495-s-elabel-eco21-2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/kgc-15495-s-product-info-eco21.pdf" },
  ],
  "REF-AB105807-KGCN388140E": [
    { label: "E-Label PDF", href: "/product-info/kgc-15495-s-elabel-eco21-2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/kgc-15495-s-product-info-eco21.pdf" },
  ],
  "REF-AB105819-KGCN388140E": [
    { label: "E-Label PDF", href: "/product-info/kgc-15495-s-elabel-eco21-2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/kgc-15495-s-product-info-eco21.pdf" },
  ],
  "REF-AB105821-KGCN388140E": [
    { label: "E-Label PDF", href: "/product-info/kgc-15495-s-elabel-eco21-2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/kgc-15495-s-product-info-eco21.pdf" },
  ],
  "REF-AB105811-KGCN388140E": [
    { label: "E-Label PDF", href: "/product-info/kgc-15495-s-elabel-eco21-2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/kgc-15495-s-product-info-eco21.pdf" },
  ],
  "REF-AB105815-KGCN388140E": [
    { label: "E-Label PDF", href: "/product-info/kgc-15495-s-elabel-eco21-2602.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/kgc-15495-s-product-info-eco21.pdf" },
  ],
  "HOOD-B-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/fh-664-621-s-elabel-eco21-2512.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/fh-664-621-s-product-info.pdf" },
  ],
  "HOOD-LS-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/fh-664-621-s-elabel-eco21-2512.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/fh-664-621-s-product-info.pdf" },
  ],
  "HOOD-AB105806-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/fh-664-621-s-elabel-eco21-2512.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/fh-664-621-s-product-info.pdf" },
  ],
  "HOOD-AB105807-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/fh-664-621-s-elabel-eco21-2512.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/fh-664-621-s-product-info.pdf" },
  ],
  "HOOD-AB105837-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/fh-664-621-s-elabel-eco21-2512.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/fh-664-621-s-product-info.pdf" },
  ],
  "HOOD-C-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/khf-664-611-s-elabel-eco21-2407.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf" },
  ],
  "T3D-HOOD-001": [
    { label: "E-Label PDF", href: "/product-info/fh-664-621-s-elabel-eco21-2512.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/fh-664-621-s-product-info.pdf" },
  ],
  "WM-B-EWA34660W": [
    { label: "E-Label PDF", href: "/product-info/ewa-34660-w-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/ewa-34660-w-product-info.pdf" },
  ],
  "WM-C-EWA34660W": [
    { label: "E-Label PDF", href: "/product-info/ewa-34660-w-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/ewa-34660-w-product-info.pdf" },
  ],
  "T3D-WASHER-001": [
    { label: "E-Label PDF", href: "/product-info/ewa-34660-w-elabel-eco21-2601.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/ewa-34660-w-product-info.pdf" },
  ],
  "OVEN-B-600-HOB": [
    { label: "Backofen E-Label", href: "/product-info/ebx-943-600-s-elabel-1901.pdf" },
    { label: "Backofen PDF", href: "/product-info/ebx-943-600-s-product-info.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/ol-kmi-754-000-e-product-info.pdf" },
  ],
  "OVEN-C-600-HOB": [
    { label: "Backofen E-Label", href: "/product-info/ebx-943-600-s-elabel-1901.pdf" },
    { label: "Backofen PDF", href: "/product-info/ebx-943-600-s-product-info.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/ol-kmi-754-000-e-product-info.pdf" },
  ],
  "OVEN-AB105806-600-HOB": [
    { label: "Backofen E-Label", href: "/product-info/ebx-943-600-s-elabel-1901.pdf" },
    { label: "Backofen PDF", href: "/product-info/ebx-943-600-s-product-info.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/ol-kmi-754-000-e-product-info.pdf" },
  ],
  "OVEN-AB105807-600-HOB": [
    { label: "Backofen E-Label", href: "/product-info/ebx-943-600-s-elabel-1901.pdf" },
    { label: "Backofen PDF", href: "/product-info/ebx-943-600-s-product-info.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/ol-kmi-754-000-e-product-info.pdf" },
  ],
  "T3D-OVEN-HOB-001": [
    { label: "Backofen E-Label", href: "/product-info/ebx-943-600-s-elabel-1901.pdf" },
    { label: "Backofen PDF", href: "/product-info/ebx-943-600-s-product-info.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/ol-kmi-754-000-e-product-info.pdf" },
  ],
  "LIGHT-B-LED-001": [
    { label: "E-Label PDF", href: "/product-info/led-lighting-set-elabel.pdf#zoom=300" },
  ],
  "LIGHT-C-LED-001": [
    { label: "E-Label PDF", href: "/product-info/led-lighting-set-elabel.pdf#zoom=300" },
  ],
  "T3D-LIGHT-001": [
    { label: "E-Label PDF", href: "/product-info/led-lighting-set-elabel.pdf#zoom=300" },
  ],
  "ACC-LIGHT-003": [
    { label: "E-Label PDF", href: "/product-info/led-lighting-set-elabel.pdf#zoom=300" },
  ],
};

["105840", "105843"].forEach((targetCode) => {
  ["DISH-AB105837-600", "HOOD-AB105837-FH664621E"].forEach((sourceCode) => {
    PRODUCT_INFO_DOCUMENTS_BY_CODE[sourceCode.replace("AB105837", `AB${targetCode}`)] =
      PRODUCT_INFO_DOCUMENTS_BY_CODE[sourceCode];
  });
});

["105825", "105828"].forEach((targetCode) => {
  PRODUCT_INFO_DOCUMENTS_BY_CODE[`DISH-AB${targetCode}-600`] = PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-B-600-STD"];
  PRODUCT_INFO_DOCUMENTS_BY_CODE[`REF-AB${targetCode}-KGCN388140E`] = PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-B-545-1800-700"];
  PRODUCT_INFO_DOCUMENTS_BY_CODE[`HOOD-AB${targetCode}-FH664621E`] = PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-B-FH664621E"];
});

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
  "T3D-WASHER-001": {
    infoText: "Washing machine, 8 kg, 1400 rpm",
    productInfoSummary:
      "Freestanding washing machine EWA34660W for the TEST 3D kitchen configuration. The current product information lists 8 kg capacity and 1400 rpm spin speed.",
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
  // Linked parts toggle as one unit. Treat the group as "on" if any member is selected so a
  // single click reliably turns it off — even when a hidden partner wasn't persisted on reload.
  const shouldRemove = linkedIds.some((id) => currentSet.has(id));

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

const PRODUCT_IMAGE_GALLERIES_BY_CODE = {
  "DISH-600-STD": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-B-600-STD": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-C-600-STD": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-LS-600-STD": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105806-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105807-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105819-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105821-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105822-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105827-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105833-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105836-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105842-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105845-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105834-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105837-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105825-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105828-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105831-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105841-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105811-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105815-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "T3D-DISH-001": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "OVEN-B-600-HOB": Array.from({ length: 7 }, (_, index) => `/product-images/gallery/ebx943600s-oven/${String(index + 1).padStart(2, "0")}.webp`),
  "OVEN-C-600-HOB": Array.from({ length: 7 }, (_, index) => `/product-images/gallery/ebx943600s-oven/${String(index + 1).padStart(2, "0")}.webp`),
  "OVEN-AB105806-600-HOB": Array.from({ length: 7 }, (_, index) => `/product-images/gallery/ebx943600s-oven/${String(index + 1).padStart(2, "0")}.webp`),
  "OVEN-AB105807-600-HOB": Array.from({ length: 7 }, (_, index) => `/product-images/gallery/ebx943600s-oven/${String(index + 1).padStart(2, "0")}.webp`),
  "T3D-OVEN-HOB-001": Array.from({ length: 7 }, (_, index) => `/product-images/gallery/ebx943600s-oven/${String(index + 1).padStart(2, "0")}.webp`),
  "HOOD-600-FLAT": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-B-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-LS-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105806-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105807-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105837-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105837-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105825-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105825-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105822-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105822-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105828-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105828-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105831-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105831-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-C-FH664621E": ["/product-images/gallery/khf664611s-chimney-hood/01.jpg"],
  "HOOD-AB105845-KHF664611S": ["/product-images/gallery/khf664611s-chimney-hood/01.jpg"],
  "T3D-HOOD-001": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "REF-545-1800-700": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-B-545-1800-700": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-C-545-1800-700": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105806-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105807-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105819-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105821-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105841-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105845-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105825-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105822-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105828-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105831-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105811-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "REF-AB105815-KGCN388140E": Array.from({ length: 10 }, (_, index) => `/product-images/gallery/kgc15495s-fridge/${String(index + 1).padStart(2, "0")}.webp`),
  "WM-B-EWA34660W": Array.from({ length: 8 }, (_, index) => `/product-images/gallery/ewa34660w-washing-machine/${String(index + 1).padStart(2, "0")}.webp`),
  "WM-C-EWA34660W": Array.from({ length: 8 }, (_, index) => `/product-images/gallery/ewa34660w-washing-machine/${String(index + 1).padStart(2, "0")}.webp`),
  "WM-AB105845-EWA34660W": Array.from({ length: 8 }, (_, index) => `/product-images/gallery/ewa34660w-washing-machine/${String(index + 1).padStart(2, "0")}.webp`),
  "T3D-WASHER-001": Array.from({ length: 8 }, (_, index) => `/product-images/gallery/ewa34660w-washing-machine/${String(index + 1).padStart(2, "0")}.webp`),
};

["105840", "105843"].forEach((targetCode) => {
  ["DISH-AB105837-600", "HOOD-AB105837-FH664621E", "CAB-HOOD-AB105837-600"].forEach((sourceCode) => {
    PRODUCT_IMAGE_GALLERIES_BY_CODE[sourceCode.replace("AB105837", `AB${targetCode}`)] =
      PRODUCT_IMAGE_GALLERIES_BY_CODE[sourceCode];
  });
});

export function getProductImagePaths(item) {
  const candidates = [item?.productInfoCode, item?.code, item?.tooltipPreviewCode].filter(Boolean);
  for (const code of candidates) {
    const gallery = PRODUCT_IMAGE_GALLERIES_BY_CODE[String(code).toUpperCase()];
    if (gallery?.length) return gallery;
  }
  return item?.productImagePath ? [item.productImagePath] : [];
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

function isHoodWallCabinetItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  return code.startsWith("CAB-HOOD-");
}

export function getCatalogDisplayItem(allItems, slug, item) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const linkedItems = getCatalogLinkedItems(allItems, slug, item).map(applyProductInfoDisplayOverrides);
  const displayItem = applyProductInfoDisplayOverrides(item);

  if (linkedItems.length <= 1) {
    return {
      item: {
        ...displayItem,
        iconKey: isHoodWallCabinetItem(displayItem) ? "hood_wall_cabinet" : displayItem.iconKey,
        productInfoItemId: displayItem.id,
        productAssistantName: displayItem.name || "",
        productImagePath: displayItem.productImagePath || "",
        productInfoKeyFacts: Array.isArray(displayItem.productInfoKeyFacts) ? displayItem.productInfoKeyFacts : [],
        productInfoDocuments: getProductInfoDocuments(displayItem),
      },
      price: Number(displayItem.price || 0),
      infoPdfHref: getProductInfoHref(displayItem),
    };
  }

  const hoodItem =
    linkedItems.find((entry) => {
      const componentKey = String(entry.componentKey || "").toLowerCase();
      const code = String(entry.code || "").trim().toUpperCase();
      return componentKey === "extractor-hood" || componentKey === "aspirator" || code.startsWith("HOOD-") || code.includes("ASPIRATOR");
    }) || null;
  const primaryItem = linkedItems[0];
  const infoSource = hoodItem?.productInfoPdfPath ? hoodItem : primaryItem;
  const assistantHoverExtractorHoodOnly = Boolean(hoodItem && infoSource === hoodItem);

  return {
    item: {
      ...primaryItem,
      name: hoodItem
        ? normalizedSlug === "kitchen-model-b"
          ? `${primaryItem.name} + extractor hood`
          : `${primaryItem.name} + ${hoodItem.name}`
        : primaryItem.name,
      linkedInfoBadge: hoodItem ? "Includes extractor hood" : "",
      productAssistantName: infoSource?.name || primaryItem.name || "",
      infoText: hoodItem
        ? `${primaryItem.infoText || ""}${primaryItem.infoText ? " • " : ""}${hoodItem.infoText || ""}`.trim()
        : primaryItem.infoText,
      iconKey: hoodItem ? "hood_wall_cabinet" : primaryItem.iconKey || hoodItem?.iconKey,
      productInfoPdfPath: infoSource?.productInfoPdfPath || "",
      productImagePath: infoSource?.productImagePath || primaryItem.productImagePath || "",
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

export function shouldShowProductAssistantLauncher(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  if (code === "LIGHT-B-LED-001" || code === "LIGHT-C-LED-001" || code === "ACC-LIGHT-003") {
    return false;
  }

  return hasAssistantProductInfo(item);
}
