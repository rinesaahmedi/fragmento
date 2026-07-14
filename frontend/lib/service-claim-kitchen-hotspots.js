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
const CLAIM_BLENDE_DEFAULT_WIDTH = 0.44;
const CLAIM_BLENDE_MIN_WIDTH = 0.35;
const CLAIM_BLENDE_MAX_WIDTH = 3;
const CLAIM_BLENDE_CALIBRATION_BY_SLUG = {
  "ab-105807": {
    "drawer-module": { side: "left", outer: 4.502707, inner: 5.272157 },
    "wall-cabinet-1": { side: "left", outer: 4.502707, inner: 5.272157 },
  },
  "ab-105811": {
    "base-module-1": { side: "left", outer: 2.878313, inner: 3.676261 },
    "wall-cabinet-1": { side: "left", outer: 2.878313, inner: 3.676261 },
  },
  "ab-105812": {
    "drawer-module": { side: "right", inner: 95.497293, outer: 96.46623 },
    "wall-cabinet-6": { side: "right", inner: 95.497293, outer: 96.46623 },
  },
  "ab-105815": {
    "base-module-1": { side: "left", outer: 2.878313, inner: 3.676261 },
    "wall-cabinet-1": { side: "left", outer: 2.878313, inner: 3.676261 },
  },
  // The US50 perspective polygon contains the cabinet front followed by two
  // separately supplied UPK20 strips. Values follow the PDF source linework.
  "ab-105805": {
    "base-module-2": {
      side: "right",
      inner: 54.003333,
      outer: 55.52,
      bands: [[54.003333, 54.761667], [54.761667, 55.52]],
    },
    "wall-cabinet-4": { side: "right", inner: 60.15959, outer: 61.014534 },
  },
  "ab-105809": {
    "base-module-2": {
      side: "right",
      inner: 54.003333,
      outer: 55.52,
      bands: [[54.003333, 54.761667], [54.761667, 55.52]],
    },
    "wall-cabinet-4": { side: "right", inner: 60.15959, outer: 61.014534 },
  },
  "ab-105813": {
    "base-module-2": {
      side: "right",
      inner: 54.003333,
      outer: 55.52,
      bands: [[54.003333, 54.761667], [54.761667, 55.52]],
    },
    "wall-cabinet-4": { side: "right", inner: 60.15959, outer: 61.014534 },
  },
  "ab-105817": {
    "base-module-2": {
      side: "right",
      inner: 54.003333,
      outer: 55.52,
      bands: [[54.003333, 54.761667], [54.761667, 55.52]],
    },
    "wall-cabinet-4": { side: "right", inner: 60.15959, outer: 61.014534 },
  },
  // AB 105825 perspective family: both UPK20 strips sit together at the
  // left corner seam. The wall-cabinet HPK2002 is its narrow left face.
  "ab-105825": {
    "base-module-2": {
      side: "left",
      inner: 44.286121,
      outer: 42.661727,
      bands: [[42.661727, 43.54517], [43.54517, 44.286121]],
    },
    "wall-cabinet-1": { side: "left", outer: 48.161869, inner: 48.902821 },
  },
  // AB 105831 has the same double corner construction plus a complete
  // right-hand return face supplied as the base-module-1 UPK20.
  "ab-105831": {
    "base-module-1": { side: "right", inner: 14.55, outer: 20.45 },
    "base-module-2": {
      side: "left",
      inner: 44.029638,
      outer: 42.376746,
      bands: [[42.376746, 43.288686], [43.288686, 44.029638]],
    },
    "wall-cabinet-1": { side: "left", outer: 47.990881, inner: 48.760331 },
  },
  // AB 105834: the two base-module-2 strips share the left corner. The
  // dishwasher and upper cabinet Blenden are their separately drawn end faces.
  "ab-105834": {
    "base-module-2": {
      side: "left",
      inner: 53.918495,
      outer: 51.809632,
      bands: [[51.809632, 52.807068], [52.807068, 53.918495]],
    },
    "base-module-3": { side: "right", inner: 82.67, outer: 94.54 },
    "wall-cabinet-3": { side: "right", inner: 59.447136, outer: 60.444571 },
  },
  // AB 105837 and its aliases share this exact two-strip corner seam.
  "ab-105837": {
    "base-module-2": {
      side: "left",
      inner: 53.975492,
      outer: 52.037618,
      bands: [[52.037618, 52.949558], [52.949558, 53.975492]],
    },
    "wall-cabinet-3": { side: "right", inner: 58.991166, outer: 59.931604 },
  },
  // PDF line coordinates from the 3509 x 2480 source render.
  "ab-105806": {
    "drawer-module": { side: "right", inner: 97.834141, outer: 98.575093 },
    "wall-cabinet-6": { side: "right", inner: 97.948133, outer: 98.575093 },
  },
  "ab-105808": {
    "drawer-module": { side: "right", inner: 95.354802, outer: 96.295241 },
    "wall-cabinet-6": { side: "right", inner: 95.354802, outer: 96.295241 },
  },
  "ab-105810": {
    "drawer-module": { side: "right", inner: 94.015389, outer: 94.727843 },
    "wall-cabinet-6": { side: "right", inner: 94.015389, outer: 94.727843 },
  },
  "ab-105814": {
    "drawer-module": { side: "right", inner: 94.015389, outer: 94.727843 },
    "wall-cabinet-6": { side: "right", inner: 94.015389, outer: 94.727843 },
  },
  "ab-105816": {
    "drawer-module": { side: "right", inner: 95.497293, outer: 96.46623 },
    "wall-cabinet-6": { side: "right", inner: 95.497293, outer: 96.46623 },
  },
  "ab-105818": {
    "drawer-module": { side: "right", inner: 94.015389, outer: 94.727843 },
    "wall-cabinet-6": { side: "right", inner: 94.015389, outer: 94.727843 },
  },
  "ab-105819": {
    "base-module-1": { side: "left", outer: 2.878313, inner: 3.676261 },
    "wall-cabinet-1": { side: "left", outer: 2.878313, inner: 3.676261 },
  },
  "ab-105820": {
    "drawer-module": { side: "right", inner: 95.497293, outer: 96.46623 },
    "wall-cabinet-6": { side: "right", inner: 95.497293, outer: 96.46623 },
  },
  "ab-105821": {
    "base-module-1": { side: "left", outer: 6.269592, inner: 8.079225 },
    "wall-cabinet-1": { side: "left", outer: 6.269592, inner: 8.079225 },
  },
  "ab-105827": {
    "base-module-1": { side: "left", outer: 12.111713, inner: 13.22314 },
    "wall-cabinet-1": { side: "left", outer: 12.111713, inner: 13.22314 },
  },
  "ab-105830": {
    "base-module-1": { side: "left", outer: 12.111713, inner: 13.22314 },
    "wall-cabinet-1": { side: "left", outer: 12.111713, inner: 13.22314 },
  },
  "ab-105824": {
    "base-module-1": { side: "left", outer: 6.269592, inner: 8.079225 },
    "wall-cabinet-1": { side: "left", outer: 6.269592, inner: 8.079225 },
  },
  "ab-105823": {
    "sink-base": { side: "right", inner: 92.077515, outer: 93.986891 },
    "wall-cabinet-5": { side: "right", inner: 92.077515, outer: 93.986891 },
  },
  "ab-105826": {
    "base-module-1": { side: "left", outer: 20.404674, inner: 20.789399 },
    "sink-base": { side: "right", inner: 91.165574, outer: 92.818467 },
    "wall-cabinet-5": { side: "right", inner: 91.165574, outer: 92.818467 },
  },
  "ab-105829": {
    "sink-base": { side: "right", inner: 92.077515, outer: 93.986891 },
    "wall-cabinet-5": { side: "right", inner: 92.077515, outer: 93.986891 },
  },
  "ab-105832": {
    "sink-base": { side: "right", inner: 92.077515, outer: 93.986891 },
    "wall-cabinet-5": { side: "right", inner: 92.077515, outer: 93.986891 },
  },
  "ab-105833": {
    "base-module-2": { side: "right", inner: 47.990881, outer: 48.902821 },
    "base-module-3": { side: "left", outer: 64.206327, inner: 65.559989 },
    "drawer-module": { side: "right", inner: 96.437732, outer: 97.036193 },
    "wall-cabinet-3": { side: "right", inner: 47.990881, outer: 48.902821 },
    "wall-cabinet-4": { side: "left", outer: 64.206327, inner: 65.559989 },
    "wall-cabinet-6": { side: "right", inner: 96.437732, outer: 97.036193 },
  },
  "ab-105835": {
    "base-module-1": { side: "left", outer: 0.883443, inner: 1.99487 },
    "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.99487 },
  },
  "ab-105836": {
    "base-module-2": { side: "right", inner: 46.822457, outer: 49.615275 },
    "wall-cabinet-3": { side: "right", inner: 46.822457, outer: 49.615275 },
    "base-module-3": { side: "left", outer: 63.721858, inner: 65.004275 },
    "wall-cabinet-4": { side: "left", outer: 63.721858, inner: 65.004275 },
    "drawer-module": { side: "right", inner: 96.323739, outer: 97.007694 },
    "wall-cabinet-6": { side: "right", inner: 96.323739, outer: 97.007694 },
  },
  "ab-105838": {
    "base-module-1": { side: "left", outer: 0.883443, inner: 1.5389 },
    "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.5389 },
  },
  "ab-105841": {
    "base-module-1": { side: "left", outer: 0.883443, inner: 1.5389 },
    "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.5389 },
  },
  "ab-105844": {
    "base-module-1": { side: "left", outer: 0.883443, inner: 1.5389 },
    "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.5389 },
  },
};
for (const alias of ["ab-105822", "ab-105828"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105825"];
}
for (const alias of ["ab-105840", "ab-105843"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105837"];
}
const OVEN_DRAWER_TOP_RATIO_BY_SLUG = {
  // PDF-measured seam between the oven and the drawer below it. The oven ends
  // on this line and the independently selectable drawer starts on the same line.
  "ab-105808": 0.681,
  "ab-105816": 0.6813,
  "ab-105820": 0.6806,
  "ab-105821": 0.6808,
  "ab-105824": 0.6808,
  // These three share the AB 105822 drawing; the PDF seam is y=79.495968%.
  "ab-105823": 0.82765,
  "ab-105829": 0.82765,
  "ab-105832": 0.82765,
  "ab-105826": 0.828,
  "ab-105827": 0.8289,
  "ab-105830": 0.8289,
  "ab-105833": 0.6818,
  "ab-105835": 0.8274,
  "ab-105836": 0.6805,
  "ab-105838": 0.6797,
  "ab-105841": 0.6797,
  "ab-105844": 0.6797,
  "ab-105839": 0.6812,
  "ab-105842": 0.6812,
};

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
      [87.17, 56.68], [87.17, 57.75], [76.8, 59.27], [72.55, 58.4],
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

function ovenPartHotspots(hotspot, part, kitchenSlug) {
  const [topLeft, topRight, bottomRight, bottomLeft] = ovenModuleDisplayCorners(hotspot);
  const isDrawer = part.partKey === "oven-drawer";
  const measuredBodyRatio = OVEN_DRAWER_TOP_RATIO_BY_SLUG[kitchenSlug] || OVEN_DRAWER_TOP_RATIO;
  const originalBodyHeightRatio = Math.max(
    0,
    Math.min(1, Number(hotspot.claimOriginalBodyHeightRatio || 1)),
  );
  const drawerTopRatio = measuredBodyRatio * originalBodyHeightRatio;
  const slice = (startRatio, endRatio) => hotspotFromDisplayPoints(hotspot, part, [
    interpolatePoint(topLeft, bottomLeft, startRatio),
    interpolatePoint(topRight, bottomRight, startRatio),
    interpolatePoint(topRight, bottomRight, endRatio),
    interpolatePoint(topLeft, bottomLeft, endRatio),
  ]);

  if (isDrawer) {
    return [slice(drawerTopRatio, 1)];
  }

  return [slice(0, drawerTopRatio)];
}

function hotspotBounds(hotspot = {}) {
  const points = Array.isArray(hotspot.points) ? hotspot.points : [];
  if (points.length) {
    const xs = points.map(([x]) => Number(x)).filter(Number.isFinite);
    const ys = points.map(([, y]) => Number(y)).filter(Number.isFinite);
    if (xs.length && ys.length) {
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      return { left, right, top, bottom, width: right - left, height: bottom - top };
    }
  }

  const left = Number(hotspot.left || 0);
  const top = Number(hotspot.top || 0);
  const width = Number(hotspot.width || 0);
  const height = Number(hotspot.height || 0);
  return { left, right: left + width, top, bottom: top + height, width, height };
}

function combinedHotspotBounds(hotspots = []) {
  const bounds = hotspots.map(hotspotBounds);
  if (!bounds.length) return null;
  const left = Math.min(...bounds.map((entry) => entry.left));
  const right = Math.max(...bounds.map((entry) => entry.right));
  const top = Math.min(...bounds.map((entry) => entry.top));
  const bottom = Math.max(...bounds.map((entry) => entry.bottom));
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function clipPolygonAtX(points, boundary, keepLeft) {
  const source = Array.isArray(points) ? points : [];
  if (source.length < 3) return [];
  const output = [];
  const isInside = ([x]) => keepLeft ? Number(x) <= boundary : Number(x) >= boundary;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const previous = source[(index + source.length - 1) % source.length];
    const currentInside = isInside(current);
    const previousInside = isInside(previous);
    if (currentInside !== previousInside) {
      const dx = Number(current[0]) - Number(previous[0]);
      const ratio = Math.abs(dx) < 0.000001 ? 0 : (boundary - Number(previous[0])) / dx;
      output.push([boundary, Number(previous[1]) + (Number(current[1]) - Number(previous[1])) * ratio]);
    }
    if (currentInside) output.push(current);
  }
  return output;
}

function clipHotspotToXRange(hotspot, minX, maxX) {
  const bounds = hotspotBounds(hotspot);
  const left = Math.max(bounds.left, minX);
  const right = Math.min(bounds.right, maxX);
  if (right - left < 0.01) return null;

  if (Array.isArray(hotspot.points) && hotspot.points.length) {
    let points = clipPolygonAtX(hotspot.points, left, false);
    points = clipPolygonAtX(points, right, true);
    if (points.length < 3) return null;
    const nextBounds = hotspotBounds({ points });
    return { ...hotspot, points, left: nextBounds.left, top: nextBounds.top, width: nextBounds.width, height: nextBounds.height };
  }
  return { ...hotspot, left, width: right - left };
}

function fitClaimHotspotToXRange(hotspot, minX, maxX, useExactRange = false) {
  if (useExactRange && !Array.isArray(hotspot?.points)) {
    if (maxX - minX < 0.01) return null;
    return { ...hotspot, left: minX, width: maxX - minX };
  }
  return clipHotspotToXRange(hotspot, minX, maxX);
}

function isSameCabinetBand(sourceKey, candidateKey) {
  const isWall = String(sourceKey || "").startsWith("wall-cabinet-");
  const candidateIsWall = String(candidateKey || "").startsWith("wall-cabinet-");
  if (isWall || candidateIsWall) return isWall && candidateIsWall;
  const baseKeyPattern = /^(base-module-|drawer-module$|oven-module$|oven-base$|sink-base$|corner-base$)/;
  return baseKeyPattern.test(String(sourceKey || "")) && baseKeyPattern.test(String(candidateKey || ""));
}

function resolveClaimBlendeSides(sourceKey, sourceBounds, boundsByKey, quantity) {
  if (quantity > 1) return ["left", "right"];
  const candidates = [...boundsByKey.entries()]
    .filter(([key]) => key !== sourceKey && isSameCabinetBand(sourceKey, key))
    .map(([, bounds]) => bounds)
    .filter((bounds) => bounds.bottom >= sourceBounds.top && bounds.top <= sourceBounds.bottom);
  const leftNeighbors = candidates.filter((bounds) => bounds.right <= sourceBounds.left + 0.5);
  const rightNeighbors = candidates.filter((bounds) => bounds.left >= sourceBounds.right - 0.5);
  const leftBoundary = leftNeighbors.length ? Math.max(...leftNeighbors.map((bounds) => bounds.right)) : 0;
  const rightBoundary = rightNeighbors.length ? Math.min(...rightNeighbors.map((bounds) => bounds.left)) : 100;
  const leftSpace = Math.max(0, sourceBounds.left - leftBoundary);
  const rightSpace = Math.max(0, rightBoundary - sourceBounds.right);
  return [leftSpace >= rightSpace ? "left" : "right"];
}

function median(values = []) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function resolveClaimBlendeWidth(sourceKey, sourceBounds, blende, boundsByKey, claimBlenden, components) {
  const sourceWidthMm = Number(blende.sourceWidthMm || 0);
  if (sourceWidthMm <= 0) return CLAIM_BLENDE_DEFAULT_WIDTH;

  const blendeSourceKeys = new Set((claimBlenden || []).map((entry) => entry.sourceComponentKey));
  const componentByKey = new Map(
    (components || []).map((component) => [String(component?.componentKey || "").trim(), component]),
  );
  const scaleCandidates = [...boundsByKey.entries()]
    .filter(([key]) =>
      key !== sourceKey
      && !blendeSourceKeys.has(key)
      && !componentByKey.get(key)?.blendeCode
      && isSameCabinetBand(sourceKey, key),
    )
    .map(([key, bounds]) => {
      const widthMm = Number(componentByKey.get(key)?.widthMm || 0);
      return widthMm > 0 ? bounds.width / widthMm : null;
    })
    .filter((value) => Number.isFinite(value) && value > 0);
  const scale = median(scaleCandidates);
  if (!scale) return CLAIM_BLENDE_DEFAULT_WIDTH;

  const measuredExtra = (sourceBounds.width - sourceWidthMm * scale) / Math.max(1, Number(blende.blendeQuantity || 1));
  if (measuredExtra < CLAIM_BLENDE_MIN_WIDTH) return CLAIM_BLENDE_DEFAULT_WIDTH;
  return Math.min(CLAIM_BLENDE_MAX_WIDTH, measuredExtra);
}

/** Split commercially attached cabinet Blenden into claims-only selectable areas. */
export function buildServiceClaimBlendeHotspots(hotspots = [], claimBlenden = [], components = [], kitchenSlug = "") {
  const blenden = (claimBlenden || []).filter((entry) =>
    entry?.claimPartKey === "blende" && entry.sourceComponentKey && entry.componentId,
  );
  if (!blenden.length) return hotspots;

  const hotspotsByKey = new Map();
  (hotspots || []).forEach((hotspot) => {
    const key = String(hotspot?.componentKey || "").trim();
    if (!key) return;
    hotspotsByKey.set(key, [...(hotspotsByKey.get(key) || []), hotspot]);
  });
  const boundsByKey = new Map(
    [...hotspotsByKey.entries()].map(([key, entries]) => [key, combinedHotspotBounds(entries)]),
  );
  const blendenBySourceKey = new Map();
  blenden.forEach((entry) => {
    const current = blendenBySourceKey.get(entry.sourceComponentKey) || [];
    current.push(entry);
    blendenBySourceKey.set(entry.sourceComponentKey, current);
  });

  return (hotspots || []).flatMap((hotspot) => {
    const sourceKey = String(hotspot?.componentKey || "").trim();
    const sourceBlenden = blendenBySourceKey.get(sourceKey) || [];
    const blende = sourceBlenden[0];
    const sourceBounds = boundsByKey.get(sourceKey);
    if (!blende || !sourceBounds || sourceBounds.width <= 0) return [hotspot];

    const calibration = CLAIM_BLENDE_CALIBRATION_BY_SLUG[String(kitchenSlug || "").toLowerCase()]?.[sourceKey];
    const calibratedBands = Array.isArray(calibration?.bands) ? calibration.bands : null;
    if (calibratedBands?.length && sourceBlenden.length > 1) {
      const bandSide = calibration?.side === "left" ? "left" : "right";
      const bandValues = calibratedBands.flat().map(Number).filter(Number.isFinite);
      const cabinetMinX = bandSide === "left" ? Math.max(...bandValues) : sourceBounds.left;
      const cabinetMaxX = bandSide === "right" ? Math.min(...bandValues) : sourceBounds.right;
      const result = [];
      const cabinetHotspot = fitClaimHotspotToXRange(
        hotspot,
        cabinetMinX,
        cabinetMaxX,
        true,
      );
      if (cabinetHotspot) result.push({ ...cabinetHotspot, claimBlendeSplit: true });

      sourceBlenden.forEach((sourceBlende, index) => {
        const band = calibratedBands[index];
        if (!band) return;
        const blendeHotspot = fitClaimHotspotToXRange(
          hotspot,
          Math.min(...band),
          Math.max(...band),
          true,
        );
        if (!blendeHotspot) return;
        result.push({
          ...blendeHotspot,
          componentId: sourceBlende.componentId,
          componentKey: sourceBlende.componentKey,
          claimPartKey: "blende",
          claimBlendeSplit: true,
          sourceComponentKey: sourceKey,
          blendeSide: bandSide,
          blendeIndex: index + 1,
        });
      });
      return result;
    }
    const inferredWidth = resolveClaimBlendeWidth(
      sourceKey,
      sourceBounds,
      blende,
      boundsByKey,
      blenden,
      components,
    );
    const sides = calibration
      ? [calibration.side]
      : resolveClaimBlendeSides(sourceKey, sourceBounds, boundsByKey, Number(blende.blendeQuantity || 1));
    const leftInner = calibration?.side === "left" ? Number(calibration.inner) : sourceBounds.left + inferredWidth;
    const rightInner = calibration?.side === "right" ? Number(calibration.inner) : sourceBounds.right - inferredWidth;
    const cabinetMinX = sides.includes("left") ? leftInner : sourceBounds.left;
    const cabinetMaxX = sides.includes("right") ? rightInner : sourceBounds.right;
    const result = [];
    const cabinetHotspot = fitClaimHotspotToXRange(
      hotspot,
      cabinetMinX,
      cabinetMaxX,
      Boolean(calibration),
    );
    if (cabinetHotspot) result.push({ ...cabinetHotspot, claimBlendeSplit: true });

    sides.forEach((side) => {
      const minX = calibration
        ? Math.min(Number(calibration.inner), Number(calibration.outer))
        : side === "left" ? sourceBounds.left : sourceBounds.right - inferredWidth;
      const maxX = calibration
        ? Math.max(Number(calibration.inner), Number(calibration.outer))
        : side === "left" ? sourceBounds.left + inferredWidth : sourceBounds.right;
      const blendeHotspot = fitClaimHotspotToXRange(hotspot, minX, maxX, Boolean(calibration));
      if (!blendeHotspot) return;
      result.push({
        ...blendeHotspot,
        componentId: blende.componentId,
        componentKey: blende.componentKey || `claim-blende-${sourceKey}`,
        claimPartKey: "blende",
        claimBlendeSplit: true,
        sourceComponentKey: sourceKey,
        blendeSide: side,
      });
    });
    return result;
  });
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
        return ovenPartHotspots(hotspot, part, normalizedSlug);
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
