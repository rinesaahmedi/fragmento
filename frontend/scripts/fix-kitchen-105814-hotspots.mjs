import { PrismaClient } from "@prisma/client";
import { autoSyncKitchenHotspots } from "../lib/kitchen-hotspots.js";

const prisma = new PrismaClient();

const slug = process.argv[2] || "105814";

try {
  const kitchen = await prisma.kitchen.findFirst({
    where: { slug },
    select: { id: true, slug: true },
  });

  if (!kitchen) {
    console.error(`Kitchen "${slug}" not found.`);
    process.exit(1);
  }

  const result = await autoSyncKitchenHotspots(prisma, kitchen.id, { force: true });
  if (result.updated) {
    console.log(`Updated ${kitchen.slug} with ${result.hotspotCount} hotspots.`);
  } else if (result.warning) {
    console.error(`Could not update ${kitchen.slug}: ${result.warning}`);
    process.exit(1);
  } else {
    console.log(`No hotspot changes for ${kitchen.slug}.`);
  }
} finally {
  await prisma.$disconnect();
}
