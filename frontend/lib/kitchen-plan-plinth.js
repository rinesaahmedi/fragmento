const PLAN_DIMENSION_LINE_PERCENT = 98.43;

const BASE_BODY_COMPONENT_KEYS = new Set([
  "base-module-1",
  "base-module-2",
  "base-module-3",
  "base-module-4",
  "base-module-5",
  "base-module-6",
  "oven-module",
  "sink-base",
  // A separately selectable sink-end UPK20 shares the cabinet's toe-kick.
  "sink-end-blende",
  "drawer-module",
]);

const BASE_PLINTH_EXTENSION_DISABLED_SLUGS = new Set([
  "ab-105808",
  "ab-105805",
  "ab-105809",
  "ab-105813",
  "ab-105817",
  "ab-105834",
  "ab-105810",
  "ab-105812",
  "ab-105814",
  "ab-105818",
  "ab-105820",
  "ab-105841",
  "ab-105838",
  "ab-105844",
  "ab-105847",
  "ab-105850",
  "ab-105853",
  "ab-105856",
  "ab-105859",
  "ab-105862",
  // L-shaped perspective drawing: base hotspots already include each cabinet's drawn bottom
  // and sit at different heights, so the flat-elevation plinth extension would over-extend them.
  "ab-105837",
  "ab-105840",
  "ab-105843",
  "ab-105831",
  "ab-104968",
  "ab-105734",
  "ab-105737",
  "ab-105740",
  "ab-105816",
]);
// Typical toe-kick height on the 3509×2480 CAD renders (~5.2–5.3% of image height).
const BASE_PLINTH_EXTENSION_PERCENT = 5.25;
// If the base run already reaches within this margin of the floor dimension line, assume
// plinth is included and do not extend (avoids double-counting on older hotspot maps).
const BASE_PLINTH_ALREADY_INCLUDED_GAP = 8;

export function isBaseBodyHotspot(definition) {
  if (Array.isArray(definition.points) && definition.points.length) {
    return false;
  }
  if (definition.preserveManualSize) {
    return false;
  }
  if (BASE_BODY_COMPONENT_KEYS.has(definition.componentKey)) {
    return true;
  }
  // Tall worktop side strips share the base body column and should include the plinth too.
  return definition.componentKey === "worktop" && definition.height >= 15;
}


// Base hotspots are measured from the door top down to the cabinet bottom, which sits above
// the plinth/toe-kick. Extend them downward so the whole drawn cabinet—including the kick
// board—is clickable, without re-measuring every kitchen.
export function withBasePlinthExtension(definitions, slug) {
  if (BASE_PLINTH_EXTENSION_DISABLED_SLUGS.has(slug)) {
    return definitions;
  }

  const baseBodies = definitions.filter(isBaseBodyHotspot);
  if (!baseBodies.length) return definitions;

  const bodyBottom = Math.max(...baseBodies.map((hotspot) => hotspot.top + hotspot.height));
  const gapToFloor = PLAN_DIMENSION_LINE_PERCENT - bodyBottom;
  if (gapToFloor <= BASE_PLINTH_ALREADY_INCLUDED_GAP) {
    return definitions;
  }

  const targetBottom = Math.min(
    bodyBottom + BASE_PLINTH_EXTENSION_PERCENT,
    PLAN_DIMENSION_LINE_PERCENT - 1,
  );

  return definitions.map((definition) => {
    if (!isBaseBodyHotspot(definition)) {
      return definition;
    }
    const currentBottom = definition.top + definition.height;
    if (currentBottom >= targetBottom - 0.2) {
      return definition;
    }
    return {
      ...definition,
      height: targetBottom - definition.top,
      claimOriginalBodyHeightRatio:
        definition.height / Math.max(targetBottom - definition.top, 0.0001),
    };
  });
}

