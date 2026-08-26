import {
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
  PLAN_IMAGE_SOURCE_SIZE_BY_SLUG,
} from "./kitchen-plan-preview-data.js";

const PLAN_IMAGE_SOURCE_WIDTH = 842;
const PLAN_IMAGE_SOURCE_HEIGHT = 595;
const WALL_CABINET_COMPONENT_KEY_PATTERN = /^wall-cabinet-\d+$/;
const BASE_BODY_COMPONENT_KEYS = new Set([
  "base-module-1",
  "base-module-2",
  "base-module-3",
  "oven-module",
  "sink-base",
  "drawer-module",
]);
const CORNER_BLENDE_MAX_WIDTH = 1.25;
const CORNER_BLENDE_MIN_HEIGHT = 15;
const CORNER_BLENDE_EDGE_TOLERANCE = 1.2;
const CORNER_BLENDE_VERTICAL_TOLERANCE = 0.35;
const PLAN_DISPLAY_CROP_TUNING_BY_SLUG = {
  "ab-105833": { bottomPadding: 4, bottomLimit: 84 },
  "ab-105842": { bottomPadding: 4.8 },
  "ab-105845": { bottomPadding: 4.8, leftPadding: 3, rightLimit: 100 },
  "ab-105848": { bottomPadding: 4.8, leftPadding: 3, rightLimit: 100 },
  "ab-105851": { bottomPadding: 4.8, leftPadding: 3, rightLimit: 100 },
  "ab-105854": { bottomPadding: 4.8, leftPadding: 3, rightLimit: 100 },
  "ab-105857": { bottomPadding: 4.8, leftPadding: 3, rightLimit: 100 },
  "ab-105860": { bottomPadding: 4.8, leftPadding: 3, rightLimit: 100 },
  "ab-105847": { topPadding: 7, bottomPadding: 3, leftPadding: 3, rightLimit: 73, bottomLimit: 70 },
  "ab-105850": { topPadding: 7, bottomPadding: 3, leftPadding: 3, rightLimit: 73, bottomLimit: 70 },
  "ab-105853": { topPadding: 7, bottomPadding: 3, leftPadding: 3, rightLimit: 73, bottomLimit: 70 },
  "ab-105856": { topPadding: 7, bottomPadding: 3, leftPadding: 3, rightLimit: 73, bottomLimit: 70 },
  "ab-105859": { topPadding: 7, bottomPadding: 3, leftPadding: 3, rightLimit: 73, bottomLimit: 70 },
  "ab-105862": { topPadding: 7, bottomPadding: 3, leftPadding: 3, rightLimit: 73, bottomLimit: 70 },
  "105845-modul-2": { bottomPadding: 4.8, leftPadding: 3, rightLimit: 100 },
  "ab-105836": { bottomPadding: 4.8 },
};

function normalizeSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function isBaseBodyHotspot(definition) {
  if (Array.isArray(definition.points) && definition.points.length) return false;
  if (definition.preserveManualSize) return false;
  if (BASE_BODY_COMPONENT_KEYS.has(definition.componentKey)) return true;
  return definition.componentKey === "worktop" && definition.height >= 15;
}

function isWallCabinetHotspot(definition) {
  return WALL_CABINET_COMPONENT_KEY_PATTERN.test(definition.componentKey);
}

function isHorizontalWorktopHotspot(definition) {
  return definition.componentKey === "worktop" && definition.width >= 5 && definition.height <= 2;
}

function isCornerBlendeHotspot(definition) {
  return (
    definition.componentKey === "worktop" &&
    definition.width > 0 &&
    definition.width <= CORNER_BLENDE_MAX_WIDTH &&
    definition.height >= CORNER_BLENDE_MIN_HEIGHT
  );
}

export function isPlanHighlightHotspot(hotspot) {
  if (isCornerBlendeHotspot(hotspot)) return false;

  if (hotspot.componentKey === "worktop") {
    const bounds = getHotspotSourceBounds(hotspot);
    // Vertical end-panel strips share the worktop component key but are not counter surfaces.
    if (bounds.height >= CORNER_BLENDE_MIN_HEIGHT && bounds.width <= CORNER_BLENDE_MAX_WIDTH + 0.2) {
      return false;
    }
    if (bounds.height > 10 && bounds.width < 2.5) {
      return false;
    }
  }

  return true;
}

