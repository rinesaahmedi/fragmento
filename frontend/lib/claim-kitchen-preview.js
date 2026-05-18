import sharp from "sharp";
import { componentIdForItem } from "../components/kitchen-selection-utils.js";
import { getKitchenBySlug, serializeKitchenForLegacy } from "./catalog.js";
import { loadKitchenSvgMarkup } from "./load-kitchen-svg.js";
import { parseServiceClaimProblemAreas } from "./service-claim-problem-areas.js";

export const PREVIEW_HIGHLIGHT_BOUNDS_BY_SLUG = {
  "kitchen-model-b": {
    "wall-cabinet-1": { x: 239, y: 214, width: 84, height: 118 },
    "wall-cabinet-2": { x: 322, y: 214, width: 84, height: 118 },
    "wall-cabinet-3": { x: 405, y: 214, width: 84, height: 118 },
    "wall-cabinet-4": { x: 488, y: 214, width: 84, height: 118 },
    "wall-cabinet-5": { x: 571, y: 214, width: 84, height: 118 },
    "extractor-hood": { x: 488, y: 314, width: 84, height: 14 },
    "under-cabinet-light": { x: 270, y: 319, width: 287, height: 18 },
    "base-module-1": { x: 237, y: 393, width: 86, height: 127 },
    "base-module-2": { x: 322, y: 393, width: 84, height: 127 },
    "base-module-3": { x: 405, y: 393, width: 84, height: 127 },
    "oven-module": { x: 488, y: 393, width: 84, height: 127 },
    "drawer-module": { x: 571, y: 393, width: 84, height: 127 },
    refrigerator: { x: 670, y: 270, width: 76, height: 250 },
    "sink-faucet": { x: 374, y: 364, width: 14, height: 33 },
    worktop: { x: 236, y: 392, width: 421, height: 7 },
  },
  "kitchen-model-c": {
    refrigerator: { x: 119, y: 220, width: 70, height: 220 },
    "extractor-hood": { x: 276, y: 189, width: 68, height: 48 },
    "wall-cabinet-1": { x: 470, y: 185, width: 72, height: 72 },
    "wall-cabinet-2": { x: 542, y: 185, width: 72, height: 72 },
    "wall-cabinet-3": { x: 614, y: 185, width: 72, height: 72 },
    "wall-cabinet-4": { x: 686, y: 185, width: 72, height: 72 },
    "under-cabinet-light": { x: 534, y: 262, width: 160, height: 15 },
    "cook-base-left": { x: 205, y: 338, width: 70, height: 97 },
    "oven-base": { x: 275, y: 338, width: 70, height: 97 },
    "cook-base-right": { x: 345, y: 338, width: 70, height: 97 },
    "wm-base": { x: 470, y: 338, width: 72, height: 97 },
    "sink-base": { x: 542, y: 338, width: 72, height: 97 },
    "dishwasher-base": { x: 614, y: 338, width: 72, height: 97 },
    "drawer-base-3": { x: 686, y: 338, width: 72, height: 97 },
    worktop: { x: 205, y: 338, width: 553, height: 3 },
    "sink-faucet": { x: 569, y: 302, width: 18, height: 28 },
  },
};

function normalizeKitchenSlug(kitchenSlug) {
  return String(kitchenSlug || "").trim().toLowerCase();
}

export function enhanceKitchenPreviewSvgMarkup(markup) {
  if (!markup) return "";

  return String(markup).replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    if (/style=/i.test(attrs)) {
      return `<svg${attrs.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, value) => ` style=${quote}${value};width:100%;height:auto;display:block${quote}`)}>`;
    }

    return `<svg${attrs} style="width:100%;height:auto;display:block">`;
  });
}

function buildHighlightMarkup(bounds) {
  return [
    `<rect x="${bounds.x - 3}" y="${bounds.y - 3}" width="${bounds.width + 6}" height="${bounds.height + 6}"`,
    ` rx="8" ry="8" fill="rgba(176, 90, 50, 0.08)" stroke="#8f3e2c" stroke-width="2.5"`,
    ` vector-effect="non-scaling-stroke" pointer-events="none"/>`,
  ].join("");
}

