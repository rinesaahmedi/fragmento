import { SERVICE_CLAIM_PART_COMPONENT_IDS } from "./service-claim-kitchen-plan-selection.js";

const L_SHAPED_CLAIM_KITCHEN_SLUGS = new Set([
  "ab-104968",
  "ab-105734",
  "ab-105737",
  "ab-105740",
  "ab-105805",
  "ab-105809",
  "ab-105813",
  "ab-105817",
  "ab-105822",
  "ab-105825",
  "ab-105828",
  "ab-105831",
  "ab-105834",
  "ab-105837",
  "ab-105840",
  "ab-105843",
  "ab-105747",
  "ab-105750",
  "ab-105753",
  "ab-105756",
]);

export function isLShapedClaimKitchen(kitchenSlug = "") {
  return L_SHAPED_CLAIM_KITCHEN_SLUGS.has(
    String(kitchenSlug || "").trim().toLowerCase(),
  );
}

// Measured from the full-resolution PDF renders. Coordinates are relative to each plan's
// faucet hotspot so the polygons remain aligned after the plan is cropped for display.
const L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG = {
  "ab-104968": [[-0.99, 1], [0.08, 0.91], [1.86, 1.13], [0.97, 1.22]],
  "ab-105734": [[-0.99, 1], [0.08, 0.91], [1.86, 1.13], [0.97, 1.22]],
  "ab-105737": [[-0.99, 1], [0.08, 0.91], [1.86, 1.13], [0.97, 1.22]],
  "ab-105740": [[-0.99, 1], [0.08, 0.91], [1.86, 1.13], [0.97, 1.22]],
  "ab-105805": [[-1.04, 0.94], [0.05, 0.85], [1.94, 1.06], [0.78, 1.18]],
  "ab-105809": [[-1.04, 0.94], [0.05, 0.85], [1.94, 1.06], [0.78, 1.18]],
  "ab-105813": [[-1.04, 0.94], [0.05, 0.85], [1.94, 1.06], [0.78, 1.18]],
  "ab-105817": [[-1.04, 0.94], [0.05, 0.85], [1.94, 1.06], [0.78, 1.18]],
  "ab-105822": [[-0.75, 0.94], [1.21, 0.78], [2.05, 0.88], [0.05, 1.05]],
  "ab-105825": [[-0.75, 0.94], [1.21, 0.78], [2.05, 0.88], [0.05, 1.05]],
  "ab-105828": [[-0.75, 0.94], [1.21, 0.78], [2.05, 0.88], [0.05, 1.05]],
  "ab-105831": [[-1.33, 1.04], [1.14, 0.85], [2.26, 0.96], [-0.22, 1.16]],
  "ab-105834": [[-1.26, 0.85], [-0.05, 0.75], [2.19, 0.96], [0.87, 1.06]],
  "ab-105837": [[-1.09, 1.02], [-0.04, 0.93], [1.9, 1.18], [0.86, 1.28]],
  "ab-105840": [[-1.09, 1.02], [-0.04, 0.93], [1.9, 1.18], [0.86, 1.28]],
  "ab-105843": [[-1.09, 1.02], [-0.04, 0.93], [1.9, 1.18], [0.86, 1.28]],
  "ab-105747": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
  "ab-105750": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
  "ab-105753": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
  "ab-105756": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
};

const RIGHT_LEG_COOKTOP_SLUGS = new Set([
  "ab-105822",
  "ab-105825",
  "ab-105828",
  "ab-105831",
]);

const LEFT_LEG_COOKTOP_POINTS_RELATIVE_TO_OVEN = [
  [-1, -0.04],
  [0, -0.08],
  [1, 0],
  [0, 0.05],
];

