const { PrismaClient, KitchenStatus } = require("@prisma/client");

const prisma = new PrismaClient();

function buildPxContractNumber(kitchen) {
  const code = String(kitchen.kitchenCode || kitchen.slug || "").replace(/\D/g, "");

  if (!code) {
    return "";
  }

  return `111${code}`;
}

async function main() {
  const kitchens = await prisma.kitchen.findMany({
    where: {
      status: KitchenStatus.ACTIVE,
      OR: [
        { kitchenCode: { not: null } },
        { slug: { startsWith: "ab-" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      kitchenCode: true,
      contracts: {
        where: {
          contractNumber: { startsWith: "670" },
        },
        select: {
          projectId: true,
        },
        take: 1,
      },
    },
    orderBy: { slug: "asc" },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const kitchen of kitchens) {
    const contractNumber = buildPxContractNumber(kitchen);
    if (!contractNumber) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.kitchenContract.findUnique({
      where: { contractNumber },
      select: { id: true },
    });

    await prisma.kitchenContract.upsert({
      where: { contractNumber },
      update: {
        kitchenId: kitchen.id,
        projectId: kitchen.contracts[0]?.projectId || null,
        isActive: true,
      },
      create: {
        contractNumber,
        kitchenId: kitchen.id,
        projectId: kitchen.contracts[0]?.projectId || null,
        isActive: true,
      },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(`PX contracts complete. Created: ${created}. Updated: ${updated}. Skipped: ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
