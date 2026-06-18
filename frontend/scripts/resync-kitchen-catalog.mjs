import { PrismaClient, ItemType } from "@prisma/client";
import path from "path";
import { autoSyncKitchenHotspots, extractCalloutsFromPdf } from "../lib/kitchen-hotspots.js";
import { sortComponentsForCatalog } from "../components/kitchen-selection-utils.js";

const prisma = new PrismaClient();
const slug = process.argv[2] || "105811";

const kitchen = await prisma.kitchen.findFirst({
  where: {
    OR: [{ slug }, { kitchenCode: { contains: slug } }],
  },
  include: {
    items: { where: { itemType: ItemType.COMPONENT }, orderBy: { sortOrder: "asc" } },
  },
});

if (!kitchen) {
  console.log(`Kitchen ${slug} not found.`);
  await prisma.$disconnect();
  process.exit(1);
}

const pdfPath = kitchen.planPdfPath
  ? path.join(process.cwd(), "public", ...decodeURIComponent(kitchen.planPdfPath.replace(/^\//, "")).split("/"))
  : null;
const callouts = pdfPath ? extractCalloutsFromPdf(pdfPath) : [];
const xByNr = new Map(callouts.map((callout) => [String(callout.nr), callout.xPct]));
const sorted = sortComponentsForCatalog(kitchen.items, xByNr);

for (const [index, item] of sorted.entries()) {
  await prisma.kitchenItem.update({
    where: { id: item.id },
    data: { sortOrder: (index + 1) * 10 },
  });
}

const syncResult = await autoSyncKitchenHotspots(prisma, kitchen.id, { force: true });
console.log(
  `Updated sort order for ${sorted.length} components. Hotspots: ${
    syncResult.updated ? syncResult.hotspotCount : syncResult.warning || "skipped"
  }`,
);

await prisma.$disconnect();