// Dedicated cooktop polygons measured from the four outside strokes in each
// source plan render. Keeping the values relative to the oven hotspot
// preserves their alignment when the claim picker applies its display crop.
const COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG = {
  "ab-105805": [
    [-0.692275, -0.051067],
    [0.1879, -0.103753],
    [1.000594, -0.049604],
    [0.014799, 0.007473],
  ],
  "ab-105809": [
    [-0.692275, -0.051067],
    [0.1879, -0.103753],
    [1.000594, -0.049604],
    [0.014799, 0.007473],
  ],
  "ab-105813": [
    [-0.692275, -0.051067],
    [0.1879, -0.103753],
    [1.000594, -0.049604],
    [0.014799, 0.007473],
  ],
  "ab-105817": [
    [-0.692275, -0.051067],
    [0.1879, -0.103753],
    [1.000594, -0.049604],
    [0.014799, 0.007473],
  ],
  "ab-105822": [
    [-0.023249, -0.059484],
    [1.091867, -0.113637],
    [2.037511, -0.046988],
    [0.993574, 0.001611],
  ],
  "ab-105825": [
    [-0.023249, -0.059484],
    [1.091867, -0.113637],
    [2.037511, -0.046988],
    [0.993574, 0.001611],
  ],
  "ab-105828": [
    [-0.023249, -0.059484],
    [1.091867, -0.113637],
    [2.037511, -0.046988],
    [0.993574, 0.001611],
  ],
  "ab-105831": [
    [-0.001501, -0.041667],
    [1.065425, -0.090225],
    [2.054045, -0.030875],
    [1.00017, 0.023079],
  ],
  "ab-105837": [
    [-0.768612, -0.055883],
    [0.245432, -0.109993],
    [1.083709, -0.051824],
    [0.161605, 0.002286],
  ],
  "ab-105840": [
    [-0.768612, -0.055883],
    [0.245432, -0.109993],
    [1.083709, -0.051824],
    [0.161605, 0.002286],
  ],
  "ab-105843": [
    [-0.768612, -0.055883],
    [0.245432, -0.109993],
    [1.083709, -0.051824],
    [0.161605, 0.002286],
  ],
  "ab-105834": [
    [-0.855, -0.0529],
    [0.2163, -0.1017],
    [1.0665, -0.0423],
    [-0.0972, 0.0148],
  ],
  "ab-105747": [
    [-0.671433, -0.062431],
    [0.29387, -0.113779],
    [1.023722, -0.060042],
    [0.007871, -0.003956],
  ],
  "ab-105750": [
    [-0.671433, -0.062431],
    [0.29387, -0.113779],
    [1.023722, -0.060042],
    [0.007871, -0.003956],
  ],
  "ab-105753": [
    [-0.671433, -0.062431],
    [0.29387, -0.113779],
    [1.023722, -0.060042],
    [0.007871, -0.003956],
  ],
  "ab-105756": [
    [-0.671433, -0.062431],
    [0.29387, -0.113779],
    [1.023722, -0.060042],
    [0.007871, -0.003956],
  ],
};

const RIGHT_LEG_COOKTOP_POINTS_RELATIVE_TO_OVEN = [
  [0, -0.08],
  [1, -0.12],
  [2, 0],
  [1, 0.05],
];

const ELEVATION_COOKTOP_POINTS_RELATIVE_TO_OVEN = [
  [0.04, -0.04],
  [0.96, -0.04],
  [0.96, 0.02],
  [0.04, 0.02],
];

// The oven cabinetry uses the same appliance/drawer/plinth construction in the
// elevation and perspective plans. These two seams were measured from the
// full-resolution PDF linework across all six unique L-plan families and the
// front-elevation family. The drawer starts at 66% and owns the full lower
// section, including the panel/plinth beneath the drawer front.
const OVEN_DRAWER_TOP_RATIO = 0.66;

function pointsRelativeToBounds(points, bounds) {
  return points.map(([x, y]) => [
    (x - bounds.left) / bounds.width,
    (y - bounds.top) / bounds.height,
  ]);
}

function splitWorktopDefinition(bounds, leftPoints, rightPoints, remainingPartKeys = []) {
  return {
    splitFirst: {
      "worktop-left": pointsRelativeToBounds(leftPoints, bounds),
      "worktop-right": pointsRelativeToBounds(rightPoints, bounds),
    },
    indexPartKeys: [null, ...remainingPartKeys],
  };
}

