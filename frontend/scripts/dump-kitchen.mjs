import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const slug = process.argv[2] || "105811";

const kitchen = await prisma.kitchen.findFirst({
  where: { OR: [{ slug }, { kitchenCode: { contains: slug } }] },
  include: {
    items: {
      where: { itemType: "COMPONENT" },
      orderBy: { sortOrder: "asc" },
    },
  },
});

console.log(
  JSON.stringify(
    {
      slug: kitchen?.slug,
      planImagePath: kitchen?.planImagePath,
      planPdfPath: kitchen?.planPdfPath,
      linkedComponentGroups: kitchen?.linkedComponentGroups,
      hotspotCount: kitchen?.hotspots?.length,
      hotspots: kitchen?.hotspots,
      items: kitchen?.items.map((item) => ({
        calloutNumber: item.calloutNumber,
        componentKey: item.componentKey,
        code: item.code,
        name: item.name,
        isLocked: item.isLocked,
        isActive: item.isActive,
        sortOrder: item.sortOrder,
      })),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
