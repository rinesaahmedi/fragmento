const fs = require("fs");
const path = require("path");
const { loadEnvConfig } = require("@next/env");
const xlsx = require("xlsx");

loadEnvConfig(process.cwd());

const { PrismaClient, ItemType, KitchenStatus } = require("@prisma/client");

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

function priceLabel(value) {
  return priceToNumber(value).toFixed(2);
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

function kitchenLabel(kitchen) {
  const code = normalizeCell(kitchen?.kitchenCode);
  const slug = normalizeCell(kitchen?.slug);
  const name = normalizeCell(kitchen?.name);
  if (code && slug) return `${code} (${slug})`;
  return code || slug || name;
}

function dedupeKey(item) {
  const articleNumber = normalizeKeyPart(item.articleNumber);
  const fallbackIdentity = [
    normalizeKeyPart(item.name),
    normalizeKeyPart(item.nameDe),
    normalizeKeyPart(item.infoText),
  ].join("|");

  return [
    normalizeKeyPart(item.itemType),
    articleNumber || fallbackIdentity,
    normalizeKeyPart(item.blendeCode),
    normalizeKeyPart(item.blendeLabel),
    priceLabel(item.blendePrice),
    item.widthMm ?? "",
    item.heightMm ?? "",
    item.depthMm ?? "",
    priceLabel(item.price),
  ].join("|");
}

function buildRows(items) {
  const grouped = new Map();

  for (const item of items) {
    const key = dedupeKey(item);
    const entry = grouped.get(key) || {
      itemTypes: [],
      names: [],
      namesDe: [],
      databaseCodes: [],
      articleNumbers: [],
      blendeCodes: [],
      blendeLabels: [],
      blendePrices: [],
      dimensions: dimensionsLabel(item),
      itemPrices: [],
      totalPrices: [],
      kitchens: [],
      kitchenSlugs: [],
      rowCount: 0,
    };

    const itemPrice = priceToNumber(item.price);
    const blendePrice = priceToNumber(item.blendePrice);
    const totalPrice = itemPrice + blendePrice;

    addUnique(entry.itemTypes, item.itemType);
    addUnique(entry.names, item.name);
    addUnique(entry.namesDe, item.nameDe || item.name);
    addUnique(entry.databaseCodes, item.code);
    addUnique(entry.articleNumbers, item.articleNumber);
    addUnique(entry.blendeCodes, item.blendeCode);
    addUnique(entry.blendeLabels, item.blendeLabel);
    if (item.blendePrice !== null && item.blendePrice !== undefined) {
      addUnique(entry.blendePrices, priceLabel(item.blendePrice));
    }
    addUnique(entry.itemPrices, priceLabel(item.price));
    addUnique(entry.totalPrices, totalPrice.toFixed(2));
    addUnique(entry.kitchens, kitchenLabel(item.kitchen));
    addUnique(entry.kitchenSlugs, item.kitchen?.slug);
    entry.rowCount += 1;

    grouped.set(key, entry);
  }

  return [...grouped.values()]
    .sort((a, b) => {
      const typeCompare = a.itemTypes.join(", ").localeCompare(b.itemTypes.join(", "));
      if (typeCompare) return typeCompare;
      const articleCompare = (a.articleNumbers[0] || "").localeCompare(b.articleNumbers[0] || "");
      if (articleCompare) return articleCompare;
      return (a.names[0] || "").localeCompare(b.names[0] || "");
    })
    .map((entry, index) => ({
      "No": index + 1,
      "Type": entry.itemTypes.join(", "),
      "Name": entry.names.join(" | "),
      "Name DE": entry.namesDe.join(" | "),
      "Article code": entry.articleNumbers.join(", "),
      "Database code(s)": entry.databaseCodes.join(", "),
      "Blende code": entry.blendeCodes.join(", "),
      "Blende label": entry.blendeLabels.join(", "),
      "Blende price EUR": entry.blendePrices.join(", "),
      "Dimensions": entry.dimensions,
      "Item price EUR": entry.itemPrices.join(", "),
      "Total price incl. blende EUR": entry.totalPrices.join(", "),
      "Kitchens used": entry.kitchens.join(", "),
      "Kitchen count": entry.kitchens.length,
      "DB row count": entry.rowCount,
    }));
}

function defaultOutputPath() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return path.join(process.cwd(), "exports", `ab-kitchen-items-deduped-${stamp}.xlsx`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outPath = path.resolve(process.cwd(), options.out || defaultOutputPath());

  const items = await prisma.kitchenItem.findMany({
    where: {
      itemType: { in: [ItemType.COMPONENT, ItemType.ACCESSORY] },
      ...(options.includeInactive ? {} : { isActive: true }),
      kitchen: {
        slug: { startsWith: "ab-" },
        ...(options.includeInactive ? {} : { status: KitchenStatus.ACTIVE }),
      },
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
    { wch: 6 },
    { wch: 12 },
    { wch: 36 },
    { wch: 36 },
    { wch: 28 },
    { wch: 44 },
    { wch: 16 },
    { wch: 24 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
    { wch: 24 },
    { wch: 90 },
    { wch: 14 },
    { wch: 12 },
  ];

  xlsx.utils.book_append_sheet(workbook, worksheet, "AB items");
  xlsx.writeFile(workbook, outPath);

  console.log(`Exported ${rows.length} unique rows from ${items.length} AB kitchen item rows.`);
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
