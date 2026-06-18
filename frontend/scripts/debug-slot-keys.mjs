import { PrismaClient } from "@prisma/client";
import { buildComponentSlotKeys, generateHotspotsForItems } from "../lib/kitchen-hotspots.js";

const prisma = new PrismaClient();
const kitchen = await prisma.kitchen.findFirst({
  where: { slug: "105811" },
  include: { items: { where: { itemType: "COMPONENT", isActive: true } } },
});
console.log("slot keys:", JSON.stringify(buildComponentSlotKeys(kitchen.items), null, 2));
const { hotspots, warning } = generateHotspotsForItems(kitchen.items, {
  planImagePath: kitchen.planImagePath,
  planPdfPath: kitchen.planPdfPath,
});
console.log("warning:", warning);
console.log("hotspots:", JSON.stringify(hotspots, null, 2));
await prisma.$disconnect();
