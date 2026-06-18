import { PrismaClient, ItemType } from "@prisma/client";
import path from "path";
import {
  buildComponentSlotKeys,
  extractCalloutsFromPdf,
  generateHotspotsForItems,
} from "../lib/kitchen-hotspots.js";

const prisma = new PrismaClient();
const slugs = process.argv.slice(2);
if (!slugs.length) slugs.push("105811", "105814");

for (const slug of slugs) {
  const kitchen = await prisma.kitchen.findFirst({
    where: { OR: [{ slug }, { kitchenCode: { contains: slug } }] },
    include: {
      items: {
        where: { itemType: ItemType.COMPONENT, isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!kitchen) {
    console.log(`missing ${slug}`);
    continue;
  }

  const pdfPath = kitchen.planPdfPath
    ? path.join(
        process.cwd(),
        "public",
        ...decodeURIComponent(kitchen.planPdfPath.replace(/^\//, "")).split("/"),
      )
    : null;
  const callouts = pdfPath ? extractCalloutsFromPdf(pdfPath) : [];
  const slotKeys = buildComponentSlotKeys(kitchen.items, callouts);
  const { hotspots, warning } = generateHotspotsForItems(kitchen.items, {
    planImagePath: kitchen.planImagePath,
    planPdfPath: kitchen.planPdfPath,
  });

  console.log(`\n=== ${slug} ===`);
  console.log("planImage:", kitchen.planImagePath);
  console.log("items:", kitchen.items.length, "db hotspots:", kitchen.hotspots?.length);
  console.log("callouts:", callouts.length, callouts.map((c) => c.nr).sort((a, b) => a - b).join(","));
  console.log("fridgeSide:", slotKeys.fridgeSide);
  console.log("wall:", slotKeys.wall.join(", "));
  console.log("base:", slotKeys.base.join(", "));
  console.log("calloutMap:", JSON.stringify(slotKeys.calloutMap));
  if (warning) console.log("warning:", warning);
  console.log("generated hotspots:", JSON.stringify(hotspots, null, 2));
  console.log("db hotspots:", JSON.stringify(kitchen.hotspots, null, 2));
}

await prisma.$disconnect();
