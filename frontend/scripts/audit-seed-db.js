const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");

const projectRoot = path.resolve(__dirname, "..");
const seedPath = path.join(projectRoot, "prisma", "seed.js");
const seedDir = path.dirname(seedPath);

loadEnvConfig(projectRoot);

const FORBIDDEN_LEGACY_MARKERS = [
  "DEFAULT + UPK20",
  "UPK20(0.16CM)",
  "HPK2002(0.5CM)",
];

const BUSINESS_FIELDS = [
  "price",
  "articleNumber",
  "blendeCode",
  "blendePrice",
  "itemType",
  "isLocked",
];

const MOCK_ITEM_TYPE = {
  COMPONENT: "COMPONENT",
  ACCESSORY: "ACCESSORY",
  SERVICE: "SERVICE",
};

const MOCK_KITCHEN_STATUS = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
};

function formatMoney(value) {
  if (value == null) return null;
  return Number(value).toFixed(2);
}

function nullableString(value) {
  if (value == null || value === "") return null;
  return String(value);
}

function rowKey(kitchenSlug, code) {
  return `${kitchenSlug}|${code}`;
}

function requireFromSeed(request) {
  if (request === "bcryptjs") return { hash: async () => "audit-hash" };
  if (request === "crypto") return { randomUUID: () => "audit-uuid" };
  if (request === "@next/env") return { loadEnvConfig: () => {} };
  if (request === "@prisma/client") {
    return {
      PrismaClient: function PrismaClientMock() {
        return {};
      },
      KitchenStatus: MOCK_KITCHEN_STATUS,
      ItemType: MOCK_ITEM_TYPE,
    };
  }

  if (request.startsWith(".")) {
    return require(path.resolve(seedDir, request));
  }

  return require(request);
}

function loadSeedExports() {
  const source = fs.readFileSync(seedPath, "utf8");
  const patched = source.replace(
    /main\(\)\s*\.catch\([\s\S]*?\n\s*\}\);\s*$/m,
    [
      "globalThis.__seedAuditExports = {",
      "  DEFAULT_KITCHENS,",
      "  applyDefaultCatalogItem,",
      "  ARTICLE_PRICES,",
      "  BLENDE_PRICES,",
      "  normalizeBlendeCode,",
      "  getBlendeQuantity,",
      "};",
    ].join("\n"),
  );

  const context = {
    console,
    process: {
      cwd: () => projectRoot,
      env: process.env,
      exit: () => {},
    },
    require: requireFromSeed,
  };

  vm.createContext(context);
  vm.runInContext(patched, context, { filename: seedPath });

  if (!context.__seedAuditExports) {
    throw new Error("Unable to load seed exports for audit.");
  }

  return { source, seed: context.__seedAuditExports };
}

function buildSeedRows(seed) {
  const rows = [];
  const rawRows = [];

  for (const kitchen of seed.DEFAULT_KITCHENS) {
    for (const rawItem of kitchen.items) {
      const normalized = seed.applyDefaultCatalogItem(rawItem);
      const row = {
        kitchenSlug: kitchen.slug,
        kitchenCode: kitchen.kitchenCode || null,
        code: normalized.code,
        itemType: normalized.itemType,
        articleNumber: nullableString(normalized.articleNumber),
        price: formatMoney(normalized.price),
        blendeCode: nullableString(normalized.blendeCode),
        blendePrice: formatMoney(normalized.blendePrice),
        isLocked: Boolean(normalized.isLocked),
        isActive: normalized.isActive !== false,
      };

      rows.push(row);
      rawRows.push({
        kitchenSlug: kitchen.slug,
        rawCode: rawItem.code,
        code: normalized.code,
        rawPrice: rawItem.price == null ? null : formatMoney(rawItem.price),
        normalizedPrice: row.price,
      });
    }
  }

  return { rows, rawRows };
}

function getNumericPriceDiffs(rawRows) {
  return rawRows.filter((row) => row.rawPrice != null && row.rawPrice !== row.normalizedPrice);
}