// The claim overlay uses the existing PDF-matched worktop polygons. Some plan
// families already have one polygon per leg; the three combined outlines are
// divided at their actual corner seam below.
const L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG = {
  "ab-105805": splitWorktopDefinition(
    { left: 28.4, top: 50.4, width: 58.77, height: 8.87 },
    [
      [28.44, 54.44], [35.45, 53.44], [45.57, 51.94],
      [54.9, 53.59], [54.9, 54.82], [45.57, 56.13], [35.45, 57.8], [28.4, 58.55],
    ],
    [
      [45.57, 51.94], [55.57, 50.4], [64.05, 51.89], [72.55, 53.68], [76.8, 54.5],
      [76.8, 59.27], [72.55, 58.4],
      [64.05, 56.65], [54.9, 54.82], [54.9, 53.59],
    ],
  ),
  "ab-105834": splitWorktopDefinition(
    { left: 29.55, top: 52.08, width: 65.27, height: 11.39 },
    [
      [29.55, 55.73], [42.41, 53.83], [52.61, 55.89],
      [53.81, 57.42], [31.81, 60.36], [29.55, 60.67],
    ],
    [
      [42.41, 53.83], [46.4, 53.29], [54.81, 52.08], [67.92, 54.79], [94.73, 60.3], [94.82, 61.69],
      [82.83, 63.47], [67.92, 60.45], [53.81, 57.42], [52.61, 55.89],
    ],
  ),
  "ab-104968": splitWorktopDefinition(
    { left: 5.57, top: 50.91, width: 66.77, height: 10.64 },
    [
      [14.7, 59.97], [5.57, 58.11], [5.57, 56.64], [45.69, 50.91],
      [43.9, 55.82], [14.61, 59.96],
    ],
    [
      [45.69, 50.91], [72.34, 56.36], [72.34, 60.09], [72.34, 61.55],
      [43.9, 55.82],
    ],
  ),
  "ab-105825": {
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-right"],
  },
  "ab-105831": {
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"],
  },
  "ab-105837": {
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"],
  },
  "ab-105747": splitWorktopDefinition(
    { left: 29.615, top: 55.55, width: 55.34, height: 6.716 },
    [
      [29.615, 58.514], [50.181, 55.55], [57.762, 57.103],
      [57.762, 58.212], [29.615, 62.266],
    ],
    [
      [50.181, 55.55], [57.762, 57.103], [66.784, 55.792], [84.955, 59.523],
      [84.955, 60.632], [75.933, 61.943], [57.762, 58.212],
    ],
  ),
};

for (const alias of ["ab-105809", "ab-105813", "ab-105817"]) {
  L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105805"];
}
for (const alias of ["ab-105822", "ab-105828"]) {
  L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105825"];
}
for (const alias of ["ab-105840", "ab-105843"]) {
  L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105837"];
}
for (const alias of ["ab-105734", "ab-105737", "ab-105740"]) {
  L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG["ab-104968"];
}
for (const alias of ["ab-105750", "ab-105753", "ab-105756"]) {
  L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105747"];
}

function normalizeClaimPart(part) {
  const partKey = String(part?.partKey || "").trim();
  const componentId = SERVICE_CLAIM_PART_COMPONENT_IDS[partKey];
  const sourceComponentKey = String(part?.sourceComponentKey || "").trim();
  return componentId && sourceComponentKey
    ? { ...part, partKey, componentId, sourceComponentKey }
    : null;
}

function splitSinkFixtureHotspot(hotspot, part) {
  const height = Number(hotspot.height || 0);
  const top = Number(hotspot.top || 0);
  const faucetRatio = 0.45;
  const isFaucet = part.partKey === "faucet";
  const nextTop = isFaucet ? top : top + height * faucetRatio;
  const nextHeight = isFaucet ? height * faucetRatio : height * (1 - faucetRatio);

  const separated = {
    ...hotspot,
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
    top: nextTop,
    height: nextHeight,
  };
  delete separated.points;
  delete separated.clipPath;
  return separated;
}

