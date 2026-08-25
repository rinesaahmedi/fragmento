import { SERVICE_CLAIM_PART_COMPONENT_IDS } from "./service-claim-kitchen-plan-selection.js";

const AB_105845_LAYOUT_ALIAS_SLUGS = [
  "105845-modul-2",
  "ab-105848",
  "ab-105851",
  "ab-105854",
  "ab-105857",
  "ab-105860",
];

const AB_105846_LAYOUT_ALIAS_SLUGS = [
  "ab-105849",
  "ab-105852",
  "ab-105855",
  "ab-105858",
  "ab-105861",
];

const L_SHAPED_CLAIM_KITCHEN_SLUGS = new Set([
  "ab-105743",
  "ab-105748",
  "ab-105751", "ab-105754", "ab-105745",
  "ab-105758",
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
  "ab-105846",
  ...AB_105846_LAYOUT_ALIAS_SLUGS,
]);

export function isLShapedClaimKitchen(kitchenSlug = "") {
  return L_SHAPED_CLAIM_KITCHEN_SLUGS.has(
    String(kitchenSlug || "").trim().toLowerCase(),
  );
}

// Measured from the full-resolution PDF renders. Coordinates are relative to each plan's
// faucet hotspot so the polygons remain aligned after the plan is cropped for display.
const L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG = {
  // Four outside sink strokes measured from AB 105743's vector PDF.
  "ab-105743": [[-0.166065, 0.89234], [2.617329, 0.730849], [3.895307, 0.836439], [1.111913, 1]],
  // Outside sink strokes measured from the AB 105748 vector PDF.
  "ab-105748": [[-2.13834, 0.978923], [-0.217391, 0.864169], [2.743083, 1.119438], [0.841897, 1.234192]],
  // Four outside sink strokes measured from AB 105758's 842 x 595 PDF.
  "ab-105758": [[-0.21021, 0.826421], [3, 0.677419], [4.126126, 0.763441], [1.162162, 0.930876]],
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
  // Four outside sink-bowl strokes measured from AB 105846's vector PDF.
  "ab-105846": [[-0.411949686, 0.97810219], [3.13836478, 0.768248175], [4.600628931, 0.894160584], [1.116352201, 1.138686131]],
  "ab-105840": [[-1.09, 1.02], [-0.04, 0.93], [1.9, 1.18], [0.86, 1.28]],
  "ab-105843": [[-1.09, 1.02], [-0.04, 0.93], [1.9, 1.18], [0.86, 1.28]],
  "ab-105747": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
  "ab-105750": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
  "ab-105753": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
  "ab-105756": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
};

// Absolute vector-plan outlines are preferable when one fixture is represented
// by several narrow hotspots. These coordinates remain in the uncropped source
// plan system and are projected into the ASC display crop below.
const L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG = {
  // Four outside sink-bowl strokes in AB 105846's vector-plan coordinates.
  // The separate faucet silhouettes below remain clickable as one fixture.
  "ab-105846": [
    [11.258907, 58.534454],
    [27.349169, 56.215126],
    [33.976247, 57.606723],
    [18.185273, 60.309244],
  ],
  "ab-105758": [
    [15.263658, 54.621849],
    [29.045131, 52.625210],
    [30.498812, 52.665546],
    [35.843230, 53.794958],
    [35.529691, 54.036975],
    [21.748219, 56.033613],
    [20.494062, 56.013445],
    [15.149644, 54.904202],
  ],
};