function groupExtraRowsByKitchen(extraRows) {
  const grouped = new Map();

  for (const row of extraRows) {
    const current = grouped.get(row.kitchenSlug) || {
      kitchenSlug: row.kitchenSlug,
      kitchenStatus: row.kitchenStatus,
      total: 0,
      active: 0,
      inactive: 0,
      withOrderItems: 0,
    };

    current.total += 1;
    if (row.isActive) current.active += 1;
    else current.inactive += 1;
    if (row.orderItemCount > 0) current.withOrderItems += 1;

    grouped.set(row.kitchenSlug, current);
  }

  return [...grouped.values()].sort((a, b) => a.kitchenSlug.localeCompare(b.kitchenSlug));
}

function compareSeededRows(seedRows, liveRows) {
  const liveByKey = new Map(liveRows.map((row) => [rowKey(row.kitchenSlug, row.code), row]));
  const missingSeedRows = [];
  const differingSeededRows = [];

  for (const seedRow of seedRows) {
    const liveRow = liveByKey.get(rowKey(seedRow.kitchenSlug, seedRow.code));
    if (!liveRow) {
      missingSeedRows.push(seedRow);
      continue;
    }

    const diffs = {};
    for (const field of BUSINESS_FIELDS) {
      if (String(liveRow[field]) !== String(seedRow[field])) {
        diffs[field] = { live: liveRow[field], seed: seedRow[field] };
      }
    }

    if (Object.keys(diffs).length > 0) {
      differingSeededRows.push({
        kitchenSlug: seedRow.kitchenSlug,
        code: seedRow.code,
        orderItemCount: liveRow.orderItemCount,
        diffs,
      });
    }
  }

  return { missingSeedRows, differingSeededRows };
}

async function loadLiveRows(prisma) {
  const items = await prisma.kitchenItem.findMany({
    include: {
      kitchen: { select: { slug: true, kitchenCode: true, status: true } },
      _count: { select: { orderItems: true } },
    },
    orderBy: [
      { kitchen: { slug: "asc" } },
      { sortOrder: "asc" },
      { code: "asc" },
    ],
  });

  return items.map((item) => ({
    kitchenSlug: item.kitchen.slug,
    kitchenCode: item.kitchen.kitchenCode || null,
    kitchenStatus: item.kitchen.status,
    code: item.code,
    itemType: item.itemType,
    articleNumber: nullableString(item.articleNumber),
    price: formatMoney(item.price),
    blendeCode: nullableString(item.blendeCode),
    blendePrice: formatMoney(item.blendePrice),
    isLocked: Boolean(item.isLocked),
    isActive: Boolean(item.isActive),
    orderItemCount: item._count.orderItems,
  }));
}

async function loadOrderSnapshotWarnings(prisma, seedByKey) {
  const orderItems = await prisma.orderItem.findMany({
    include: {
      kitchenItem: {
        include: {
          kitchen: { select: { slug: true } },
        },
      },
      order: {
        select: {
          orderNumber: true,
          kitchen: { select: { slug: true } },
        },
      },
    },
  });

  const noCurrentKitchenItem = orderItems.filter((orderItem) => (
    !orderItem.kitchenItemId || !orderItem.kitchenItem
  ));
  const snapshotVsCurrentPriceDiffs = orderItems.filter((orderItem) => (
    orderItem.kitchenItem
    && formatMoney(orderItem.priceSnapshot) !== formatMoney(orderItem.kitchenItem.price)
  ));
  const snapshotVsSeedPriceDiffs = orderItems.filter((orderItem) => {
    if (!orderItem.kitchenItem) return false;
    const seedRow = seedByKey.get(rowKey(orderItem.kitchenItem.kitchen.slug, orderItem.kitchenItem.code));
    return seedRow && formatMoney(orderItem.priceSnapshot) !== seedRow.price;
  });

  return {
    totalOrderItems: orderItems.length,
    noCurrentKitchenItemCount: noCurrentKitchenItem.length,
    snapshotVsCurrentPriceDiffCount: snapshotVsCurrentPriceDiffs.length,
    snapshotVsSeedPriceDiffCount: snapshotVsSeedPriceDiffs.length,
    snapshotVsCurrentPriceDiffExamples: snapshotVsCurrentPriceDiffs.slice(0, 10).map((orderItem) => ({
      orderNumber: orderItem.order.orderNumber,
      orderKitchenSlug: orderItem.order.kitchen.slug,
      code: orderItem.code,
      nameSnapshot: orderItem.nameSnapshot,
      priceSnapshot: formatMoney(orderItem.priceSnapshot),
      currentKitchenSlug: orderItem.kitchenItem?.kitchen.slug || null,
      currentPrice: formatMoney(orderItem.kitchenItem?.price),
    })),
  };
}

