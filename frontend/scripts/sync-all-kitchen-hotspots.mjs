import { PrismaClient } from "@prisma/client";
import { autoSyncKitchenHotspots } from "../lib/kitchen-hotspots.js";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");

try {
  const kitchens = await prisma.kitchen.findMany({
    where: {
      OR: [{ planImagePath: { not: null } }, { planPdfPath: { not: null } }],
    },
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const kitchen of kitchens) {
    const result = await autoSyncKitchenHotspots(prisma, kitchen.id, { force });
    if (result.updated) {
      updated += 1;
      console.log(`${kitchen.slug}: ${result.hotspotCount} hotspots`);
    } else if (result.warning) {
      failed += 1;
      console.warn(`${kitchen.slug}: ${result.warning}`);
    } else {
      skipped += 1;
    }
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped}, failed ${failed}.`);
} finally {
  await prisma.$disconnect();
}