function hotspotFromDisplayPoints(hotspot, part, points) {
  const xs = points.map(([x]) => Number(x)).filter(Number.isFinite);
  const ys = points.map(([, y]) => Number(y)).filter(Number.isFinite);
  if (!xs.length || !ys.length) {
    return splitSinkFixtureHotspot(hotspot, part);
  }

  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  const width = right - left;
  const height = bottom - top;
  const clipPath = points
    .map(([x, y]) => `${((x - left) / width) * 100}% ${((y - top) / height) * 100}%`)
    .join(", ");

  const calibrated = {
    ...hotspot,
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
    left,
    top,
    width,
    height,
    clipPath: `polygon(${clipPath})`,
  };
  delete calibrated.points;
  return calibrated;
}

function interpolatePoint(start, end, ratio) {
  return [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
}

function ovenModuleDisplayCorners(hotspot) {
  const sourcePoints = Array.isArray(hotspot?.points)
    ? hotspot.points
      .map((point) => [Number(point?.[0]), Number(point?.[1])])
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    : [];

  if (sourcePoints.length >= 4) {
    const xs = sourcePoints.map(([x]) => x);
    const ys = sourcePoints.map(([, y]) => y);
    const sourceLeft = Math.min(...xs);
    const sourceTop = Math.min(...ys);
    const sourceWidth = Math.max(Math.max(...xs) - sourceLeft, 0.0001);
    const sourceHeight = Math.max(Math.max(...ys) - sourceTop, 0.0001);
    const displayPoint = ([x, y]) => [
      Number(hotspot.left || 0) + ((x - sourceLeft) / sourceWidth) * Number(hotspot.width || 0),
      Number(hotspot.top || 0) + ((y - sourceTop) / sourceHeight) * Number(hotspot.height || 0),
    ];

    // Oven-module polygons are stored clockwise: top-left, top-right,
    // bottom-right, bottom-left. A fifth point, where present, closes the path.
    return sourcePoints.slice(0, 4).map(displayPoint);
  }

  const left = Number(hotspot.left || 0);
  const top = Number(hotspot.top || 0);
  const right = left + Number(hotspot.width || 0);
  const bottom = top + Number(hotspot.height || 0);
  return [[left, top], [right, top], [right, bottom], [left, bottom]];
}

function ovenPartHotspots(hotspot, part) {
  const [topLeft, topRight, bottomRight, bottomLeft] = ovenModuleDisplayCorners(hotspot);
  const isDrawer = part.partKey === "oven-drawer";
  const slice = (startRatio, endRatio) => hotspotFromDisplayPoints(hotspot, part, [
    interpolatePoint(topLeft, bottomLeft, startRatio),
    interpolatePoint(topRight, bottomRight, startRatio),
    interpolatePoint(topRight, bottomRight, endRatio),
    interpolatePoint(topLeft, bottomLeft, endRatio),
  ]);

  if (isDrawer) {
    return [slice(OVEN_DRAWER_TOP_RATIO, 1)];
  }

  return [slice(0, OVEN_DRAWER_TOP_RATIO)];
}

function lShapedSinkHotspot(hotspot, part, kitchenSlug) {
  const left = Number(hotspot.left || 0);
  const top = Number(hotspot.top || 0);
  const width = Number(hotspot.width || 0);
  const height = Number(hotspot.height || 0);
  const relativePoints = L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG[kitchenSlug];
  const points = relativePoints.map(([x, y]) => [
    left + x * width,
    top + y * height,
  ]);
  return hotspotFromDisplayPoints(hotspot, part, points);
}

function cooktopHotspot(hotspot, part, kitchenSlug) {
  const left = Number(hotspot.left || 0);
  const top = Number(hotspot.top || 0);
  const width = Number(hotspot.width || 0);
  const height = Number(hotspot.height || 0);
  const relativePoints = COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[kitchenSlug]
    || (isLShapedClaimKitchen(kitchenSlug)
      ? RIGHT_LEG_COOKTOP_SLUGS.has(kitchenSlug)
        ? RIGHT_LEG_COOKTOP_POINTS_RELATIVE_TO_OVEN
        : LEFT_LEG_COOKTOP_POINTS_RELATIVE_TO_OVEN
      : ELEVATION_COOKTOP_POINTS_RELATIVE_TO_OVEN);
  const points = relativePoints.map(([x, y]) => [
    left + x * width,
    top + y * height,
  ]);
  return hotspotFromDisplayPoints(hotspot, part, points);
}

function existingClaimPartHotspot(hotspot, part) {
  return {
    ...hotspot,
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
  };
}

function splitFirstWorktopHotspots(hotspot, partsByPartKey, definition) {
  return Object.entries(definition.splitFirst || []).map(([partKey, relativePoints]) => {
    const part = partsByPartKey.get(partKey);
    if (!part) return null;
    const points = relativePoints.map(([x, y]) => [
      Number(hotspot.left || 0) + x * Number(hotspot.width || 0),
      Number(hotspot.top || 0) + y * Number(hotspot.height || 0),
    ]);
    return hotspotFromDisplayPoints(hotspot, part, points);
  }).filter(Boolean);
}

export function buildServiceClaimPartHotspots(hotspots = [], claimParts = [], kitchenSlug = "") {
  const normalizedParts = (claimParts || []).map(normalizeClaimPart).filter(Boolean);
  if (!normalizedParts.length) {
    return hotspots;
  }

  const partsBySourceKey = new Map();
  normalizedParts.forEach((part) => {
    const current = partsBySourceKey.get(part.sourceComponentKey) || [];
    current.push(part);
    partsBySourceKey.set(part.sourceComponentKey, current);
  });

  const normalizedSlug = String(kitchenSlug || "").trim().toLowerCase();
  const hasVisibleSink = isLShapedClaimKitchen(normalizedSlug);
  const worktopDefinition = L_SHAPED_WORKTOP_DEFINITIONS_BY_SLUG[normalizedSlug];
  const worktopParts = new Map(
    (partsBySourceKey.get("worktop") || []).map((part) => [part.partKey, part]),
  );
  const hasSplitWorktopParts = worktopParts.has("worktop-left") && worktopParts.has("worktop-right");
  let worktopIndex = -1;

  return (hotspots || []).flatMap((hotspot) => {
    const sourceComponentKey = String(hotspot?.componentKey || "").trim();
    const sourceParts = partsBySourceKey.get(sourceComponentKey) || [];
    if (!sourceParts.length) {
      return [hotspot];
    }
    if (sourceComponentKey === "worktop" && worktopDefinition && hasSplitWorktopParts) {
      worktopIndex += 1;
      if (worktopIndex === 0 && worktopDefinition.splitFirst) {
        return splitFirstWorktopHotspots(hotspot, worktopParts, worktopDefinition);
      }
      const partKey = worktopDefinition.indexPartKeys?.[worktopIndex];
      const part = worktopParts.get(partKey);
      return part ? [existingClaimPartHotspot(hotspot, part)] : [];
    }
    const visibleSourceParts = hasVisibleSink
      ? sourceParts
      : sourceParts.filter((part) => part.partKey !== "sink");

    return visibleSourceParts.flatMap((part) => {
      if (part.partKey === "faucet") {
        return {
          ...hotspot,
          componentId: part.componentId,
          componentKey: `claim-${part.partKey}`,
          claimPartKey: part.partKey,
        };
      }
      if (hasVisibleSink && part.partKey === "sink") {
        return lShapedSinkHotspot(hotspot, part, normalizedSlug);
      }
      if (part.partKey === "oven" || part.partKey === "oven-drawer") {
        return ovenPartHotspots(hotspot, part);
      }
      if (part.partKey === "cooktop") {
        return cooktopHotspot(hotspot, part, normalizedSlug);
      }
      if (part.partKey === "sink" || part.partKey === "faucet") {
        return splitSinkFixtureHotspot(hotspot, part);
      }

      return existingClaimPartHotspot(hotspot, part);
    });
  });
}
