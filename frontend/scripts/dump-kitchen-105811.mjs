import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const kitchen = await prisma.kitchen.findFirst({
  where: {
    OR: [
      { slug: { contains: "105811" } },
      { kitchenCode: { contains: "105811" } },
    ],
  },
  include: {
    items: {
      where: { itemType: "COMPONENT" },
      orderBy: { sortOrder: "asc" },
    },
  },
});

if (!kitchen) {
  console.log("NOT FOUND");
} else {
  console.log(
    JSON.stringify(
      {
        id: kitchen.id,
        slug: kitchen.slug,
        kitchenCode: kitchen.kitchenCode,
        planImagePath: kitchen.planImagePath,
        planPdfPath: kitchen.planPdfPath,
        hotspotCount: Array.isArray(kitchen.hotspots) ? kitchen.hotspots.length : 0,
        hotspots: kitchen.hotspots,
        items: kitchen.items.map((i) => ({
          code: i.code,
          componentKey: i.componentKey,
          calloutNumber: i.calloutNumber,
          isActive: i.isActive,
          name: i.name,
        })),
      },
      null,
      2,
    ),
  );
}

await prisma.$disconnect();
