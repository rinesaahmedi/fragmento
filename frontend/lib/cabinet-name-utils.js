const LOWER_CABINET_ICON_KEYS = new Set([
  "base_cabinet_30",
  "drawer_base",
  "drawer_base_two",
  "drawer_base_three",
]);

const UPPER_CABINET_ICON_KEYS = new Set([
  "wall_cabinet_l",
  "wall_cabinet_plain",
  "wall_cabinet_r",
  "wall_cabinet_standard",
]);

const EXCLUDED_CABINET_CODE_PREFIXES = [
  "CAB-HOOD-",
  "HOOD-",
  "DISH-",
  "LIGHT-",
  "OVEN-",
  "REF-",
  "SINKBASE-",
  "TOP-",
  "WM-",
];

const EXCLUDED_CABINET_ICON_KEYS = new Set([
  "dishwasher_base",
  "extractor_hood",
  "hood",
  "oven_base",
  "tall_refrigerator",
  "under_cabinet_light",
  "washing_machine_base",
  "worktop",
]);

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCode(value) {
  return normalizeText(value).toUpperCase();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function firstPositiveNumber(values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }
  return null;
}

function extractWidthFromText(value) {
  const text = normalizeText(value);
  if (!text) return null;

  const patterns = [
    /\b(?:US|H)(?:2A)?(\d{2})(?:\d{2})?\b/i,
    /\b(\d{3})\s*(?:x|\u00d7|\/)\s*\d{2,4}\b/i,
    /\b(?:width|breite)\D{0,12}(\d{3})\b/i,
    /\b(\d{3})\s*mm\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (!Number.isFinite(value) || value <= 0) continue;
    return value < 100 ? value * 10 : value;
  }

  return null;
}

function extractWidthFromCode(value) {
  const code = normalizeCode(value);
  if (!code) return null;

  const patterns = [
    /(?:^|[-_])(?:TOP|BOTTOM)[-_]?(\d{3})(?:$|[-_])/,
    /(?:^|[-_])(\d{3})(?:$|[-_])/,
    /(?:^|[-_])US(?:2A)?(\d{2})(?:$|[-_])/,
    /(?:^|[-_])H(\d{2})\d{2}(?:$|[-_])/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (!Number.isFinite(value) || value <= 0) continue;
    return value < 100 ? value * 10 : value;
  }

  return null;
}

export function getCabinetWidthMm(item) {
  return firstPositiveNumber([
    item?.widthMm,
    extractWidthFromCode(item?.code),
    extractWidthFromText(item?.name),
    extractWidthFromText(item?.infoText),
    extractWidthFromText(item?.articleNumber),
  ]);
}

export function getCabinetKind(item) {
  const code = normalizeCode(item?.code);
  const iconKey = normalizeKey(item?.iconKey);
  const componentKey = normalizeKey(item?.componentKey);
  const name = normalizeKey(item?.name);

  if (!code && !iconKey && !componentKey && !name) return null;
  if (EXCLUDED_CABINET_CODE_PREFIXES.some((prefix) => code.startsWith(prefix))) return null;
  if (EXCLUDED_CABINET_ICON_KEYS.has(iconKey)) return null;
  if (code.startsWith("CAB-BASE-")
    || code.startsWith("CAB-COOK-")
    || code.startsWith("CAB-DRAWER-")
    || code.startsWith("LKNEW-BOTTOM-")
    || code.startsWith("T3D-CAB-BASE-")
    || code.startsWith("T3D-CAB-CORNER-")
    || code.startsWith("T3D-CAB-DRAWERS-")
    || code.startsWith("T3D-CAB-STORAGE-")
    || LOWER_CABINET_ICON_KEYS.has(iconKey)) {
    return "lower";
  }

  if (code.startsWith("CAB-WALL-")
    || code.startsWith("LKNEW-TOP-")
    || code.startsWith("T3D-CAB-WALL-")
    || UPPER_CABINET_ICON_KEYS.has(iconKey)
    || componentKey.includes("wall-cabinet")) {
    return "upper";
  }

  if (/^(base cabinet|sink base cabinet|drawer base cabinet|return base cabinet|corner base cabinet)\b/.test(name)) {
    return "lower";
  }
  if (/^wall cabinet\b/.test(name)) {
    return "upper";
  }

  return null;
}

export function formatCabinetWidthLabel(kind, widthMm, language = "en") {
  if (!kind || !Number.isFinite(Number(widthMm)) || Number(widthMm) <= 0) return "";
  const widthCm = Number(widthMm) / 10;
  const widthLabel = Number.isInteger(widthCm)
    ? String(widthCm)
    : String(Number(widthCm.toFixed(2))).replace(/\.0+$/, "");
  if (language === "de") {
    return kind === "lower" ? `Unterschrank mit Schublade ${widthLabel}` : `Oberschrank ${widthLabel}`;
  }
  return kind === "lower"
    ? `Lower cabinet with drawer ${widthLabel}`
    : `Upper cabinet ${widthLabel}`;
}

export function getCabinetWidthDisplayName(item, language = "en") {
  const kind = getCabinetKind(item);
  if (!kind) return "";
  return formatCabinetWidthLabel(kind, getCabinetWidthMm(item), language);
}
