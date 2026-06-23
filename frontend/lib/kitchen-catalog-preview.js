import { PLAN_IMAGE_BY_SLUG } from "./kitchen-plan-preview-data.js";
import { isPlanHighlightHotspot, prepareKitchenPlanPreview } from "./kitchen-plan-preview.js";

const CANONICAL_PREVIEW_SLUG_BY_CODE = {
  "260309": "kitchen-model-b",
  "560303": "kitchen-model-c",
};

function normalizeSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeAbKitchenSlug(value) {
  const normalized = normalizeSlug(value);
  const explicitMatch = normalized.match(/\bab-?(\d{6})\b/);
  if (explicitMatch?.[1]?.startsWith("105")) {
    return `ab-${explicitMatch[1]}`;
  }

  const digits = digitsOnly(normalized);
  if (digits.length === 6 && digits.startsWith("105")) {
    return `ab-${digits}`;
  }
  return "";
}

export function resolveKitchenCatalogPreviewSlug(kitchen) {
  const slug = normalizeSlug(kitchen?.slug);
  if (PLAN_IMAGE_BY_SLUG[slug] || CANONICAL_PREVIEW_SLUG_BY_CODE[digitsOnly(slug)]) {
    return PLAN_IMAGE_BY_SLUG[slug] ? slug : CANONICAL_PREVIEW_SLUG_BY_CODE[digitsOnly(slug)];
  }

  const directAbSlug = normalizeAbKitchenSlug(slug);
  if (PLAN_IMAGE_BY_SLUG[directAbSlug]) {
    return directAbSlug;
  }

  const kitchenCodeSlug = normalizeAbKitchenSlug(kitchen?.kitchenCode);
  if (PLAN_IMAGE_BY_SLUG[kitchenCodeSlug]) {
    return kitchenCodeSlug;
  }

  const kitchenCodeAlias = CANONICAL_PREVIEW_SLUG_BY_CODE[digitsOnly(kitchen?.kitchenCode)];
  if (kitchenCodeAlias) {
    return kitchenCodeAlias;
  }

  const itemCodeSlug = (kitchen?.items || [])
    .map((item) => normalizeAbKitchenSlug(item?.code))
    .find((candidate) => PLAN_IMAGE_BY_SLUG[candidate]);

  return itemCodeSlug || slug;
}

export function getKitchenCatalogImagePreview(slug, components = []) {
  return prepareKitchenPlanPreview(slug, components);
}

export function getKitchenCatalogPreviewHotspots(imagePreview, componentKey) {
  const normalizedKey = String(componentKey || "").trim();
  if (!normalizedKey || !Array.isArray(imagePreview?.hotspots)) {
    return [];
  }

  return imagePreview.hotspots.filter(
    (hotspot) => hotspot.componentKey === normalizedKey && isPlanHighlightHotspot(hotspot),
  );
}

export function getKitchenCatalogPreviewSlot(imagePreview, componentKey) {
  const normalizedKey = String(componentKey || "").trim();
  if (!normalizedKey || !getKitchenCatalogPreviewHotspots(imagePreview, normalizedKey).length) {
    return null;
  }

  return {
    componentKey: normalizedKey,
    label: normalizedKey
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  };
}
