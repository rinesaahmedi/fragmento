import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const kitchen = await prisma.kitchen.findFirst({
    where: { slug: "105814" },
    include: {
      items: {
        where: { itemType: "COMPONENT" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!kitchen) {
    console.log("Kitchen not found");
  } else {
    console.log(
      JSON.stringify(
        {
          slug: kitchen.slug,
          status: kitchen.status,
          planImagePath: kitchen.planImagePath,
          hotspotCount: Array.isArray(kitchen.hotspots) ? kitchen.hotspots.length : 0,
          hotspots: kitchen.hotspots,
          linkedComponentGroups: kitchen.linkedComponentGroups,
          items: kitchen.items.map((item) => ({
            calloutNumber: item.calloutNumber,
            componentKey: item.componentKey,
            code: item.code,
            article: item.articleNumber,
            name: item.name,
            isLocked: item.isLocked,
            isActive: item.isActive,
          })),
        },
        null,
        2,
      ),
    );
  }
} finally {
  await prisma.$disconnect();
}