export function buildKitchenPreviewSvgMarkup({ svgMarkup, kitchenSlug, highlightedComponentKeys = [] }) {
  const baseMarkup = enhanceKitchenPreviewSvgMarkup(svgMarkup);
  if (!baseMarkup) return "";

  const boundsByKey = PREVIEW_HIGHLIGHT_BOUNDS_BY_SLUG[normalizeKitchenSlug(kitchenSlug)] || {};
  const highlightMarkup = [...new Set(highlightedComponentKeys.map((key) => String(key || "").trim()).filter(Boolean))]
    .map((key) => boundsByKey[key])
    .filter(Boolean)
    .map(buildHighlightMarkup)
    .join("");

  if (!highlightMarkup) {
    return baseMarkup;
  }

  return baseMarkup.replace("</svg>", `${highlightMarkup}</svg>`);
}

export function resolveClaimPreviewComponentKeys({ selectedAreas = [], kitchenConfig = null }) {
  const components = Array.isArray(kitchenConfig?.components) ? kitchenConfig.components : [];
  const componentById = new Map(components.map((item) => [componentIdForItem(item), item]));
  const componentByCode = new Map(
    components
      .map((item) => [String(item.code || "").trim().toUpperCase(), item])
      .filter(([code]) => code),
  );

  return selectedAreas
    .map((area) => {
      const explicitKey = String(area?.componentKey || "").trim();
      if (explicitKey) {
        return explicitKey;
      }

      const componentId = String(area?.componentId || "").trim();
      if (componentId && componentById.has(componentId)) {
        return String(componentById.get(componentId)?.componentKey || "").trim();
      }

      const code = String(area?.code || "").trim().toUpperCase();
      if (code && componentByCode.has(code)) {
        return String(componentByCode.get(code)?.componentKey || "").trim();
      }

      return "";
    })
    .filter(Boolean);
}

async function loadClaimKitchenPreviewContext(kitchenSlug) {
  const normalizedSlug = normalizeKitchenSlug(kitchenSlug);
  if (!normalizedSlug) {
    return null;
  }

  const kitchen = await getKitchenBySlug(normalizedSlug);
  if (!kitchen) {
    return null;
  }

  const kitchenConfig = serializeKitchenForLegacy(kitchen);
  const svgMarkup = await loadKitchenSvgMarkup(normalizedSlug).catch(() => "");
  if (!svgMarkup) {
    return null;
  }

  return {
    kitchen,
    kitchenConfig,
    svgMarkup,
  };
}

export async function renderClaimKitchenPreviewSvg({ kitchenSlug, selectedAreas = [] }) {
  const context = await loadClaimKitchenPreviewContext(kitchenSlug);
  if (!context) {
    return null;
  }

  const normalizedAreas = Array.isArray(selectedAreas)
    ? selectedAreas
    : parseServiceClaimProblemAreas(selectedAreas);
  const highlightedComponentKeys = resolveClaimPreviewComponentKeys({
    selectedAreas: normalizedAreas,
    kitchenConfig: context.kitchenConfig,
  });
  const markup = buildKitchenPreviewSvgMarkup({
    svgMarkup: context.svgMarkup,
    kitchenSlug,
    highlightedComponentKeys,
  });

  return markup
    ? {
        markup,
        highlightedComponentKeys,
        kitchenName: context.kitchen?.name || "",
        kitchenSlug: normalizeKitchenSlug(kitchenSlug),
      }
    : null;
}

export async function renderClaimKitchenPreviewPng({ kitchenSlug, selectedAreas = [], width = 900 }) {
  const preview = await renderClaimKitchenPreviewSvg({ kitchenSlug, selectedAreas });
  if (!preview?.markup) {
    return null;
  }

  const content = await sharp(Buffer.from(preview.markup)).resize({ width }).png().toBuffer();
  return {
    ...preview,
    content,
    contentType: "image/png",
  };
}