function canExtendToCornerBlende(definition) {
  if (Array.isArray(definition.points) && definition.points.length) return false;
  if (definition.preserveManualSize) return false;
  return isWallCabinetHotspot(definition) || isBaseBodyHotspot(definition) || isHorizontalWorktopHotspot(definition);
}

function roundHotspotPercent(value) {
  return Math.round(value * 100) / 100;
}

export function getHotspotSourceBounds(definition) {
  const points = Array.isArray(definition.points) ? definition.points : [];
  if (points.length) {
    const xs = points.map((point) => Number(point[0])).filter(Number.isFinite);
    const ys = points.map((point) => Number(point[1])).filter(Number.isFinite);
    if (xs.length && ys.length) {
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const right = Math.max(...xs);
      const bottom = Math.max(...ys);
      return { left, top, right, bottom, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
    }
  }

  const left = Number(definition.left || 0);
  const top = Number(definition.top || 0);
  const width = Number(definition.width || 0);
  const height = Number(definition.height || 0);
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function withHotspotSourceBounds(definition) {
  if (!Array.isArray(definition.points) || !definition.points.length) return definition;
  const bounds = getHotspotSourceBounds(definition);
  return {
    ...definition,
    left: roundHotspotPercent(bounds.left),
    top: roundHotspotPercent(bounds.top),
    width: roundHotspotPercent(bounds.width),
    height: roundHotspotPercent(bounds.height),
  };
}

function verticallyOverlapsCornerBlende(definition, blende) {
  const bottom = definition.top + definition.height;
  const blendeBottom = blende.top + blende.height;
  return blendeBottom >= definition.top - CORNER_BLENDE_VERTICAL_TOLERANCE &&
    blende.top <= bottom + CORNER_BLENDE_VERTICAL_TOLERANCE;
}

function withCornerBlendeExtensions(definitions) {
  const cornerBlenden = definitions.filter(isCornerBlendeHotspot);
  if (!cornerBlenden.length) return definitions;

  return definitions.map((definition) => {
    if (!canExtendToCornerBlende(definition) || isCornerBlendeHotspot(definition)) return definition;
    let left = definition.left;
    let right = definition.left + definition.width;

    cornerBlenden.forEach((blende) => {
      const blendeLeft = blende.left;
      const blendeRight = blende.left + blende.width;
      if (!verticallyOverlapsCornerBlende(definition, blende)) return;
      if (blendeRight >= left - CORNER_BLENDE_EDGE_TOLERANCE && blendeRight <= left + CORNER_BLENDE_EDGE_TOLERANCE) {
        left = Math.min(left, blendeLeft);
      }
      if (blendeLeft >= right - CORNER_BLENDE_EDGE_TOLERANCE && blendeLeft <= right + CORNER_BLENDE_EDGE_TOLERANCE) {
        right = Math.max(right, blendeRight);
      }
    });

    const nextLeft = roundHotspotPercent(left);
    const nextWidth = roundHotspotPercent(right - left);
    return nextLeft === definition.left && nextWidth === definition.width
      ? definition
      : { ...definition, left: nextLeft, width: nextWidth };
  });
}

function withDerivedSinkFaucet(definitions, components) {
  if (!definitions.length) return definitions;
  const hasFaucetComponent = components.some((item) => String(item?.componentKey || "").toLowerCase() === "sink-faucet");
  if (!hasFaucetComponent) return definitions;

  const sinkBase = definitions.find((definition) => definition.componentKey === "sink-base");
  const worktop = definitions.find((definition) => definition.componentKey === "worktop");
  if (!sinkBase || !worktop) return definitions;

  const existingFaucet = definitions.find((definition) => definition.componentKey === "sink-faucet");
  if (existingFaucet?.preserveManualSize) return definitions;

  const width = Math.max(4.6, Math.min(sinkBase.width * 0.34, 5.1));
  const height = 8;
  const center = existingFaucet ? existingFaucet.left + existingFaucet.width / 2 : sinkBase.left + sinkBase.width / 2;
  return [
    ...definitions.filter((definition) => definition.componentKey !== "sink-faucet"),
    { componentKey: "sink-faucet", left: center - width / 2, top: worktop.top - height, width, height },
  ];
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

export function getPlanDisplayCrop(hotspots, slug) {
  if (!hotspots.length) return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
  const bounds = hotspots.reduce(
    (current, hotspot) => {
      const hotspotBounds = getHotspotSourceBounds(hotspot);
      return {
        left: Math.min(current.left, hotspotBounds.left),
        top: Math.min(current.top, hotspotBounds.top),
        right: Math.max(current.right, hotspotBounds.right),
        bottom: Math.max(current.bottom, hotspotBounds.bottom),
      };
    },
    { left: 100, top: 100, right: 0, bottom: 0 },
  );

  const trailingX = 100 - bounds.right;
  const trailingY = 100 - bounds.bottom;
  const cropTuning = PLAN_DISPLAY_CROP_TUNING_BY_SLUG[slug] || {};
  const leftPadding = cropTuning.leftPadding ?? Math.max(2.6, bounds.left * 0.6);
  const left = clampPercent(bounds.left - leftPadding);
  const top = clampPercent(bounds.top - (cropTuning.topPadding ?? Math.max(4, bounds.top * 0.5)));
  const rightLimit = cropTuning.rightLimit ?? 99.5;
  const right = clampPercent(
    Math.min(rightLimit, bounds.right + Math.max(3.2, trailingX * 0.92)),
  );
  const bottomPadding = cropTuning.bottomPadding ?? Math.max(1, trailingY * 0.85);
  const bottomLimit = cropTuning.bottomLimit ?? 99.5;
  const bottom = clampPercent(Math.min(bottomLimit, bounds.bottom + bottomPadding));
  return { left, top, right, bottom, width: Math.max(right - left, 1), height: Math.max(bottom - top, 1) };
}

export function cropPlanHotspot(hotspot, crop) {
  const points = Array.isArray(hotspot.points) ? hotspot.points : [];
  if (points.length) {
    const croppedPoints = points.map((point) => [
      (Number(point[0]) - crop.left) / crop.width * 100,
      (Number(point[1]) - crop.top) / crop.height * 100,
    ]);
    const xs = croppedPoints.map((point) => point[0]).filter(Number.isFinite);
    const ys = croppedPoints.map((point) => point[1]).filter(Number.isFinite);
    if (!xs.length || !ys.length) return { ...hotspot, left: 0, top: 0, width: 0, height: 0 };

    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    const width = Math.max(right - left, 0);
    const height = Math.max(bottom - top, 0);
    const clipPathPoints = croppedPoints
      .map(([x, y]) => {
        const localX = width > 0 ? (x - left) / width * 100 : 0;
        const localY = height > 0 ? (y - top) / height * 100 : 0;
        return `${roundHotspotPercent(localX)}% ${roundHotspotPercent(localY)}%`;
      })
      .join(", ");

    return { ...hotspot, left, top, width, height, clipPath: `polygon(${clipPathPoints})`, outlinePoints: croppedPoints };
  }

  const left = Math.max(hotspot.left, crop.left);
  const top = Math.max(hotspot.top, crop.top);
  const right = Math.min(hotspot.left + hotspot.width, crop.right);
  const bottom = Math.min(hotspot.top + hotspot.height, crop.bottom);
  return {
    ...hotspot,
    left: (left - crop.left) / crop.width * 100,
    top: (top - crop.top) / crop.height * 100,
    width: Math.max(right - left, 0) / crop.width * 100,
    height: Math.max(bottom - top, 0) / crop.height * 100,
  };
}

export function prepareKitchenPlanPreview(slug, components = []) {
  const normalizedSlug = normalizeSlug(slug);
  const imageHref = PLAN_IMAGE_BY_SLUG[normalizedSlug] || "";
  const sourceDefinitions = (PLAN_HOTSPOTS_BY_SLUG[normalizedSlug] || []).map(withHotspotSourceBounds);
  // Admin catalog thumbnails must match the drawn cabinet bounds. Plinth extension is only
  // applied in the interactive configurator (kitchen-svg-stage.jsx) for larger click targets.
  const hotspots = withCornerBlendeExtensions(withDerivedSinkFaucet(sourceDefinitions, components));
  if (!imageHref || !hotspots.length) return null;

  const crop = getPlanDisplayCrop(hotspots, normalizedSlug);
  const sourceSize = PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[normalizedSlug] || {
    width: PLAN_IMAGE_SOURCE_WIDTH,
    height: PLAN_IMAGE_SOURCE_HEIGHT,
  };
  return {
    imageHref,
    crop,
    aspectRatio: `${crop.width * sourceSize.width} / ${crop.height * sourceSize.height}`,
    hotspots: hotspots
      .map((hotspot) => cropPlanHotspot(hotspot, crop))
      .filter((hotspot) => hotspot.width > 0 && hotspot.height > 0)
      .filter(isPlanHighlightHotspot),
  };
}