function printSection(title, value) {
  console.log(`\n${title}`);
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const { source, seed } = loadSeedExports();
  const { rows: seedRows, rawRows } = buildSeedRows(seed);
  const seedByKey = new Map(seedRows.map((row) => [rowKey(row.kitchenSlug, row.code), row]));
  const seededSlugs = new Set(seed.DEFAULT_KITCHENS.map((kitchen) => kitchen.slug));
  const numericPriceDiffs = getNumericPriceDiffs(rawRows);
  const forbiddenLegacyMarkers = FORBIDDEN_LEGACY_MARKERS.filter((marker) => source.includes(marker));

  const prisma = new PrismaClient();
  let liveRows;
  let orderWarnings;

  try {
    liveRows = await loadLiveRows(prisma);
    orderWarnings = await loadOrderSnapshotWarnings(prisma, seedByKey);
  } finally {
    await prisma.$disconnect();
  }

  const extraRows = liveRows.filter((row) => !seedByKey.has(rowKey(row.kitchenSlug, row.code)));
  const extraRowsByKitchen = groupExtraRowsByKitchen(extraRows);
  const test3dExtraRows = extraRows.filter((row) => row.kitchenSlug === "test-3d-kitchen");
  const seededLiveRows = liveRows.filter((row) => seededSlugs.has(row.kitchenSlug));
  const { missingSeedRows, differingSeededRows } = compareSeededRows(seedRows, liveRows);

  const summary = {
    defaultKitchenCount: seed.DEFAULT_KITCHENS.length,
    normalizedSeedRows: seedRows.length,
    liveKitchenItemTotal: liveRows.length,
    liveSeededKitchenItemCount: seededLiveRows.length,
    extraRowsNotInDefaultKitchens: extraRows.length,
    test3dExtraRows: test3dExtraRows.length,
    missingSeedRows: missingSeedRows.length,
    differingSeededRows: differingSeededRows.length,
    numericPriceDiffs: numericPriceDiffs.length,
    forbiddenLegacyMarkers: forbiddenLegacyMarkers.length,
    orderWarnings: {
      totalOrderItems: orderWarnings.totalOrderItems,
      noCurrentKitchenItem: orderWarnings.noCurrentKitchenItemCount,
      snapshotVsCurrentPriceDiffs: orderWarnings.snapshotVsCurrentPriceDiffCount,
      snapshotVsSeedPriceDiffs: orderWarnings.snapshotVsSeedPriceDiffCount,
    },
  };

  console.log("Seed/DB audit summary");
  console.log(JSON.stringify(summary, null, 2));

  printSection("Extra rows grouped by kitchen (non-failing)", extraRowsByKitchen);
  printSection("test-3d-kitchen extra row summary (non-failing)", {
    count: test3dExtraRows.length,
    active: test3dExtraRows.filter((row) => row.isActive).length,
    inactive: test3dExtraRows.filter((row) => !row.isActive).length,
    withOrderItems: test3dExtraRows.filter((row) => row.orderItemCount > 0).length,
  });
  printSection("Missing seeded rows (failing)", missingSeedRows.slice(0, 50));
  printSection("Seeded row business-field diffs (failing)", differingSeededRows.slice(0, 50));
  printSection("Numeric raw-vs-normalized seed price diffs (failing)", numericPriceDiffs.slice(0, 50));
  printSection("Forbidden legacy markers (failing)", forbiddenLegacyMarkers);
  printSection("Historical order snapshot warnings (non-failing)", orderWarnings);

  const shouldFail = (
    missingSeedRows.length > 0
    || differingSeededRows.length > 0
    || forbiddenLegacyMarkers.length > 0
    || numericPriceDiffs.length > 0
  );

  if (shouldFail) {
    console.error("\nAudit failed: seeded DB diffs, missing seed rows, forbidden markers, or numeric seed price diffs were found.");
    process.exitCode = 1;
  } else {
    console.log("\nAudit passed: seeded DB rows match normalized seed business fields.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
