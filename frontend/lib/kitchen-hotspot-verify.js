import fs from "fs";
import os from "os";
import path from "path";
import { ItemType } from "@prisma/client";
import { buildCalloutBasedComponentKeyMap } from "./kitchen-import-callout-mapping.js";
import { autoSyncKitchenHotspots, extractCalloutsFromPdf, resolvePlanJpgPath } from "./kitchen-hotspots.js";
import { runPython } from "./kitchen-plan-python.js";

const HIDDEN_COMPONENT_KEYS = new Set(["extractor-hood"]);
const OVERLAP_EXEMPT_KEYS = new Set(["worktop", "sink-faucet", "extractor-hood"]);
const MAX_OVERLAP_RATIO = 0.25;

function hotspotArea(box) {
  return Math.max(0, Number(box.width) || 0) * Math.max(0, Number(box.height) || 0);
}

function overlapArea(left, a, b) {
  const x0 = Math.max(a.left, b.left);
  const y0 = Math.max(a.top, b.top);
  const x1 = Math.min(a.left + a.width, b.left + b.width);
  const y1 = Math.min(a.top + a.height, b.top + b.height);
  if (x1 <= x0 || y1 <= y0) {
    return 0;
  }
  return (x1 - x0) * (y1 - y0);
}

function supplierRowFromItem(item) {
  const articles = String(item.articleNumber || item.infoText || item.name || "").trim();
  return {
    nr: String(item.calloutNumber),
    articles,
    articlesUpper: articles.toUpperCase(),
    dimensions: [item.widthMm, item.heightMm, item.depthMm].filter(Boolean).join(" x ") + (item.widthMm ? " mm" : ""),
    isDefault: /^DEFAULT$/i.test(articles),
    rowNumber: item.calloutNumber,
  };
}

export function verifyKitchenHotspotCoverage(items = [], hotspots = []) {
  const errors = [];
  const expectedKeys = items
    .filter(
      (item) =>
        item.itemType === ItemType.COMPONENT &&
        item.isActive !== false &&
        item.componentKey &&
        !HIDDEN_COMPONENT_KEYS.has(item.componentKey),
    )
    .map((item) => item.componentKey);

  const hotspotKeys = hotspots.map((box) => box.componentKey).filter(Boolean);
  const hotspotKeySet = new Set(hotspotKeys);

  for (const componentKey of expectedKeys) {
    const matches = hotspotKeys.filter((key) => key === componentKey);
    if (matches.length === 0) {
      errors.push(`Missing hotspot for componentKey "${componentKey}".`);
    } else if (matches.length > 1) {
      errors.push(`Duplicate hotspots for componentKey "${componentKey}".`);
    }
  }

  for (let left = 0; left < hotspots.length; left += 1) {
    for (let right = left + 1; right < hotspots.length; right += 1) {
      const a = hotspots[left];
      const b = hotspots[right];
      if (!a?.componentKey || !b?.componentKey) {
        continue;
      }
      if (OVERLAP_EXEMPT_KEYS.has(a.componentKey) || OVERLAP_EXEMPT_KEYS.has(b.componentKey)) {
        continue;
      }
      const shared = overlapArea(left, a, b);
      const smaller = Math.min(hotspotArea(a), hotspotArea(b));
      if (smaller > 0 && shared / smaller > MAX_OVERLAP_RATIO) {
        errors.push(
          `Hotspots "${a.componentKey}" and "${b.componentKey}" overlap ${Math.round((shared / smaller) * 100)}%.`,
        );
      }
    }
  }

  if (hotspots.some((box) => !box?.componentKey)) {
    errors.push("One or more hotspots are missing componentKey.");
  }

  return {
    ok: errors.length === 0,
    errors,
    expectedCount: expectedKeys.length,
    hotspotCount: hotspotKeySet.size,
  };
}

export function writeHotspotOverlayPng({ planImagePath, planPdfPath, hotspots, outputPath }) {
  const jpgPath = resolvePlanJpgPath({ planImagePath, planPdfPath });
  if (!jpgPath || !fs.existsSync(jpgPath)) {
    return { written: false, warning: "Plan JPG not found for overlay." };
  }

  const boxesFile = path.join(os.tmpdir(), `kitchen-hotspot-verify-${Date.now()}.json`);
  fs.writeFileSync(boxesFile, JSON.stringify(hotspots));
  try {
    runPython("detect-plan-hotspots.py", [jpgPath, "--overlay", boxesFile, outputPath]);
    return { written: fs.existsSync(outputPath), path: outputPath };
  } finally {
    if (fs.existsSync(boxesFile)) {
      fs.unlinkSync(boxesFile);
    }
  }
}

export async function repairKitchenComponentKeys(prismaClient, kitchenId) {
  const kitchen = await prismaClient.kitchen.findUnique({
    where: { id: kitchenId },
    include: {
      items: { where: { itemType: ItemType.COMPONENT }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!kitchen) {
    return { updated: 0, warning: "Kitchen not found." };
  }

  const pdfPath = kitchen.planPdfPath
    ? path.join(process.cwd(), "public", ...decodeURIComponent(kitchen.planPdfPath.replace(/^\//, "")).split("/"))
    : null;
  const callouts = pdfPath ? extractCalloutsFromPdf(pdfPath) : [];
  const supplierRows = kitchen.items.filter((item) => item.calloutNumber).map(supplierRowFromItem);
  const keyMap = buildCalloutBasedComponentKeyMap(supplierRows, callouts);

  if (!keyMap) {
    return { updated: 0, warning: "Could not build component key map." };
  }

  let updated = 0;
  for (const item of kitchen.items) {
    if (!item.calloutNumber) {
      continue;
    }
    const nextKey = keyMap.get(String(item.calloutNumber));
    if (!nextKey || nextKey === item.componentKey) {
      continue;
    }
    await prismaClient.kitchenItem.update({
      where: { id: item.id },
      data: { componentKey: nextKey },
    });
    updated += 1;
  }

  return { updated };
}

export async function finalizeImportedKitchenHotspots(prismaClient, kitchenId, options = {}) {
  const { writeOverlay = false, overlayDir } = options;
  const repair = await repairKitchenComponentKeys(prismaClient, kitchenId);
  const sync = await autoSyncKitchenHotspots(prismaClient, kitchenId, { force: true });

  const kitchen = await prismaClient.kitchen.findUnique({
    where: { id: kitchenId },
    include: {
      items: { where: { itemType: ItemType.COMPONENT, isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!kitchen) {
    return { ok: false, errors: ["Kitchen not found after import."], repair, sync };
  }

  const verification = verifyKitchenHotspotCoverage(kitchen.items, kitchen.hotspots || []);
  let overlay = null;

  if (writeOverlay) {
    const outDir = overlayDir || path.join(process.cwd(), "public", "hotspot-overlays");
    fs.mkdirSync(outDir, { recursive: true });
    const outputPath = path.join(outDir, `${kitchen.slug.replace(/[^a-z0-9-]+/gi, "-")}-hotspots.png`);
    overlay = writeHotspotOverlayPng({
      planImagePath: kitchen.planImagePath,
      planPdfPath: kitchen.planPdfPath,
      hotspots: kitchen.hotspots || [],
      outputPath,
    });
  }

  return {
    ok: verification.ok && Boolean(sync.updated || kitchen.hotspots?.length),
    verification,
    repair,
    sync,
    overlay,
    errors: [
      ...(sync.warning && !kitchen.hotspots?.length ? [sync.warning] : []),
      ...verification.errors,
    ],
  };
}
