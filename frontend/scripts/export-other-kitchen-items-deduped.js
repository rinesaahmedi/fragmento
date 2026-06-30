const path = require("path");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const { PrismaClient, ItemType, KitchenStatus } = require("@prisma/client");
const {
  parseArgs,
  buildRows,
  writeWorkbook,
  otherKitchenExportWhere,
} = require("./lib/kitchen-items-deduped-export");

const prisma = new PrismaClient();

function defaultOutputPath() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return path.join(process.cwd(), "exports", `other-kitchen-items-deduped-${stamp}.xlsx`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outPath = path.resolve(process.cwd(), options.out || defaultOutputPath());

  const items = await prisma.kitchenItem.findMany({
    where: {
      itemType: { in: [ItemType.COMPONENT, ItemType.ACCESSORY] },
      ...(options.includeInactive ? {} : { isActive: true }),
      kitchen: otherKitchenExportWhere(options.includeInactive, KitchenStatus),
    },
    include: {
      kitchen: {
        select: {
          slug: true,
          kitchenCode: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: [
      { itemType: "asc" },
      { articleNumber: "asc" },
      { name: "asc" },
      { code: "asc" },
    ],
  });

  const rows = buildRows(items);
  writeWorkbook(rows, outPath, "Other items");

  console.log(`Exported ${rows.length} unique rows from ${items.length} non-AB kitchen item rows.`);
  console.log(outPath);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
