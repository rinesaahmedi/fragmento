import fs from "fs";
import path from "path";
import { PrismaClient, ItemType } from "@prisma/client";
import {
  finalizeImportedKitchenHotspots,
  verifyKitchenHotspotCoverage,
  writeHotspotOverlayPng,
} from "../lib/kitchen-hotspot-verify.js";

const prisma = new PrismaClient();
const slug = process.argv[2];
const shouldRepair = process.argv.includes("--repair");
const shouldWriteOverlay = !process.argv.includes("--no-overlay");

if (!slug) {
  console.error("Usage: node scripts/verify-kitchen-hotspots.mjs <slug> [--repair] [--no-overlay]");
  process.exit(1);
}

const kitchen = await prisma.kitchen.findFirst({
  where: {
    OR: [{ slug }, { kitchenCode: { contains: slug } }],
  },
  include: {
    items: { where: { itemType: ItemType.COMPONENT, isActive: true }, orderBy: { sortOrder: "asc" } },
  },
});

if (!kitchen) {
  console.error(`Kitchen ${slug} not found.`);
  process.exit(1);
}

let hotspots = kitchen.hotspots || [];
let repair = { updated: 0 };

if (shouldRepair) {
  const finalized = await finalizeImportedKitchenHotspots(prisma, kitchen.id, {
    writeOverlay: shouldWriteOverlay,
  });
  repair = finalized.repair;
  console.log(`Repair updated ${repair.updated || 0} component keys.`);
  if (finalized.sync?.updated) {
    console.log(`Hotspots regenerated: ${finalized.sync.hotspotCount}`);
  }
  if (finalized.overlay?.written) {
    console.log(`Overlay: ${finalized.overlay.path}`);
  }
  if (finalized.ok) {
    console.log(
      `OK: ${finalized.verification.hotspotCount} hotspots cover ${finalized.verification.expectedCount} components.`,
    );
    await prisma.$disconnect();
    process.exit(0);
  }
  console.error("Verification failed:");
  for (const error of finalized.errors || finalized.verification?.errors || []) {
    console.error(`- ${error}`);
  }
  await prisma.$disconnect();
  process.exit(1);
}

const verification = verifyKitchenHotspotCoverage(kitchen.items, hotspots);
if (shouldWriteOverlay && hotspots.length) {
  const outDir = path.join(process.cwd(), "public", "hotspot-overlays");
  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, `${kitchen.slug}-hotspots.png`);
  const overlay = writeHotspotOverlayPng({
    planImagePath: kitchen.planImagePath,
    planPdfPath: kitchen.planPdfPath,
    hotspots,
    outputPath,
  });
  if (overlay.written) {
    console.log(`Overlay: ${overlay.path}`);
  } else if (overlay.warning) {
    console.warn(overlay.warning);
  }
}

if (verification.ok) {
  console.log(`OK: ${verification.hotspotCount} hotspots cover ${verification.expectedCount} components.`);
  await prisma.$disconnect();
  process.exit(0);
}

console.error("Verification failed:");
for (const error of verification.errors) {
  console.error(`- ${error}`);
}
await prisma.$disconnect();
process.exit(1);
