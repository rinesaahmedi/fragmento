const fs = require("fs");
const path = require("path");
const { loadEnvConfig } = require("@next/env");
const xlsx = require("xlsx");

loadEnvConfig(process.cwd());

const { PrismaClient, KitchenStatus } = require("@prisma/client");

const prisma = new PrismaClient();

function parseArgs(argv) {
  const options = {
    includeInactive: false,
    out: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--include-inactive" || arg === "--all") {
      options.includeInactive = true;
      continue;
    }
    if (arg === "--out") {
      options.out = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
    }
  }

  return options;
}

function normalizeCell(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKeyPart(value) {
  return normalizeCell(value).toLowerCase();
}

function priceToNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function dimensionsLabel(item) {
  const values = [item.widthMm, item.heightMm, item.depthMm].filter(
    (value) => value !== null && value !== undefined && value !== "",
  );
  return values.length ? `${values.join(" x ")} mm` : "";
}

function addUnique(list, value) {
  const text = normalizeCell(value);
  if (text && !list.includes(text)) {
    list.push(text);
  }
}

function dedupeKey(item) {
  const articleNumber = normalizeKeyPart(item.articleNumber);
  const dimensions = [item.widthMm || "", item.heightMm || "", item.depthMm || ""].join("x");
  const price = priceToNumber(item.price).toFixed(2);
  const type = normalizeKeyPart(item.itemType);

  if (articleNumber) {
    return [type, articleNumber, dimensions, price].join("|");
  }

  return [
    type,
    normalizeKeyPart(item.name),
    normalizeKeyPart(item.nameDe),
    dimensions,
    price,
  ].join("|");
}

function buildRows(items) {
  const grouped = new Map();

  for (const item of items) {
    const key = dedupeKey(item);
    const kitchen = item.kitchen || {};
    const entry = grouped.get(key) || {
      itemTypes: [],
      codes: [],
      englishNames: [],
      germanNames: [],
      articleNumbers: [],
      widthMm: item.widthMm ?? "",
      heightMm: item.heightMm ?? "",
      depthMm: item.depthMm ?? "",
      dimensions: dimensionsLabel(item),
      prices: [],
      kitchenCodes: [],
      kitchenSlugs: [],
      kitchenNames: [],
      rowsInDatabase: 0,
    };

    addUnique(entry.itemTypes, item.itemType);
    addUnique(entry.codes, item.code);
    addUnique(entry.englishNames, item.name);
    addUnique(entry.germanNames, item.nameDe || item.name);
    addUnique(entry.articleNumbers, item.articleNumber);
    addUnique(entry.prices, priceToNumber(item.price).toFixed(2));
    addUnique(entry.kitchenCodes, kitchen.kitchenCode);
    addUnique(entry.kitchenSlugs, kitchen.slug);
    addUnique(entry.kitchenNames, kitchen.name);
    entry.rowsInDatabase += 1;

    grouped.set(key, entry);
  }

  return [...grouped.values()]
    .sort((a, b) => {
      const articleA = a.articleNumbers[0] || "";
      const articleB = b.articleNumbers[0] || "";
      return (
        a.itemTypes.join(", ").localeCompare(b.itemTypes.join(", ")) ||
        articleA.localeCompare(articleB) ||
        a.englishNames.join(", ").localeCompare(b.englishNames.join(", ")) ||
        a.codes.join(", ").localeCompare(b.codes.join(", "))
      );
    })
    .map((entry) => ({
      "Type": entry.itemTypes.join(", "),
      "Database code(s)": entry.codes.join(", "),
      "Name English": entry.englishNames.join(" | "),
      "Name Deutsch": entry.germanNames.join(" | "),
      "Article code(s)": entry.articleNumbers.join(", "),
      "Dimensions": entry.dimensions,
      "Width mm": entry.widthMm,
      "Height mm": entry.heightMm,
      "Depth mm": entry.depthMm,
      "Price EUR": entry.prices.join(", "),
      "Kitchen code(s)": entry.kitchenCodes.join(", "),
      "Kitchen slug(s)": entry.kitchenSlugs.join(", "),
      "Kitchen name(s)": entry.kitchenNames.join(" | "),
      "Rows in database": entry.rowsInDatabase,
    }));
}

function defaultOutputPath() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return path.join(process.cwd(), "exports", `kitchen-items-${stamp}.xlsx`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outPath = path.resolve(process.cwd(), options.out || defaultOutputPath());

  const items = await prisma.kitchenItem.findMany({
    where: options.includeInactive
      ? undefined
      : {
          isActive: true,
          kitchen: { status: KitchenStatus.ACTIVE },
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
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 44 },
    { wch: 42 },
    { wch: 42 },
    { wch: 34 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 28 },
    { wch: 42 },
    { wch: 42 },
    { wch: 16 },
  ];

  xlsx.utils.book_append_sheet(workbook, worksheet, "Kitchen items");
  xlsx.writeFile(workbook, outPath);

  console.log(`Exported ${rows.length} unique rows from ${items.length} database rows.`);
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
