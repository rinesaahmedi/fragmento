import { PrismaClient } from "@prisma/client";
import { finalizeImportedKitchenHotspots } from "../lib/kitchen-hotspot-verify.js";

const prisma = new PrismaClient();
const slug = process.argv[2] || "105806";

const kitchen = await prisma.kitchen.findFirst({
  where: {
    OR: [{ slug }, { kitchenCode: { contains: slug } }],
  },
});

if (!kitchen) {
  console.error(`Kitchen ${slug} not found.`);
  process.exit(1);
}

const result = await finalizeImportedKitchenHotspots(prisma, kitchen.id, { writeOverlay: false });
console.log(`Repair updated ${result.repair?.updated || 0} component keys.`);
if (result.sync?.updated) {
  console.log(`Hotspots: ${result.sync.hotspotCount}`);
}
if (result.ok) {
  console.log(`OK: ${result.verification.hotspotCount}/${result.verification.expectedCount}`);
} else {
  console.error((result.errors || result.verification?.errors || []).join("\n"));
  process.exit(1);
}

await prisma.$disconnect();