const RIGHT_LEG_COOKTOP_SLUGS = new Set([
  "ab-105743",
  "ab-105758",
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
  // Four outside cooktop strokes measured from AB 105743's vector PDF.
  "ab-105743": [
    [0.003788, -0.049606],
    [1.066288, -0.094488],
    [2.024621, -0.037008],
    [0.998106, 0.007087],
  ],
  // Outside cooktop strokes measured from the AB 105748 vector PDF.
  "ab-105748": [
    [-0.670782, -0.0625],
    [0.293553, -0.114011],
    [1.02332, -0.061126],
    [0.074074, -0.006868],
  ],
  "ab-105758": [
    [0, -0.049592],
    [1.061934, -0.09479],
    [1.52568, -0.067169],
    [0.993958, 0.011927],
  ],
  // Four outside cooktop strokes from the AB 104968 vector PDF.
  "ab-104968": [
    [-0.667973662, -0.049348617],
    [0.29873725, -0.109551803],
    [1.029665013, -0.056546824],
    [0.011867752, -0.000269933],
  ],
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
  // Six outer vertices preserve the kinked perspective outline of AB 105846's
  // cooktop instead of flattening it into an axis-aligned quadrilateral.
  "ab-105846": [
    [0.017759563, -0.041500853],
    [1.047814208, -0.085275725],
    [1.525956284, -0.059124503],
    [1.525956284, -0.005685048],
    [1.039617486, 0.014781126],
    [0.046448087, -0.040932348],
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

const COOKTOP_SOURCE_POINTS_BY_SLUG = {
  "ab-105758": [
    [46.218527, 53.189916],
    [56.237530, 51.737815],
    [60.612827, 52.625210],
    [60.612827, 54.258824],
    [55.596200, 54.984874],
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
  // Exact perspective divider strokes from the 842 x 595 AB 105743 PDF.
  "ab-105743": {
    "base-module-1": { side: "left", outer: 21.192399, inner: 21.790974 },
    "base-module-3": {
      side: "right",
      inner: 50.194774,
      outer: 51.562945,
      bands: [[50.194774, 50.935867], [50.935867, 51.562945]],
    },
    "wall-cabinet-1": { side: "left", outer: 47.301663, inner: 47.985748 },
  },
  // Exact UPEF65, UPK20, and HPK2002 divider strokes from AB 105748.
  "ab-105748": {
    "sink-base": { side: "left", outer: 50.251781, inner: 51.933492 },
    "drawer-module": { side: "right", inner: 71.543943, outer: 72.342043 },
    "wall-cabinet-3": { side: "right", inner: 56.579572, outer: 57.448931 },
  },
  // The sink UPK20 and dishwasher UPEF65 are distinct vector-PDF faces.
  "ab-105758": {
    "sink-base": {
      side: "left",
      outer: 20.038005,
      inner: 21.733967,
      includeOuterFace: true,
    },
    "base-module-3": {
      side: "right",
      inner: 44.223278,
      outer: 46.218527,
      bands: [[44.223278, 45.349169], [45.349169, 46.218527]],
    },
    "wall-cabinet-1": { side: "left", outer: 40.859857, inner: 41.643705 },
  },
  // AB 104968 uses complete perspective end faces. The US40 includes two
  // commercially supplied UPK20 pieces on the same narrow corner face.
  "ab-104968": {
    "base-module-2": {
      side: "right",
      inner: 43.054632,
      outer: 44.72209,
      bands: [[43.054632, 43.966746], [43.966746, 44.72209]],
    },
    "wall-cabinet-4": { side: "right", inner: 49.995249, outer: 50.893112 },
  },
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
  // Exact vertical divider strokes from the 842 x 595 vector PDFs. These
  // older plans place the Blende on different source cabinets, so inference
  // from the outside whitespace would choose the wrong edge.
  "ab-105732": {
    "sink-base": { side: "right", inner: 86.394299, outer: 87.691211 },
    "wall-cabinet-4": { side: "right", inner: 86.394299, outer: 87.691211 },
  },
  "ab-105733": {
    "base-module-1": { side: "left", outer: 4.831354, inner: 6.142518 },
    "wall-cabinet-1": { side: "left", outer: 4.831354, inner: 6.213777 },
  },
  "ab-105744": {
    "base-module-1": { side: "left", outer: 0.855107, inner: 1.325416 },
    "wall-cabinet-1": { side: "left", outer: 0.855107, inner: 1.325416 },
  },
  "ab-105746": {
    "sink-base": { side: "right", inner: 89.515439, outer: 90.826603 },
    "wall-cabinet-4": { side: "right", inner: 89.501188, outer: 90.826603 },
  },
  // AB 105747 draws two adjacent UPK20 strips at the inside corner, one
  // lower-return Blende, and one upper end Blende. Keep all visible faces
  // independent from their source cabinets in claims.
  "ab-105747": {
    "base-module-2": {
      side: "right",
      inner: 56.935867,
      outer: 58.389549,
      bands: [[56.935867, 57.76247], [57.76247, 58.389549]],
    },
    "drawer-module": { side: "right", inner: 75.420428, outer: 76.232779 },
    "wall-cabinet-3": { side: "right", inner: 53.401425, outer: 54.15677 },
  },
  // The UPK20 is the narrow strip on the US30's right side. The thinner
  // strip beyond x=99.7175 is the wall edge and must remain unselectable.
  "ab-105845": {
    "drawer-module": { side: "right", inner: 99.129375, outer: 99.7175 },
  },
  // AB 105846's US50 front ends at the x=3517 vector stroke. UPEF65 then
  // occupies the two narrow right-hand corner faces up to the oven boundary.
  // Its first upper cabinet also has a separately drawn left filler face.
  "ab-105846": {
    "base-module-1": { side: "right", inner: 50.123515, outer: 52.033254 },
    "wall-cabinet-1": { side: "left", outer: 46.118765, inner: 46.988124 },
  },
};
for (const alias of ["ab-105822", "ab-105828"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105825"];
}
for (const alias of ["ab-105840", "ab-105843"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105837"];
}
for (const alias of ["ab-105735", "ab-105738", "ab-105741"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105732"];
}
for (const alias of ["ab-105736", "ab-105739", "ab-105742"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105733"];
}
for (const alias of ["ab-105749", "ab-105752", "ab-105755"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105746"];
}
for (const alias of ["ab-105750", "ab-105753", "ab-105756"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105747"];
}
for (const alias of AB_105845_LAYOUT_ALIAS_SLUGS) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105845"];
}
for (const alias of AB_105846_LAYOUT_ALIAS_SLUGS) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105846"];
}
const OVEN_DRAWER_TOP_RATIO_BY_SLUG = {
  // PDF-measured seam between the oven and the drawer below it. The oven ends
  // on this line and the independently selectable drawer starts on the same line.
  "ab-105743": 0.661358,
  "ab-105748": 0.66065,
  // Exact seam joining the oven quad to the drawer quad in the vector PDF.
  "ab-105758": 0.8229792919171677,
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

const OVEN_PART_SOURCE_POINTS_BY_SLUG = {
  "ab-105758": {
    oven: [
      [46.218527, 54.783193],
      [55.653207, 56.739496],
      [55.653207, 76.685714],
      [46.218527, 74.749580],
    ],
    "oven-drawer": [
      [46.218527, 74.749580],
      [55.653207, 76.685714],
      [55.653207, 86.910924],
      [46.218527, 84.974790],
    ],
  },
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
const SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG = {
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
  "ab-105846": splitWorktopDefinition(
    { left: 6.783848, top: 51.979832, width: 61.168646, height: 10.366387 },
    // The top-surface joint follows the worktop depth in perspective, from the
    // back edge to the inner L corner. The thin fascia then drops vertically.
    [
      [6.783848, 58.695798], [42.41, 53.536499], [51.163895, 55.912605],
      [51.163895, 57.42521], [17.2019, 62.346218], [6.783848, 60.208403],
    ],
    [
      [42.41, 53.536499], [53.159145, 51.979832],
      [67.952494, 55.005042], [67.952494, 60.894118],
      [51.163895, 57.42521], [51.163895, 55.912605],
    ],
  ),
  "ab-104968": splitWorktopDefinition(
    { left: 5.57, top: 50.91, width: 66.77, height: 10.64 },
    // Each polygon includes the horizontal surface and its thin front fascia.
    // The shared corner ends at the PDF seam x=43.966746, so selecting one
    // worktop leg cannot spill into the fascia belonging to the other leg.
    [
      [5.572447, 56.820168], [34.817102, 52.584874],
      [43.966746, 54.460504], [43.966746, 55.791597],
      [14.72209, 60.026891], [5.572447, 58.151261],
    ],
    [
      [34.817102, 52.584874], [45.719715, 51.011765],
      [72.39905, 56.477311], [72.39905, 61.640336],
      [43.966746, 55.791597],
    ],
  ),
  "ab-105825": {
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-right"],
  },
  "ab-105758": {
    // Left/right top surfaces, left/right fascias, then the floor-height end panel.
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right", "worktop-end-panel"],
  },
  "ab-105831": {
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"],
  },
  "ab-105743": {
    // Top surfaces, front fascias, then the floor-height end panel.
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right", "worktop-end-panel"],
  },
  "ab-105748": {
    // Left leg, right leg, then the WU16 floor-height end panel.
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-end-panel"],
  },
  "ab-105837": {
    // Left/right surfaces, left/right fascias, then the WU16 cabinet side panel.
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right", "worktop-end-panel"],
  },
  "ab-105833": {
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  "ab-105836": {
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  "ab-105842": {
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  "ab-105845": {
    indexPartKeys: ["worktop-left", "worktop-right"],
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

// The AB 105807 PDF draws a narrow floor-height return at the right end of the
// horizontal worktop. Coordinates are measured from the 3509 x 2480 render.
// They are converted relative to the cropped horizontal hotspot below so the
// claims overlay stays aligned with the responsive plan crop.
const WORKTOP_END_PANEL_DEFINITIONS_BY_SLUG = {
  "ab-105807": {
    source: { left: 4.49, top: 62.14, width: 63.92, height: 1.49 },
    panel: { left: 67.99658, top: 62.14, right: 68.395554, bottom: 96.13 },
  },
};

for (const alias of ["ab-105809", "ab-105813", "ab-105817"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105805"];
}
for (const alias of ["ab-105822", "ab-105828"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105825"];
}
for (const alias of ["ab-105840", "ab-105843"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105837"];
}
for (const alias of ["ab-105734", "ab-105737", "ab-105740"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-104968"];
  COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[alias] = COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG["ab-104968"];
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-104968"];
}
for (const alias of ["ab-105750", "ab-105753", "ab-105756"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105747"];
}
for (const alias of ["ab-105751", "ab-105754", "ab-105745"]) {
  L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG[alias] = L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG["ab-105748"];
  COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[alias] = COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG["ab-105748"];
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105748"];
  OVEN_DRAWER_TOP_RATIO_BY_SLUG[alias] = OVEN_DRAWER_TOP_RATIO_BY_SLUG["ab-105748"];
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105748"];
}
for (const alias of AB_105846_LAYOUT_ALIAS_SLUGS) {
  L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG[alias] =
    L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG["ab-105846"];
  L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[alias] =
    L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG["ab-105846"];
  COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[alias] =
    COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG["ab-105846"];
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] =
    SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105846"];
}
SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105839"] =
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105842"];
for (const alias of ["ab-105848", "ab-105851", "ab-105854", "ab-105857", "ab-105860"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] =
    SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105845"];
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

function elevationSinkHotspot(hotspots, part, sinkCabinetSourceKey = "sink-base") {
  const sinkBase = hotspots.find(
    (hotspot) => hotspot?.componentKey === sinkCabinetSourceKey,
  );
  if (!sinkBase) return null;

  const stripHeight = 1.2;
  return {
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
    left: Number(sinkBase.left || 0),
    top: Number(sinkBase.top || 0) - stripHeight,
    width: Number(sinkBase.width || 0),
    height: stripHeight,
    preserveManualSize: true,
  };
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
  const exactSourcePoints = OVEN_PART_SOURCE_POINTS_BY_SLUG[kitchenSlug]?.[part.partKey];
  const exactDisplayPoints = exactSourcePoints
    ? sourcePlanPointsToDisplay(hotspot, exactSourcePoints)
    : null;
  if (exactDisplayPoints) {
    return [hotspotFromDisplayPoints(hotspot, part, exactDisplayPoints)];
  }

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
    entry?.claimPartKey === "blende" && !entry.isCompanionOption && entry.sourceComponentKey && entry.componentId,
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
    if (calibration?.includeOuterFace) {
      const bounds = hotspotBounds(hotspot);
      const outer = Number(calibration.outer);
      const isExposedOuterFace = calibration.side === "left"
        ? bounds.right <= outer + 0.001
        : bounds.left >= outer - 0.001;
      if (isExposedOuterFace) {
        return [{
          ...hotspot,
          componentId: blende.componentId,
          componentKey: blende.componentKey || `claim-blende-${sourceKey}`,
          claimPartKey: "blende",
          claimBlendeSplit: true,
          sourceComponentKey: sourceKey,
          blendeSide: calibration.side,
          claimBlendeOuterFace: true,
        }];
      }
    }
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

function sourcePlanPointsToDisplay(hotspot, sourcePlanPoints) {
  const sourcePoints = Array.isArray(hotspot?.points) ? hotspot.points : [];
  const sourceXs = sourcePoints.map(([x]) => Number(x)).filter(Number.isFinite);
  const sourceYs = sourcePoints.map(([, y]) => Number(y)).filter(Number.isFinite);
  if (!sourceXs.length || !sourceYs.length) return null;

  const sourceLeft = Math.min(...sourceXs);
  const sourceTop = Math.min(...sourceYs);
  const sourceWidth = Math.max(Math.max(...sourceXs) - sourceLeft, 0.000001);
  const sourceHeight = Math.max(Math.max(...sourceYs) - sourceTop, 0.000001);
  const displayLeft = Number(hotspot.left || 0);
  const displayTop = Number(hotspot.top || 0);
  const displayWidth = Number(hotspot.width || 0);
  const displayHeight = Number(hotspot.height || 0);

  return sourcePlanPoints.map(([x, y]) => [
    displayLeft + ((Number(x) - sourceLeft) / sourceWidth) * displayWidth,
    displayTop + ((Number(y) - sourceTop) / sourceHeight) * displayHeight,
  ]);
}

function lShapedSinkHotspot(hotspot, part, kitchenSlug) {
  const sourcePlanPoints = L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[kitchenSlug];
  const exactDisplayPoints = sourcePlanPoints
    ? sourcePlanPointsToDisplay(hotspot, sourcePlanPoints)
    : null;
  if (exactDisplayPoints) {
    return hotspotFromDisplayPoints(hotspot, part, exactDisplayPoints);
  }

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
  const sourcePlanPoints = COOKTOP_SOURCE_POINTS_BY_SLUG[kitchenSlug];
  const exactDisplayPoints = sourcePlanPoints
    ? sourcePlanPointsToDisplay(hotspot, sourcePlanPoints)
    : null;
  if (exactDisplayPoints) {
    return hotspotFromDisplayPoints(hotspot, part, exactDisplayPoints);
  }

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

function isFloorHeightWorktopEndPanel(hotspot) {
  const width = Number(hotspot?.width || 0);
  const height = Number(hotspot?.height || 0);
  return height >= 10 && height > width * 3;
}

function projectedWorktopEndPanelBounds(hotspot, definition) {
  const source = definition.source;
  const panel = definition.panel;
  const scaleX = Number(hotspot.width || 0) / source.width;
  const scaleY = Number(hotspot.height || 0) / source.height;
  const left = Number(hotspot.left || 0) + (panel.left - source.left) * scaleX;
  const top = Number(hotspot.top || 0) + (panel.top - source.top) * scaleY;
  return {
    left,
    top,
    width: (panel.right - panel.left) * scaleX,
    height: (panel.bottom - panel.top) * scaleY,
  };
}

function trimCabinetAtWorktopEndPanel(hotspot, panels) {
  if (
    String(hotspot?.componentKey || "").trim() === "worktop"
    || hotspot?.clipPath
  ) {
    return hotspot;
  }

  return panels.reduce((current, panel) => {
    const left = Number(current.left || 0);
    const top = Number(current.top || 0);
    const width = Number(current.width || 0);
    const height = Number(current.height || 0);
    const right = left + width;
    const bottom = top + height;
    const panelRight = panel.left + panel.width;
    const panelBottom = panel.top + panel.height;
    const overlapY = Math.min(bottom, panelBottom) - Math.max(top, panel.top);

    if (
      width <= panel.width * 2
      || overlapY < Math.min(height, panel.height) * 0.5
      || right <= panel.left
      || left >= panelRight
    ) {
      return current;
    }

    const hotspotCenter = left + width / 2;
    const panelCenter = panel.left + panel.width / 2;
    if (hotspotCenter < panelCenter) {
      return {
        ...current,
        width: Math.max(0, panel.left - left),
        claimWorktopEndPanelAdjacentTrim: true,
      };
    }
    return {
      ...current,
      left: panelRight,
      width: Math.max(0, right - panelRight),
      claimWorktopEndPanelAdjacentTrim: true,
    };
  }, hotspot);
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

function splitWorktopEndPanelHotspots(hotspot, part, definition) {
  const panelBounds = projectedWorktopEndPanelBounds(hotspot, definition);
  const panelLeft = panelBounds.left;
  const panelTop = panelBounds.top;
  const panelWidth = panelBounds.width;
  const panelHeight = panelBounds.height;
  const mainWidth = Math.max(0, panelLeft - Number(hotspot.left || 0));

  const mainWorktop = {
    ...hotspot,
    width: mainWidth,
  };
  const endPanel = {
    ...hotspot,
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
    left: panelLeft,
    top: panelTop,
    width: panelWidth,
    height: panelHeight,
    claimWorktopEndPanelSplit: true,
  };
  delete endPanel.clipPath;
  delete endPanel.points;
  return [mainWorktop, endPanel];
}

export function buildServiceClaimPartHotspots(hotspots = [], claimParts = [], kitchenSlug = "") {
  // Parts without a meaningful independent drawing are manual options below
  // the plan. They must not take over their source component's visible hotspot.
  const normalizedParts = (claimParts || [])
    .map(normalizeClaimPart)
    .filter((part) => part && !["filter", "furniture-front"].includes(part.partKey));
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
  const elevationSinkCabinetSourceKey = normalizedParts.find(
    (part) => part.partKey === "sink-cabinet",
  )?.sourceComponentKey || "sink-base";
  const worktopDefinition = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[normalizedSlug];
  const worktopEndPanelDefinition = WORKTOP_END_PANEL_DEFINITIONS_BY_SLUG[normalizedSlug];
  const worktopParts = new Map(
    (partsBySourceKey.get("worktop") || []).map((part) => [part.partKey, part]),
  );
  const worktopEndPanelPart = worktopParts.get("worktop-end-panel");
  const hasSplitWorktopParts = worktopParts.has("worktop-left") && worktopParts.has("worktop-right");
  const worktopEndPanels = worktopEndPanelPart
    ? (hotspots || [])
      .filter((hotspot) => (
        String(hotspot?.componentKey || "").trim() === "worktop"
        && isFloorHeightWorktopEndPanel(hotspot)
      ))
      .map((hotspot) => ({
        left: Number(hotspot.left || 0),
        top: Number(hotspot.top || 0),
        width: Number(hotspot.width || 0),
        height: Number(hotspot.height || 0),
      }))
    : [];
  if (worktopEndPanelPart && worktopEndPanelDefinition && !worktopEndPanels.length) {
    const horizontalWorktop = (hotspots || []).find((hotspot) => (
      String(hotspot?.componentKey || "").trim() === "worktop"
      && !isFloorHeightWorktopEndPanel(hotspot)
    ));
    if (horizontalWorktop) {
      worktopEndPanels.push(
        projectedWorktopEndPanelBounds(horizontalWorktop, worktopEndPanelDefinition),
      );
    }
  }
  let worktopIndex = -1;
  const primarySinkFixtureIndex = (hotspots || []).findIndex(
    (hotspot) => String(hotspot?.componentKey || "").trim() === "sink-faucet",
  );

  return (hotspots || []).flatMap((sourceHotspot, hotspotIndex) => {
    const hotspot = trimCabinetAtWorktopEndPanel(sourceHotspot, worktopEndPanels);
    const sourceComponentKey = String(hotspot?.componentKey || "").trim();
    const sourceParts = partsBySourceKey.get(sourceComponentKey) || [];
    if (!sourceParts.length) {
      return [hotspot];
    }
    if (
      sourceComponentKey === "worktop"
      && worktopEndPanelPart
      && isFloorHeightWorktopEndPanel(hotspot)
    ) {
      return [{
        ...existingClaimPartHotspot(hotspot, worktopEndPanelPart),
        claimWorktopEndPanelSplit: true,
      }];
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
    if (sourceComponentKey === "worktop" && worktopEndPanelDefinition) {
      if (worktopEndPanelPart) {
        return splitWorktopEndPanelHotspots(hotspot, worktopEndPanelPart, worktopEndPanelDefinition);
      }
    }
    // Existing horizontal worktops remain the original selectable item. The
    // end panel is additive and is represented either by its own tall source
    // hotspot above or by a PDF-derived definition such as AB 105807.
    if (sourceComponentKey === "worktop" && worktopEndPanelPart) {
      return [hotspot];
    }
    const visibleSourceParts = sourceParts;

    return visibleSourceParts.flatMap((part) => {
      if (!hasVisibleSink && part.partKey === "sink") {
        return hotspotIndex === primarySinkFixtureIndex
          ? elevationSinkHotspot(hotspots, part, elevationSinkCabinetSourceKey) || []
          : [];
      }
      if (part.partKey === "faucet") {
        return {
          ...hotspot,
          componentId: part.componentId,
          componentKey: `claim-${part.partKey}`,
          claimPartKey: part.partKey,
        };
      }
      if (hasVisibleSink && part.partKey === "sink") {
        // AB 105758 traces the faucet as three independently clickable
        // silhouettes. Emit its separately traced sink bowl only once.
        if (
          L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[normalizedSlug]
          && hotspotIndex !== primarySinkFixtureIndex
        ) {
          return [];
        }
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
