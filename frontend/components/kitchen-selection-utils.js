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
    return "Bereits bestätigt";
  }
  if (!item?.isLocked) {
    return "Ausgewählt";
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

export function getStructuredDimensions(item, kitchenSlug = "") {
  const code = String(item?.code || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const name = String(item?.name || "").trim().toLowerCase();
  const isDishwasher = code.startsWith("DISH-") || iconKey === "dishwasher_base" || name.includes("dishwasher");
  const isBurger103898 = String(kitchenSlug || "").trim().toLowerCase() === "burger-103898";

  if (isBurger103898) {
    const widthMm = Number(item?.widthMm) > 0 ? item.widthMm : null;
    const isRefrigerator = code === "REF-BURGER103898-KGCN388140E";
    const isUpperCabinet = code.startsWith("CAB-WALL-")
      || code.startsWith("CAB-HOOD-")
      || iconKey.startsWith("wall_cabinet")
      || iconKey === "hood_wall_cabinet";
    const isLowerCabinet = code.startsWith("CAB-BASE-")
      || code.startsWith("SINK-BASE-")
      || iconKey.startsWith("drawer_base")
      || iconKey.startsWith("base_cabinet")
      || iconKey === "sink_base";

    if (isRefrigerator) {
      const heightMm = Number(item?.heightMm) > 0 ? item.heightMm : null;
      return heightMm ? `${formatDimensionCmPart(heightMm)} cm` : "";
    }

    if (isDishwasher || isLowerCabinet) {
      return widthMm ? `${formatDimensionCmPart(widthMm)} cm` : "";
    }

    if (isUpperCabinet) {
      const heightMm = Number(item?.heightMm) > 0 ? item.heightMm : null;
      const values = [widthMm, heightMm].filter(Boolean);
      return values.length ? `${values.map(formatDimensionCmPart).join(" x ")} cm` : "";
    }
  }

  if (isDishwasher) {
    return "";
  }

  const values = [item?.widthMm, item?.heightMm, item?.depthMm].filter(
    (value) => value !== null && value !== undefined && value !== "" && Number(value) > 0,
  );
  if (!values.length) return "";
  return `${values.map(formatDimensionCmPart).join(" x ")} cm`;
}

export function formatDimensionCmPart(value) {
  if (value === null || value === undefined || value === "") return "";
  const cm = Number(value) / 10;
  if (!Number.isFinite(cm) || cm <= 0) return "";
  return Number.isInteger(cm)
    ? String(cm)
    : String(Number(cm.toFixed(2))).replace(/\.0+$/, "");
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

export function getCatalogItemDetails(item, kitchenSlug = "") {
  return {
    articleNumber: String(item?.articleNumber || "").trim(),
    dimensions: getStructuredDimensions(item, kitchenSlug),
  };
}

export function getLocalizedBlendeLabel(item, language = "en") {
  const localizedName = String(
    language === "de" && item?.blendeNameDe
      ? item.blendeNameDe
      : item?.blendeName || "",
  ).trim();

  return localizedName || String(item?.blendeLabel || "").trim();
}

export function getLocalizedBlendeDisplayLabel(item, language = "en") {
  const label = getLocalizedBlendeLabel(item, language);
  const code = String(item?.blendeCode || "").trim();

  if (!label) return code;
  if (!code || label.toLowerCase().includes(code.toLowerCase())) return label;

  return `${label}, ${code}`;
}

/** True when this kitchen slot bundles a mandatory filler panel (Blende / Passleiste). */
export function itemRequiresBlendeConfirmation(item, language = "en") {
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  if (iconKey === "blende" || componentKey.endsWith("-blende")) {
    return false;
  }

  return Boolean(
    String(item?.catalogBlendeId || "").trim()
    || String(item?.blendeCode || "").trim()
    || getLocalizedBlendeDisplayLabel(item, language),
  );
}

/** Blende amount included in item.price (unit × quantity when quantity is known). */
export function getItemBlendeTotal(item) {
  const unit = Number(item?.blendePrice);
  if (!Number.isFinite(unit) || unit <= 0) return 0;

  const hasCatalogLink = Boolean(String(item?.catalogBlendeId || "").trim());
  const quantity = Math.max(1, Number.parseInt(String(item?.catalogBlendeQuantity || 1), 10) || 1);

  // Catalog-linked items store unit price; KitchenItem.blendePrice snapshots are often totals.
  if (hasCatalogLink || item?.catalogBlendeQuantity != null) {
    return unit * quantity;
  }

  return unit;
}

export function getItemPriceWithoutBlende(item) {
  return Math.max(0, Number(item?.price || 0) - getItemBlendeTotal(item));
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
  "SINK-BASE-BURGER103898-600": "3",
  "REF-BURGER103898-KGCN388140E": "4",
  "CAB-BASE-BURGER103898-US50": "5",
  "CAB-BASE-BURGER103898-US60-UPE65": "6",
  "DISH-BURGER103898-600": "7",
  "CAB-BASE-BURGER103898-US30": "8",
  "CAB-WALL-BURGER103898-H5072": "9",
  "CAB-HOOD-BURGER103898-HFLH6072": "10",
  "HOOD-BURGER103898-FH664621E": "10",
  "CAB-WALL-BURGER103898-H6072": "11",
  "CAB-WALL-BURGER103898-H3072": "12",
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
  "CAB-BASE-AB105732-US40-R": "5",
  "DISH-AB105732-600": "6",
  "CAB-WALL-AB105732-H4002-R": "7",
  "CAB-HOOD-AB105732-600": "8",
  "HOOD-AB105732-FH664621E": "8",
  "CAB-WALL-AB105732-H6002-R": "9",
  "CAB-WALL-AB105732-H6002-L-FILLER": "10",
  "CAB-BASE-AB105733-US30-R": "4",
  "DISH-AB105733-600": "5",
  "REF-AB105733-KGCN388140E": "7",
  "CAB-WALL-AB105733-H3002-R": "8",
  "CAB-WALL-AB105733-H6002-R1": "9",
  "CAB-WALL-AB105733-H6002-R2": "10",
  "CAB-HOOD-AB105733-600": "11",
  "HOOD-AB105733-FH664621E": "11",
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
  "SINK-BASE-AB105845-600": "3",
  "REF-AB105845-KGCN388140E": "4",
  "CAB-BASE-AB105845-US60-1": "5",
  "CAB-BASE-AB105845-US30-1": "6",
  "CAB-BASE-AB105845-US60-2": "7",
  "CAB-BASE-AB105845-US60-3": "8",
  "DISH-AB105845-450": "9",
  "CAB-BASE-AB105845-US30-2": "10",
  "CAB-WALL-AB105845-H6002-1": "11",
  "CAB-WALL-AB105845-H3002-1": "12",
  "CAB-HOOD-AB105845-600": "13",
  "HOOD-AB105845-FH664621E": "13",
  "CAB-WALL-AB105845-H6002-2": "14",
  "CAB-WALL-AB105845-H6002-3": "15",
  "CAB-WALL-AB105845-H6002-4": "16",
  "CAB-WALL-AB105845-H4502": "17",
  "CAB-WALL-AB105845-H3002-2": "18",
  "SINK-BASE-AB105847-600": "3",
  "CAB-BASE-AB105847-US60-1": "4",
  "CAB-BASE-AB105847-US60-2": "5",
  "CAB-BASE-AB105847-US30-1": "6",
  "REF-AB105847-KGCN388140E": "7",
  "CAB-BASE-AB105847-US30-2": "8",
  "DISH-AB105847-450": "9",
  "CAB-BASE-AB105847-US60-3": "10",
  "CAB-WALL-AB105847-H6002-1": "11",
  "CAB-HOOD-AB105847-600": "12",
  "HOOD-AB105847-FH664621E": "12",
  "CAB-WALL-AB105847-H6002-2": "13",
  "CAB-WALL-AB105847-H3002-1": "14",
  "CAB-WALL-AB105847-H3002-2": "15",
  "CAB-WALL-AB105847-H4502": "16",
  "CAB-WALL-AB105847-H6002-3": "17",
  "CAB-WALL-AB105847-H6002-4": "18",
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
  "DISH-AB105747-450": "7",
  "CAB-BASE-AB105747-US30": "8",
  "CAB-WALL-AB105834-500-R": "8",
  "CAB-WALL-AB105834-H6002-L": "10",
  "CAB-BASE-AB105837-US60-R": "5",
  "CAB-BASE-AB105837-500-R": "6",
  "DISH-AB105837-600": "7",
  "CAB-WALL-AB105837-US60-R": "8",
  "CAB-HOOD-AB105837-600": "9",
  "CAB-WALL-AB105837-US60-L": "10",
  "CAB-WALL-AB105747-H6002-R": "9",
  "CAB-WALL-AB105747-H6002-L": "11",
  "CAB-BASE-AB105743-US30-R": "4",
  "CAB-BASE-AB105743-US40-R": "5",
  "DISH-AB105743-600": "6",
  "CAB-BASE-AB105743-US60": "7",
  "REF-AB105743-KGCN388140E": "8",
  "CAB-WALL-AB105743-H6002-R": "9",
  "CAB-HOOD-AB105743-600": "10",
  "HOOD-AB105743-FH664621E": "10",
  "CAB-WALL-AB105743-H6002-L": "11",
  "CAB-BASE-AB105748-US45": "5",
  "DISH-AB105748-450": "6",
  "CAB-BASE-AB105748-US30": "7",
  "CAB-WALL-AB105748-H4502": "8",
  "CAB-HOOD-AB105748-600": "9",
  "HOOD-AB105748-FH664621E": "9",
  "CAB-WALL-AB105748-H6002": "10",
  "SINK-BASE-AB105846-DEFAULT": "3",
  "BLENDE-AB105846-SINK-END": "3",
  "DISH-AB105846-600": "4",
  "CAB-BASE-AB105846-US50": "5",
  "CAB-BASE-AB105846-US30": "6",
  "REF-AB105846-KGCN388140E": "7",
  "CAB-WALL-AB105846-H4502": "8",
  "CAB-HOOD-AB105846-600": "9",
  "HOOD-AB105846-FH664621E": "9",
  "CAB-WALL-AB105846-H3002": "10",
  "SINKBASE-AB105831-DEFAULT": "3",
  "CAB-BASE-AB105831-US30-R": "4",
  "DISH-AB105831-600": "5",
  "CAB-BASE-AB105831-US60-L": "6",
  "BLENDE-AB105831-CORNER-LEFT": "6",
  "CAB-BASE-AB105831-500-L": "7",
  "CAB-BASE-AB105831-US30-L": "8",
  "REF-AB105831-KGCN388140E": "9",
  "CAB-WALL-AB105831-H6002-R": "10",
  "CAB-HOOD-AB105831-600": "11",
  "CAB-WALL-AB105831-500-L": "12",
  "CAB-WALL-AB105831-H3002-L": "13",
  "SINKBASE-AB104968-DEFAULT": "3",
  "SINKBASE-AB105746-DEFAULT": "3",
  "SINKBASE-AB105757-DEFAULT": "3",
  "CAB-BASE-AB104968-US50-R": "4",
  "CAB-BASE-AB104968-US40-L": "5",
  "DISH-AB104968-600": "6",
  "CAB-BASE-AB104968-US60-L": "7",
  "REF-AB104968-KGCN388140E": "8",
  "CAB-WALL-AB104968-H5002-R": "9",
  "CAB-HOOD-AB104968-600": "10",
  "CAB-WALL-AB104968-H4002-L": "11",
  "CAB-WALL-AB104968-H6002-L": "12",
  "REF-AB105746-KGCN388140E": "4",
  "CAB-BASE-AB105746-US60-R": "5",
  "DISH-AB105746-600": "6",
  "CAB-WALL-AB105746-H6002-R": "7",
  "CAB-HOOD-AB105746-600": "8",
  "CAB-WALL-AB105746-H6002-L1": "9",
  "CAB-WALL-AB105746-H6002-L2": "10",
  "CAB-BASE-AB105757-US50": "4",
  "CAB-BASE-AB105757-US60-1": "5",
  "DISH-AB105757-600": "6",
  "CAB-BASE-AB105757-US60-2": "7",
  "REF-AB105757-KGCN388140E": "8",
  "CAB-WALL-AB105757-H5002": "9",
  "CAB-HOOD-AB105757-600": "10",
  "CAB-WALL-AB105757-H6002-1": "11",
  "CAB-WALL-AB105757-H6002-2": "12",
  "CAB-WALL-AB105757-H6002-3": "13",
  "CAB-WALL-AB105757-H6002-4": "14",
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
  "CAB-BASE-AB105744-US60-1": "4",
  "CAB-BASE-AB105744-US60-2": "5",
  "DISH-AB105744-600": "6",
  "CAB-BASE-AB105744-US40": "7",
  "REF-AB105744-KGCN388140E": "8",
  "CAB-WALL-AB105744-H6002-1": "9",
  "CAB-WALL-AB105744-H6002-3": "11",
  "CAB-WALL-AB105744-H6002-4": "12",
  "CAB-WALL-AB105744-H6002-5": "13",
  "CAB-WALL-AB105744-H4002": "14",
  "CAB-SINK-AB105758-DEFAULT": "3",
  "DISH-AB105758-600": "4",
  "CAB-BASE-AB105758-US30-R": "5",
  "REF-AB105758-KGCN388140E": "6",
  "CAB-WALL-AB105758-H6002-R": "7",
  "CAB-HOOD-AB105758-600": "8",
  "HOOD-AB105758-FH664621E": "8",
  "CAB-WALL-AB105758-US30": "9",
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

["105749", "105752", "105755"].forEach((targetCode) => {
  Object.entries(AB_105806_PHOTO_NUMBER_BY_CODE)
    .filter(([sourceCode]) => sourceCode.includes("AB105746"))
    .forEach(([sourceCode, photoNumber]) => {
      AB_105806_PHOTO_NUMBER_BY_CODE[sourceCode.replace("AB105746", `AB${targetCode}`)] = photoNumber;
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

  if (item?.isCutleryLine && rawName) {
    return withPhotoNumber(rawName);
  }

  if (code === "SVC-MONTAGE-001") {
    return translate("configurator.catalogItemNames.serviceMontage", "Delivery, Carry-in, Assembly and Installation");
  }
  if (code === "SVC-PICKUP-001") {
    return translate("configurator.catalogItemNames.servicePickup", "Pickup at logistics location");
  }
  if ((item?.catalogArticleId || item?.catalogServiceId) && rawName) {
    return withPhotoNumber(rawName);
  }

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
    return withRefrigeratorHeight(rawName || translate("configurator.catalogItemNames.refrigerator", "Freestanding refrigerator"));
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
    case "CAB-HOOD-AB105732-600":
    case "CAB-HOOD-AB105837-600":
    case "CAB-HOOD-AB105840-600":
    case "CAB-HOOD-AB105843-600":
    case "CAB-HOOD-AB105825-600":
    case "CAB-HOOD-AB105828-600":
    case "CAB-HOOD-AB105831-600":
    case "CAB-HOOD-AB105743-600":
    case "CAB-HOOD-AB104968-600":
    case "CAB-HOOD-AB105746-600":
    case "CAB-HOOD-AB105749-600":
    case "CAB-HOOD-AB105752-600":
    case "CAB-HOOD-AB105755-600":
    case "CAB-HOOD-AB105757-600":
      return withPhotoNumber(translate("configurator.catalogItemNames.hoodWallCabinet", "Upper Cabinet with Extractor Hood 60 cm"));
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
    case "HOOD-AB105732-FH664621E":
    case "HOOD-AB105837-FH664621E":
    case "HOOD-AB105840-FH664621E":
    case "HOOD-AB105843-FH664621E":
    case "HOOD-AB105825-FH664621E":
    case "HOOD-AB105828-FH664621E":
    case "HOOD-AB105831-FH664621E":
    case "HOOD-AB105743-FH664621E":
    case "HOOD-AB104968-FH664621E":
    case "HOOD-AB105746-FH664621E":
    case "HOOD-AB105749-FH664621E":
    case "HOOD-AB105752-FH664621E":
    case "HOOD-AB105755-FH664621E":
    case "HOOD-AB105757-FH664621E":
    case "HOOD-AB105845-FH664621E":
    case "HOOD-AB105847-FH664621E":
      return translate("configurator.catalogItemNames.extractorHood", "Extractor hood");
    case "HOOD-C-FH664621E":
      return translate(
        "configurator.catalogItemNames.chimneyExtractorHood",
        language === "de" ? "Schrägesse + Filter" : "Angled extractor hood + Filter",
      );
    case "LIGHT-B-LED-001":
    case "LIGHT-C-LED-001":
      return translate("configurator.catalogItemNames.ledLightingSet", "LED Lighting Set");
    case "WM-B-EWA34660W":
    case "WM-C-EWA34660W":
      return withDimensions(translate("configurator.catalogItemNames.washingMachine", "Washing machine"));
    case "SINKBASE-B-600":
    case "SINKBASE-AB105806-600":
    case "SINKBASE-AB105807-600":
    case "SINK-BASE-AB105845-600":
    case "SINK-BASE-AB105847-600":
    case "SINKBASE-AB105831-DEFAULT":
    case "SINKBASE-AB104968-DEFAULT":
    case "SINKBASE-AB105746-DEFAULT":
    case "SINKBASE-AB105749-DEFAULT":
    case "SINKBASE-AB105752-DEFAULT":
    case "SINKBASE-AB105755-DEFAULT":
    case "SINKBASE-C-600":
      return withDimensions(translate("configurator.catalogItemNames.sinkBaseCabinet", "Sink Lower Cabinet"));
    case "SINKBASE-LS-600":
      return translate("configurator.catalogItemNames.sinkBaseCabinet", "Sink Lower Cabinet");
    case "DISH-AB105845-450":
    case "DISH-AB105847-450":
    case "DISH-B-600-STD":
    case "DISH-AB105806-600":
    case "DISH-AB105807-600":
    case "DISH-AB105732-600":
    case "DISH-AB105815-600":
    case "DISH-AB105819-600":
    case "DISH-AB105821-600":
    case "DISH-AB105822-600":
    case "DISH-AB105827-600":
    case "DISH-AB105833-600":
    case "DISH-AB105836-600":
    case "DISH-AB105842-600":
    case "DISH-AB105834-600":
    case "DISH-AB105837-600":
    case "DISH-AB105840-600":
    case "DISH-AB105843-600":
    case "DISH-AB105825-600":
    case "DISH-AB105828-600":
    case "DISH-AB105831-600":
    case "DISH-AB105743-600":
    case "DISH-AB104968-600":
    case "DISH-AB105746-600":
    case "DISH-AB105749-600":
    case "DISH-AB105752-600":
    case "DISH-AB105755-600":
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
    case "REF-AB105847-KGCN388140E":
    case "REF-AB105825-KGCN388140E":
    case "REF-AB105828-KGCN388140E":
    case "REF-AB104968-KGCN388140E":
    case "REF-AB105746-KGCN388140E":
    case "REF-AB105749-KGCN388140E":
    case "REF-AB105752-KGCN388140E":
    case "REF-AB105755-KGCN388140E":
    case "REF-C-545-1800-700":
    case "REF-545-1800-700":
      return withRefrigeratorHeight(rawName || translate("configurator.catalogItemNames.refrigerator", "Freestanding refrigerator"));
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
    case "CAB-HOOD-AB105732-600":
    case "CAB-HOOD-AB105837-600":
    case "CAB-HOOD-AB105840-600":
    case "CAB-HOOD-AB105843-600":
    case "CAB-HOOD-AB105825-600":
    case "CAB-HOOD-AB105828-600":
    case "CAB-HOOD-AB105831-600":
    case "CAB-HOOD-AB105743-600":
    case "CAB-HOOD-AB104968-600":
    case "CAB-HOOD-AB105746-600":
    case "CAB-HOOD-AB105757-600":
      return translate("configurator.catalogItemInfo.lightHoodSetup", "HD6002, light hood setup");
    case "HOOD-B-FH664621E":
    case "HOOD-AB105806-FH664621E":
    case "HOOD-AB105807-FH664621E":
    case "HOOD-AB105732-FH664621E":
    case "HOOD-AB105837-FH664621E":
    case "HOOD-AB105840-FH664621E":
    case "HOOD-AB105843-FH664621E":
    case "HOOD-AB105825-FH664621E":
    case "HOOD-AB105828-FH664621E":
    case "HOOD-AB105831-FH664621E":
    case "HOOD-AB105743-FH664621E":
    case "HOOD-AB104968-FH664621E":
    case "HOOD-AB105746-FH664621E":
    case "HOOD-AB105757-FH664621E":
    case "T3D-HOOD-001":
    case "HOOD-AB105845-FH664621E":
      return translate("configurator.catalogItemInfo.flatPullOutHood", "Flat pull-out hood, 60 cm");
    case "HOOD-C-FH664621E":
      return translate("configurator.catalogItemInfo.chimneyHood", "Chimney hood, 60 cm");
    case "LIGHT-B-LED-001":
    case "LIGHT-C-LED-001":
    case "T3D-LIGHT-001":
      return translate("configurator.catalogItemInfo.ledLightingSet", "LED lighting set");
    case "WM-B-EWA34660W":
    case "WM-C-EWA34660W":
    case "T3D-WASHER-001":
      return translate("configurator.catalogItemInfo.washingMachine", "Washing machine, 8 kg, 1400 rpm");
    case "SINKBASE-B-600":
    case "SINKBASE-AB105806-600":
    case "SINKBASE-AB105807-600":
    case "SINK-BASE-AB105845-600":
    case "SINKBASE-AB105831-DEFAULT":
    case "SINKBASE-AB104968-DEFAULT":
    case "SINKBASE-AB105746-DEFAULT":
    case "SINKBASE-AB105757-DEFAULT":
    case "SINKBASE-C-600":
    case "T3D-SINKBASE-001":
      return translate("configurator.catalogItemInfo.defaultSinkBaseCabinet", "Default sink base cabinet");
    case "SINKBASE-LS-600":
      return translate("configurator.catalogItemInfo.us30SinkBaseCabinet", "US30, sink base cabinet");
    case "DISH-AB105845-450":
      return translate("configurator.catalogItemInfo.integratedDishwasher", "Fully integrated dishwasher, 45 cm");
    case "DISH-B-600-STD":
    case "DISH-AB105806-600":
    case "DISH-AB105807-600":
    case "DISH-AB105732-600":
    case "DISH-AB105815-600":
    case "DISH-AB105819-600":
    case "DISH-AB105821-600":
    case "DISH-AB105822-600":
    case "DISH-AB105827-600":
    case "DISH-AB105833-600":
    case "DISH-AB105836-600":
    case "DISH-AB105842-600":
    case "DISH-AB105834-600":
    case "DISH-AB105837-600":
    case "DISH-AB105840-600":
    case "DISH-AB105843-600":
    case "DISH-AB105825-600":
    case "DISH-AB105828-600":
    case "DISH-AB105831-600":
    case "DISH-AB105743-600":
    case "DISH-AB104968-600":
    case "DISH-AB105746-600":
    case "DISH-AB105757-600":
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
    case "REF-AB104968-KGCN388140E":
    case "REF-AB105746-KGCN388140E":
    case "REF-AB105757-KGCN388140E":
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
  "burger-103898": [[
    "component-wall-cabinet-2",
    "component-extractor-hood",
    "component-under-cabinet-light",
  ]],
  "ab-105845": [["component-wall-cabinet-3", "component-extractor-hood"]],
  "ab-105848": [["component-wall-cabinet-3", "component-extractor-hood"]],
  "ab-105851": [["component-wall-cabinet-3", "component-extractor-hood"]],
  "ab-105854": [["component-wall-cabinet-3", "component-extractor-hood"]],
  "ab-105857": [["component-wall-cabinet-3", "component-extractor-hood"]],
  "ab-105860": [["component-wall-cabinet-3", "component-extractor-hood"]],
  "ab-105847": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105850": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105853": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105856": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105859": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105862": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105744": [["component-wall-cabinet-2", "component-extractor-hood"]],
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
  "ab-105732": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105735": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105738": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105741": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105733": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105736": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105739": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105742": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105821": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105824": [["component-wall-cabinet-4", "component-extractor-hood"]],
  "ab-105822": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105823": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105829": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105832": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105837": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105840": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105843": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105747": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105750": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105753": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105756": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105825": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105828": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105831": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105743": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105748": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105846": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105849": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105852": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105855": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105858": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105861": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105751": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105754": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105745": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105758": [[
    "component-wall-cabinet-2",
    "component-extractor-hood",
    "component-under-cabinet-light",
  ]],
  "ab-104968": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105746": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105757": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105749": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105752": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105755": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105734": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105737": [["component-wall-cabinet-2", "component-extractor-hood"]],
  "ab-105740": [["component-wall-cabinet-2", "component-extractor-hood"]],
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

const FLAT_HOOD_PRODUCT_INFO_PDF_HREF = "/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf";
const FLAT_HOOD_PRODUCT_INFO_DOCUMENTS = [
  { label: "Produktinfo PDF", href: FLAT_HOOD_PRODUCT_INFO_PDF_HREF },
];
const FRIDGE_PRODUCT_INFO_PDF_HREF = "/product-info/refrigerators/kgcn388140e/kgcn388140e-product-info.pdf";
const FRIDGE_PRODUCT_INFO_DOCUMENTS = [
  { label: "Produktinfo PDF", href: FRIDGE_PRODUCT_INFO_PDF_HREF },
];

const STRUCTURED_PRODUCT_INFO_PATHS = {
  "/product-info/a-egspv597210-elabel-eco21-2601.pdf": "/product-info/dishwashers/a-egspv597210/a-egspv597210-elabel.pdf",
  "/product-info/a-egspv597210-product-info-eco21.pdf": "/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info.pdf",
  "/product-info/dishwasher-product-info.pdf": "/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info.pdf",
  "/product-info/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf": "/product-info/refrigerators/kgcn388140e/kgcn388140e-product-info.pdf",
  "/product-info/fridge-product-info.pdf": "/product-info/refrigerators/kgcn388140e/kgcn388140e-product-info.pdf",
  "/product-info/kgc-15495-s-product-info-eco21.pdf": "/product-info/refrigerators/kgcn388140e/kgcn388140e-product-info.pdf",
  "/product-info/extractor-hood-flat-product-info.pdf": "/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf",
  "/product-info/extractor-hoods/fh664621s/extractor-hood-flat-product-info.pdf": "/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf",
  "/product-info/fh-664-621-s-elabel-eco21-2512.pdf": "/product-info/extractor-hoods/fh664621s/fh664621s-elabel.pdf",
  "/product-info/fh-664-621-s-product-info.pdf": "/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf",
  "/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf": "/product-info/extractor-hoods/khf664611s/khf664611s-product-info.pdf",
  "/product-info/khf-664-611-s-elabel-eco21-2407.pdf": "/product-info/extractor-hoods/khf664611s/khf664611s-elabel.pdf",
  "/product-info/ewa-34660-w-elabel-eco21-2601.pdf": "/product-info/washing-machines/ewa34660w/ewa34660w-elabel.pdf",
  "/product-info/ewa-34660-w-product-info.pdf": "/product-info/washing-machines/ewa34660w/ewa34660w-product-info.pdf",
  "/product-info/ebx-943-600-s-elabel-1901.pdf": "/product-info/ovens/ebx943600s/ebx943600s-elabel.pdf",
  "/product-info/ebx-943-600-s-product-info.pdf": "/product-info/ovens/ebx943600s/ebx943600s-product-info.pdf",
  "/product-info/ol-kmi-754-000-e-product-info.pdf": "/product-info/hobs/ol-kmi754000e/ol-kmi754000e-product-info.pdf",
  "/product-info/led-lighting-set-elabel.pdf": "/product-info/lighting/led-set/led-set-elabel.pdf",
};

function getStructuredProductInfoPath(href) {
  const value = String(href || "");
  const [assetPath, fragment] = value.split("#", 2);
  const structuredPath = STRUCTURED_PRODUCT_INFO_PATHS[assetPath] || assetPath;
  return fragment ? `${structuredPath}#${fragment}` : structuredPath;
}

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
    ...FRIDGE_PRODUCT_INFO_DOCUMENTS,
  ],
  "REF-C-545-1800-700": [
    ...FRIDGE_PRODUCT_INFO_DOCUMENTS,
  ],
  "REF-AB105806-KGCN388140E": [
    ...FRIDGE_PRODUCT_INFO_DOCUMENTS,
  ],
  "REF-AB105807-KGCN388140E": [
    ...FRIDGE_PRODUCT_INFO_DOCUMENTS,
  ],
  "REF-AB105819-KGCN388140E": [
    ...FRIDGE_PRODUCT_INFO_DOCUMENTS,
  ],
  "REF-AB105821-KGCN388140E": [
    ...FRIDGE_PRODUCT_INFO_DOCUMENTS,
  ],
  "REF-AB105811-KGCN388140E": [
    ...FRIDGE_PRODUCT_INFO_DOCUMENTS,
  ],
  "REF-AB105815-KGCN388140E": [
    ...FRIDGE_PRODUCT_INFO_DOCUMENTS,
  ],
  "HOOD-B-FH664621E": [
    ...FLAT_HOOD_PRODUCT_INFO_DOCUMENTS,
  ],
  "HOOD-LS-FH664621E": [
    ...FLAT_HOOD_PRODUCT_INFO_DOCUMENTS,
  ],
  "HOOD-AB105806-FH664621E": [
    ...FLAT_HOOD_PRODUCT_INFO_DOCUMENTS,
  ],
  "HOOD-AB105807-FH664621E": [
    ...FLAT_HOOD_PRODUCT_INFO_DOCUMENTS,
  ],
  "HOOD-AB105837-FH664621E": [
    ...FLAT_HOOD_PRODUCT_INFO_DOCUMENTS,
  ],
  "HOOD-C-FH664621E": [
    { label: "E-Label PDF", href: "/product-info/khf-664-611-s-elabel-eco21-2407.pdf" },
    { label: "Produktinfo PDF", href: "/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf" },
  ],
  "T3D-HOOD-001": [
    ...FLAT_HOOD_PRODUCT_INFO_DOCUMENTS,
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

["105751", "105754", "105745"].forEach((targetCode) => {
  Object.entries(AB_105806_PHOTO_NUMBER_BY_CODE)
    .filter(([sourceCode]) => sourceCode.includes("AB105748"))
    .forEach(([sourceCode, photoNumber]) => {
      AB_105806_PHOTO_NUMBER_BY_CODE[sourceCode.replace("AB105748", `AB${targetCode}`)] = photoNumber;
    });
});

PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-AB105743-600"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-B-600-STD"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-AB105743-KGCN388140E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-AB105743-FH664621E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-AB105758-600"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-B-600-STD"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-AB105758-KGCN388140E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-AB105758-FH664621E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-AB105846-600"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-B-600-STD"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-AB105846-KGCN388140E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-AB105846-FH664621E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-AB105847-450"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-AB105845-450"] || PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-B-600-STD"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-AB105847-KGCN388140E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-AB105847-FH664621E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["CAB-HOOD-AB105847-600"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-B-FH664621E"];

PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-AB105732-600"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-B-600-STD"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-AB105732-FH664621E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-BURGER103898-600"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["DISH-B-600-STD"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-BURGER103898-KGCN388140E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-BURGER103898-FH664621E"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_DOCUMENTS_BY_CODE["CAB-HOOD-BURGER103898-600"] = PRODUCT_INFO_DOCUMENTS_BY_CODE["HOOD-B-FH664621E"];

Object.values(PRODUCT_INFO_DOCUMENTS_BY_CODE).forEach((documents) => {
  documents.forEach((document) => {
    document.href = getStructuredProductInfoPath(document.href);
  });
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
  const mappedDocuments = PRODUCT_INFO_DOCUMENTS_BY_CODE[item?.code];
  const documents = Array.isArray(mappedDocuments) && mappedDocuments.length
    ? mappedDocuments
    : getMappedProductInfoDocuments(item);
  const defaultDocument =
    documents.find((document) => String(document?.label || "").toLowerCase().includes("produktinfo")) ||
    documents[0];

  return defaultDocument?.href || getStructuredProductInfoPath(item?.productInfoPdfPath) || "";
}

function getMappedProductInfoDocuments(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const articleNumber = String(item?.articleNumber || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  const name = `${item?.name || ""} ${item?.nameDe || ""}`.toLowerCase();
  const haystack = `${code} ${articleNumber} ${iconKey} ${componentKey} ${name}`;

  if (
    code.startsWith("REF-") ||
    articleNumber.includes("KGCN388140E") ||
    articleNumber.includes("KGC15495") ||
    iconKey.includes("refrigerator") ||
    iconKey.includes("fridge") ||
    componentKey.includes("refrigerator") ||
    haystack.includes("refrigerator") ||
    haystack.includes("fridge") ||
    haystack.includes("kuehlschrank") ||
    haystack.includes("kühlschrank")
  ) {
    return FRIDGE_PRODUCT_INFO_DOCUMENTS;
  }

  if (
    articleNumber.includes("FH664621E + FWK124 + HD6002") ||
    articleNumber.includes("FH664621E + HD6002") ||
    /FH 664 621 [SE]/.test(articleNumber) ||
    code.includes("FH664621E") ||
    code.startsWith("CAB-HOOD-") ||
    code === "HOOD-B-FH664621E" ||
    code === "HOOD-LS-FH664621E" ||
    code === "T3D-HOOD-001" ||
    iconKey.includes("hood") ||
    componentKey.includes("extractor") ||
    haystack.includes("flachschirmhaube") ||
    haystack.includes("flat screen extractor hood")
  ) {
    return FLAT_HOOD_PRODUCT_INFO_DOCUMENTS;
  }

  return [];
}

export function getProductInfoDocuments(item) {
  const mappedDocuments = PRODUCT_INFO_DOCUMENTS_BY_CODE[item?.code];
  if (Array.isArray(mappedDocuments) && mappedDocuments.length) {
    return mappedDocuments;
  }

  const inferredDocuments = getMappedProductInfoDocuments(item);
  if (inferredDocuments.length) {
    return inferredDocuments;
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

export function getAutoLinkedAccessoryCodes(slug, selectedComponentIds = []) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (
    ["ab-105758", "burger-103898"].includes(normalizedSlug)
    && selectedComponentIds.includes("component-extractor-hood")
  ) {
    return ["ACC-LIGHT-003"];
  }
  return [];
}

export function isHiddenLinkedComponent(slug, componentId) {
  const linkedIds = getLinkedComponentIds(slug, componentId);
  return linkedIds.length > 1 && linkedIds[0] !== componentId;
}

export function isLinkedComponentSelected(slug, selectedIds, componentId) {
  // The stage and toggle behavior treat a linked group as selected as soon as one member is
  // present. Matching that rule here prevents a stale draft with only the visible hood cabinet
  // from rendering selected in the plan but unselected in the catalog.
  return getLinkedComponentIds(slug, componentId).some((id) => selectedIds.includes(id));
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

const KGCN388140E_GALLERY = Array.from(
  { length: 7 },
  (_, index) => `/product-images/gallery/kgcn388140e/kgcn388140e-${String(index + 1).padStart(2, "0")}.webp?v=1193783`,
);

const PRODUCT_IMAGE_GALLERIES_BY_CODE = {
  "DISH-BURGER103898-600": ["/product-images/gallery/burger-103898/dishwasher/a-egspv597210-01.jpg"],
  "DISH-AB105743-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
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
  "DISH-AB105845-450": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105834-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105837-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105825-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105828-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105831-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB104968-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105746-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
  "DISH-AB105757-600": Array.from({ length: 20 }, (_, index) => `/product-images/gallery/a-egspv597210-dishwasher/${String(index + 1).padStart(2, "0")}.webp`),
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
  "HOOD-BURGER103898-FH664621E": ["/product-images/gallery/burger-103898/extractor-hood/fh664621e-01.jpg"],
  "CAB-HOOD-BURGER103898-HFLH6072": ["/product-images/gallery/burger-103898/extractor-hood/fh664621e-01.jpg"],
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
  "HOOD-AB105743-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105743-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105758-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105758-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB104968-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB104968-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105746-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105746-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-AB105757-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105757-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "HOOD-C-FH664621E": ["/product-images/gallery/khf664611s-chimney-hood/01.jpg"],
  "HOOD-AB105845-FH664621E": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "CAB-HOOD-AB105845-600": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "T3D-HOOD-001": ["/product-images/gallery/fh664621s-flat-hood/01.webp"],
  "REF-545-1800-700": KGCN388140E_GALLERY,
  "REF-BURGER103898-KGCN388140E": [
    "/product-images/gallery/burger-103898/fridge/ol-kgcn388140e-01.jpg",
    "/product-images/gallery/burger-103898/fridge/ol-kgcn388140e-02.jpg",
  ],
  "REF-B-545-1800-700": KGCN388140E_GALLERY,
  "REF-C-545-1800-700": KGCN388140E_GALLERY,
  "REF-AB105806-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105807-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105819-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105821-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105841-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105845-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105825-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105822-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105828-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105831-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105743-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105758-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB104968-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105746-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105757-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105811-KGCN388140E": KGCN388140E_GALLERY,
  "REF-AB105815-KGCN388140E": KGCN388140E_GALLERY,
  "WM-B-EWA34660W": Array.from({ length: 8 }, (_, index) => `/product-images/gallery/ewa34660w-washing-machine/${String(index + 1).padStart(2, "0")}.webp`),
  "WM-C-EWA34660W": Array.from({ length: 8 }, (_, index) => `/product-images/gallery/ewa34660w-washing-machine/${String(index + 1).padStart(2, "0")}.webp`),
  "T3D-WASHER-001": Array.from({ length: 8 }, (_, index) => `/product-images/gallery/ewa34660w-washing-machine/${String(index + 1).padStart(2, "0")}.webp`),
};

["105840", "105843"].forEach((targetCode) => {
  ["DISH-AB105837-600", "HOOD-AB105837-FH664621E", "CAB-HOOD-AB105837-600"].forEach((sourceCode) => {
    PRODUCT_IMAGE_GALLERIES_BY_CODE[sourceCode.replace("AB105837", `AB${targetCode}`)] =
      PRODUCT_IMAGE_GALLERIES_BY_CODE[sourceCode];
  });
});

["105749", "105752", "105755"].forEach((targetCode) => {
  [
    "DISH-AB105746-600",
    "REF-AB105746-KGCN388140E",
    "HOOD-AB105746-FH664621E",
    "CAB-HOOD-AB105746-600",
  ].forEach((sourceCode) => {
    PRODUCT_IMAGE_GALLERIES_BY_CODE[sourceCode.replace("AB105746", `AB${targetCode}`)] =
      PRODUCT_IMAGE_GALLERIES_BY_CODE[sourceCode];
  });
});

PRODUCT_IMAGE_GALLERIES_BY_CODE["DISH-AB105732-600"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["DISH-B-600-STD"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["HOOD-AB105732-FH664621E"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["CAB-HOOD-AB105732-600"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["DISH-AB105846-600"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["DISH-B-600-STD"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["REF-AB105846-KGCN388140E"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["REF-B-545-1800-700"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["HOOD-AB105846-FH664621E"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["CAB-HOOD-AB105846-600"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["DISH-AB105847-450"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["DISH-AB105845-450"] || PRODUCT_IMAGE_GALLERIES_BY_CODE["DISH-B-600-STD"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["REF-AB105847-KGCN388140E"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["REF-B-545-1800-700"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["HOOD-AB105847-FH664621E"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_IMAGE_GALLERIES_BY_CODE["CAB-HOOD-AB105847-600"] = PRODUCT_IMAGE_GALLERIES_BY_CODE["HOOD-B-FH664621E"];

export function getProductImagePaths(item) {
  if (Array.isArray(item?.productImagePaths) && item.productImagePaths.length) {
    return item.productImagePaths.filter(Boolean);
  }
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

function getCatalogProductInfoDocuments(item, slug) {
  const directPath = String(item?.productInfoPdfPath || "").trim();
  if (String(slug || "").trim().toLowerCase() === "burger-103898" && directPath.includes("/burger-103898/")) {
    return [{ label: "Product information PDF", href: directPath }];
  }
  return getProductInfoDocuments(item);
}

function getCatalogProductInfoHref(item, slug) {
  return getCatalogProductInfoDocuments(item, slug).at(-1)?.href || "";
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
        productInfoDocuments: getCatalogProductInfoDocuments(displayItem, normalizedSlug),
      },
      price: Number(displayItem.price || 0),
      infoPdfHref: getCatalogProductInfoHref(displayItem, normalizedSlug),
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
      productInfoDocuments: getCatalogProductInfoDocuments(infoSource || primaryItem, normalizedSlug),
      tooltipPreviewCode: infoSource?.code || primaryItem.code,
      assistantHoverExtractorHoodOnly,
    },
    price: Number((hoodItem || primaryItem).price || 0),
    infoPdfHref: getCatalogProductInfoHref(hoodItem, normalizedSlug) || getCatalogProductInfoHref(primaryItem, normalizedSlug),
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
