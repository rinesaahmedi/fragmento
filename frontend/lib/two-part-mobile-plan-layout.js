const AB_105845_MOBILE_LAYOUT_SLUGS = new Set([
  "ab-105845",
  "105845-modul-2",
  "ab-105848",
  "ab-105851",
  "ab-105854",
  "ab-105857",
  "ab-105860",
]);

const AB_105847_MOBILE_LAYOUT_SLUGS = new Set([
  "ab-105847",
  "ab-105850",
  "ab-105853",
  "ab-105856",
  "ab-105859",
  "ab-105862",
]);

export function getTwoPartMobilePlanLayout(slug = "") {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (AB_105845_MOBILE_LAYOUT_SLUGS.has(normalizedSlug)) {
    return { splitX: 57, shiftX: 12 };
  }
  if (AB_105847_MOBILE_LAYOUT_SLUGS.has(normalizedSlug)) {
    return { splitX: 45.25, shiftX: 8.5 };
  }
  return null;
}

export function shiftTwoPartPlanGeometry(geometry, layout) {
  if (!geometry || !layout) return geometry;

  const points = Array.isArray(geometry.points) ? geometry.points : [];
  const sourceLeft = points.length
    ? Math.min(...points.map((point) => Number(point[0])).filter(Number.isFinite))
    : Number(geometry.left || 0);

  if (!Number.isFinite(sourceLeft) || sourceLeft < layout.splitX) {
    return geometry;
  }

  return {
    ...geometry,
    left: Number(geometry.left || 0) - layout.shiftX,
    ...(points.length
      ? {
          points: points.map(([x, y]) => [Number(x) - layout.shiftX, Number(y)]),
        }
      : {}),
  };
}

export function getTwoPartMobilePlanCrop(crop, layout) {
  if (!crop || !layout) return crop;
  const right = Math.max(crop.left + 1, crop.right - layout.shiftX);
  return {
    ...crop,
    right,
    width: right - crop.left,
  };
}
