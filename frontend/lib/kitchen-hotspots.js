import fs from "fs";
import os from "os";
import path from "path";
import { ItemType } from "@prisma/client";
import { runPython } from "./kitchen-plan-python.js";

function decodePublicPath(encodedPath) {
  const relative = decodeURIComponent(String(encodedPath || "").replace(/^\//, ""));
  return path.join(process.cwd(), "public", ...relative.split("/"));
}

function planBaseNameFromPath(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

export function resolvePlanJpgPath({ planImagePath, planPdfPath }) {
  const candidates = [];
  const addCandidate = (baseName) => {
    const safeBaseName = baseName.replace(/[<>:"/\\|?*]/g, "-");
    candidates.push(path.join(process.cwd(), "public", "jpg", `${safeBaseName}_page-0001.jpg`));
  };

  if (planPdfPath) {
    addCandidate(planBaseNameFromPath(decodePublicPath(planPdfPath)));
  }
  if (planImagePath) {
    addCandidate(planBaseNameFromPath(decodePublicPath(planImagePath)));
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

export function ensurePlanJpg({ planImagePath, planPdfPath }) {
  const existing = resolvePlanJpgPath({ planImagePath, planPdfPath });
  if (existing) {
    return existing;
  }

  if (!planPdfPath) {
    return null;
  }

  const pdfPath = decodePublicPath(planPdfPath);
  if (!fs.existsSync(pdfPath)) {
    return null;
  }

  const jpgDir = path.join(process.cwd(), "public", "jpg");
  fs.mkdirSync(jpgDir, { recursive: true });
  const baseName = planBaseNameFromPath(pdfPath).replace(/[<>:"/\\|?*]/g, "-");
  const jpgPath = path.join(jpgDir, `${baseName}_page-0001.jpg`);

  try {
    runPython("render-plan-pdf.py", [pdfPath, jpgPath]);
  } catch {
    return null;
  }

  return fs.existsSync(jpgPath) ? jpgPath : null;
}

const STANDARD_BASE_SLOT_ORDER = [
  "base-module-1",
  "oven-module",
  "base-module-2",
  "base-module-3",
  "sink-base",
  "drawer-module",
];

const COMPACT_BASE_ORDERS = [
  ["base-module-1", "sink-base", "base-module-3", "oven-module"],
  ["base-module-2", "base-module-3", "oven-module", "drawer-module"],
];

function isWallCabinetKey(componentKey) {
  return componentKey?.startsWith("wall-cabinet");
}

function isBaseRunKey(componentKey) {
  return Boolean(
    componentKey?.match(/^(base-module|oven-module|sink-base|drawer-module)/),
  );
}

function calloutSortValue(item) {
  const nr = Number.parseInt(String(item.calloutNumber || ""), 10);
  return Number.isFinite(nr) ? nr : Number.MAX_SAFE_INTEGER;
}

function wallCabinetIndex(componentKey) {
  const match = componentKey?.match(/^wall-cabinet-(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

/**
 * Infer fridge side from PDF callout positions when available.
 * Falls back to sortOrder-based inference.
 */
export function inferFridgeSide(items, callouts = []) {
  const calloutByNr = new Map(callouts.map((callout) => [String(callout.nr), callout]));
  const fridge = items.find((item) => item.componentKey === "refrigerator");
  if (fridge?.calloutNumber) {
    const fridgeCallout = calloutByNr.get(String(fridge.calloutNumber));
    const runCallouts = items
      .filter((item) => isWallCabinetKey(item.componentKey) || isBaseRunKey(item.componentKey))
      .map((item) => calloutByNr.get(String(item.calloutNumber)))
      .filter(Boolean);

    if (fridgeCallout && runCallouts.length) {
      const runXs = runCallouts.map((callout) => callout.xPct).sort((left, right) => left - right);
      const medianRunX = runXs[Math.floor(runXs.length / 2)];
      if (fridgeCallout.xPct > medianRunX + 2) {
        return "right";
      }
      if (fridgeCallout.xPct < medianRunX - 2) {
        return "left";
      }
    }
  }

  if (!fridge) {
    return "none";
  }

  const runItems = items.filter(
    (item) => isWallCabinetKey(item.componentKey) || isBaseRunKey(item.componentKey),
  );
  if (!runItems.length) {
    return "right";
  }

  const avgRunSort =
    runItems.reduce((sum, item) => sum + (item.sortOrder ?? 0), 0) / runItems.length;
  return (fridge.sortOrder ?? 0) > avgRunSort ? "right" : "left";
}

function sortComponentKeysByCalloutX(items, predicate, calloutByNr) {
  return items
    .filter(predicate)
    .sort((left, right) => {
      const leftX = calloutByNr.get(String(left.calloutNumber || ""))?.xPct;
      const rightX = calloutByNr.get(String(right.calloutNumber || ""))?.xPct;
      if (Number.isFinite(leftX) && Number.isFinite(rightX) && leftX !== rightX) {
        return leftX - rightX;
      }
      return calloutSortValue(left) - calloutSortValue(right);
    })
    .map((item) => item.componentKey);
}

export function buildComponentSlotKeys(items, callouts = []) {
  const calloutByNr = new Map(callouts.map((callout) => [String(callout.nr), callout]));
  const fridgeSide = inferFridgeSide(items, callouts);
  const hasCalloutPositions = calloutByNr.size > 0;

  const wall = hasCalloutPositions
    ? sortComponentKeysByCalloutX(items, (item) => isWallCabinetKey(item.componentKey), calloutByNr)
    : items
        .filter((item) => isWallCabinetKey(item.componentKey))
        .sort((left, right) => wallCabinetIndex(left.componentKey) - wallCabinetIndex(right.componentKey))
        .map((item) => item.componentKey);

  const base = hasCalloutPositions
    ? sortComponentKeysByCalloutX(items, (item) => isBaseRunKey(item.componentKey), calloutByNr)
    : fridgeSide === "right"
      ? compactBaseHotspotOrder(items)
      : standardBaseHotspotOrder(items);

  const calloutMap = {};
  for (const item of items) {
    const nr = String(item.calloutNumber || "").trim();
    if (nr && item.componentKey) {
      calloutMap[nr] = item.componentKey;
    }
  }

  const hoodWallCabinet = items.find(
    (item) =>
      item.componentKey?.startsWith("wall-cabinet") &&
      /FH664621E|HD6002|HOOD|DUNST/i.test(String(item.articleNumber || item.infoText || "").toUpperCase()),
  )?.componentKey;

  return {
    refrigerator: items.some((item) => item.componentKey === "refrigerator") ? "refrigerator" : null,
    fridgeSide,
    wall,
    base,
    worktop: items.some((item) => item.componentKey === "worktop") ? "worktop" : null,
    hoodWallCabinet: hoodWallCabinet || null,
    extractorHood: items.some((item) => item.componentKey === "extractor-hood") ? "extractor-hood" : null,
    sinkFaucet: items.some((item) => item.componentKey === "sink-faucet") ? "sink-faucet" : null,
    calloutMap,
  };
}

function compactBaseHotspotOrder(items) {
  const keys = new Set(items.map((item) => item.componentKey));
  for (const order of COMPACT_BASE_ORDERS) {
    const present = order.filter((key) => keys.has(key));
    if (present.length >= 3) {
      return present;
    }
  }

  return items
    .filter((item) => isBaseRunKey(item.componentKey))
    .sort((left, right) => calloutSortValue(left) - calloutSortValue(right))
    .map((item) => item.componentKey);
}

function standardBaseHotspotOrder(items) {
  return items
    .filter((item) => isBaseRunKey(item.componentKey))
    .sort((left, right) => {
      const leftIndex = STANDARD_BASE_SLOT_ORDER.indexOf(left.componentKey);
      const rightIndex = STANDARD_BASE_SLOT_ORDER.indexOf(right.componentKey);
      const leftOrder = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const rightOrder = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
    })
    .map((item) => item.componentKey);
}

/**
 * Extract callout number positions from a PDF plan using the text layer.
 * Returns an array of { nr, xPct, yPct } or an empty array if the PDF has no
 * callout text (e.g. the numbers are embedded as vector art).
 */
export function extractCalloutsFromPdf(pdfPath) {
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    return [];
  }
  try {
    const output = runPython("detect-plan-callouts.py", [pdfPath]);
    const callouts = JSON.parse(output);
    return Array.isArray(callouts) ? callouts : [];
  } catch {
    return [];
  }
}

export function buildHotspotsFromJpg(jpgPath, componentSlotKeys, { pdfPath } = {}) {
  if (!jpgPath || !fs.existsSync(jpgPath)) {
    throw new Error(`Plan JPG not found at ${jpgPath || "(missing path)"}.`);
  }

  if (!componentSlotKeys?.wall?.length && !componentSlotKeys?.base?.length) {
    throw new Error("No component slots found for hotspot generation.");
  }

  const ts = Date.now();
  const keysFile = path.join(os.tmpdir(), `kitchen-hotspot-keys-${ts}.json`);
  fs.writeFileSync(keysFile, JSON.stringify(componentSlotKeys));

  // Attempt to extract callout positions from the PDF text layer.
  const callouts = pdfPath ? extractCalloutsFromPdf(pdfPath) : [];
  let calloutsFile = null;
  if (callouts.length > 0) {
    calloutsFile = path.join(os.tmpdir(), `kitchen-callouts-${ts}.json`);
    fs.writeFileSync(calloutsFile, JSON.stringify(callouts));
  }

  try {
    const args = [jpgPath, keysFile];
    if (calloutsFile) args.push(calloutsFile);
    const output = runPython("build-hotspots-json.py", args);
    const hotspots = JSON.parse(output);
    if (!Array.isArray(hotspots) || !hotspots.length) {
      throw new Error("Hotspot builder returned no boxes.");
    }
    return hotspots;
  } finally {
    fs.unlinkSync(keysFile);
    if (calloutsFile && fs.existsSync(calloutsFile)) {
      fs.unlinkSync(calloutsFile);
    }
  }
}

export function generateHotspotsForItems(items, planPaths) {
  const componentItems = items.filter(
    (item) => item.itemType === ItemType.COMPONENT && item.isActive !== false,
  );
  const pdfPath = planPaths?.planPdfPath
    ? (() => {
        const decoded = decodeURIComponent(String(planPaths.planPdfPath).replace(/^\//, ""));
        return path.join(process.cwd(), "public", ...decoded.split("/"));
      })()
    : null;
  const callouts = pdfPath ? extractCalloutsFromPdf(pdfPath) : [];
  const componentSlotKeys = buildComponentSlotKeys(componentItems, callouts);
  const jpgPath = ensurePlanJpg(planPaths);

  if (!jpgPath) {
    return {
      hotspots: null,
      warning: "Plan JPG not found. Upload a PDF or run the import pipeline first.",
    };
  }

  try {
    const hotspots = buildHotspotsFromJpg(jpgPath, componentSlotKeys, { pdfPath });
    return { hotspots, warning: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hotspot generation failed.";
    return { hotspots: null, warning: message };
  }
}

export async function syncKitchenHotspots(prismaClient, kitchenId, options = {}) {
  const { force = false } = options;

  const kitchen = await prismaClient.kitchen.findUnique({
    where: { id: kitchenId },
    include: {
      items: {
        where: { itemType: ItemType.COMPONENT, isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!kitchen) {
    return { updated: false, warning: "Kitchen not found." };
  }

  if (!force && Array.isArray(kitchen.hotspots) && kitchen.hotspots.length > 0) {
    return { updated: false, skipped: true };
  }

  if (!kitchen.planImagePath && !kitchen.planPdfPath) {
    return { updated: false, warning: "Kitchen has no plan image or PDF path." };
  }

  const { hotspots, warning } = generateHotspotsForItems(kitchen.items, {
    planImagePath: kitchen.planImagePath,
    planPdfPath: kitchen.planPdfPath,
  });

  if (!hotspots?.length) {
    return { updated: false, warning };
  }

  await prismaClient.kitchen.update({
    where: { id: kitchenId },
    data: { hotspots },
  });

  return { updated: true, hotspotCount: hotspots.length, warning: null };
}

export async function autoSyncKitchenHotspots(prismaClient, kitchenId, options = {}) {
  try {
    return await syncKitchenHotspots(prismaClient, kitchenId, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hotspot sync failed.";
    console.warn(`Could not sync hotspots for kitchen ${kitchenId}: ${message}`);
    return { updated: false, warning: message };
  }
}
