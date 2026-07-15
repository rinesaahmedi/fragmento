const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");

const projectRoot = path.resolve(__dirname, "..");
const seedPath = path.join(projectRoot, "prisma", "seed.js");
const seedDir = path.dirname(seedPath);

loadEnvConfig(projectRoot);

const prisma = new PrismaClient();

const LINK_STATUS_MATCHED = "MATCHED";

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

const SERVICE_CODE_MAP = {
  "SVC-MONTAGE-001": "MONTAGE",
  "SVC-PICKUP-001": "PICKUP",
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
  if (request === "bcryptjs") return { hash: async () => "catalog-link-backfill-hash" };
  if (request === "crypto") return { randomUUID: () => "catalog-link-backfill-uuid" };
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
      "globalThis.__catalogLinkBackfillSeedExports = {",
      "  DEFAULT_KITCHENS,",
      "  applyDefaultCatalogItem,",
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

  if (!context.__catalogLinkBackfillSeedExports) {
    throw new Error("Unable to load seed exports for catalog link backfill.");
  }

  return context.__catalogLinkBackfillSeedExports;
}

function buildSeedRows(seed) {
  const rows = [];

  for (const kitchen of seed.DEFAULT_KITCHENS) {
    for (const rawItem of kitchen.items) {
      const normalized = seed.applyDefaultCatalogItem(rawItem);

      rows.push({
        kitchenSlug: kitchen.slug,
        code: normalized.code,
        itemType: normalized.itemType,
        articleNumber: nullableString(normalized.articleNumber),
        price: formatMoney(normalized.price),
        blendeCode: nullableString(normalized.blendeCode),
        blendeLabel: nullableString(normalized.blendeLabel),
        blendePrice: formatMoney(normalized.blendePrice),
        iconKey: nullableString(normalized.iconKey),
        componentKey: nullableString(normalized.componentKey),
        isLocked: Boolean(normalized.isLocked),
      });
    }
  }

  return rows;
}

function normalizeBlendeCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (code.startsWith("UPK20")) return "UPK20";
  if (code.startsWith("UPEF65")) return "UPEF65";
  if (code.startsWith("HPK2002")) return "HPK2002";
  return "";
}

function getBlendeQuantity(row) {
  const code = String(row.blendeCode || "").trim().toUpperCase();
  const label = String(row.blendeLabel || "").trim().toUpperCase();
  const price = Number(row.blendePrice || 0);
  const normalizedCode = normalizeBlendeCode(code);

  if (!normalizedCode) return 0;
  if (/\bX2\b/.test(code) || /\bX\s*2\b/.test(code) || /^2X\b/.test(label) || /\bX\s*2\b/.test(label)) return 2;
  if (normalizedCode === "UPK20" && price === 50) return 2;
  if (normalizedCode === "HPK2002" && price === 70) return 2;
  return 1;
}

function isDefaultIncluded(row) {
  const code = String(row.code || "").toUpperCase();
  const iconKey = String(row.iconKey || "").toLowerCase();
  const componentKey = String(row.componentKey || "").toLowerCase();

  return Boolean(row.isLocked) && (
    code === "OVEN-B-600-HOB"
    || code === "SINKBASE-B-600"
    || code === "SINK-WORKTOP"
    || code.startsWith("TOP-")
    || iconKey === "worktop"
    || componentKey === "worktop"
  );
}

function sameNullable(left, right) {
  return (left ?? null) === (right ?? null);
}

function sameLinkFields(item, data) {
  return (
    sameNullable(item.catalogArticleId, data.catalogArticleId)
    && sameNullable(item.catalogBlendeId, data.catalogBlendeId)
    && sameNullable(item.catalogBlendeQuantity, data.catalogBlendeQuantity)
    && sameNullable(item.catalogServiceId, data.catalogServiceId)
    && sameNullable(item.catalogLinkStatus, data.catalogLinkStatus)
  );
}

function buildLinkData(row, catalog) {
  if (isDefaultIncluded(row)) {
    return { kind: "default included" };
  }

  const serviceCode = SERVICE_CODE_MAP[row.code];
  if (serviceCode) {
    const service = catalog.serviceByCode.get(serviceCode);
    if (!service) return { kind: "missing catalog service", serviceCode };
    if (row.price !== formatMoney(service.price)) return { kind: "price mismatch", expectedPrice: formatMoney(service.price) };

    return {
      kind: "service",
      data: {
        catalogArticleId: null,
        catalogBlendeId: null,
        catalogBlendeQuantity: null,
        catalogServiceId: service.id,
        catalogLinkStatus: LINK_STATUS_MATCHED,
      },
    };
  }

  const article = row.articleNumber ? catalog.articleByNumber.get(row.articleNumber) : null;
  if (!article) {
    return { kind: row.articleNumber ? "missing catalog article" : "manual review" };
  }

  if (row.blendeCode) {
    const normalizedBlendeCode = normalizeBlendeCode(row.blendeCode);
    const blende = catalog.blendeByCode.get(normalizedBlendeCode);
    const quantity = getBlendeQuantity(row);

    if (!blende) return { kind: "missing catalog blende", normalizedBlendeCode };

    const expectedPrice = Number(article.price) + (Number(blende.price) * quantity);
    if (row.price !== formatMoney(expectedPrice)) {
      return { kind: "price mismatch", expectedPrice: formatMoney(expectedPrice) };
    }

    return {
      kind: "article + blende",
      data: {
        catalogArticleId: article.id,
        catalogBlendeId: blende.id,
        catalogBlendeQuantity: quantity,
        catalogServiceId: null,
        catalogLinkStatus: LINK_STATUS_MATCHED,
      },
    };
  }

  if (row.price !== formatMoney(article.price)) {
    return { kind: "price mismatch", expectedPrice: formatMoney(article.price) };
  }

  return {
    kind: article.isFixedPricePackage ? "fixed-price package" : "article-only",
    data: {
      catalogArticleId: article.id,
      catalogBlendeId: null,
      catalogBlendeQuantity: null,
      catalogServiceId: null,
      catalogLinkStatus: LINK_STATUS_MATCHED,
    },
  };
}

async function loadCatalog() {
  const [articles, blenden, services] = await Promise.all([
    prisma.catalogArticle.findMany(),
    prisma.catalogBlende.findMany(),
    prisma.catalogService.findMany(),
  ]);

  if (articles.length === 0 || blenden.length === 0 || services.length === 0) {
    throw new Error(`Catalog tables must be populated before link backfill. Counts: ${JSON.stringify({
      CatalogArticle: articles.length,
      CatalogBlende: blenden.length,
      CatalogService: services.length,
    })}`);
  }

  return {
    articleByNumber: new Map(articles.map((article) => [article.articleNumber, article])),
    blendeByCode: new Map(blenden.map((blende) => [blende.code, blende])),
    serviceByCode: new Map(services.map((service) => [service.code, service])),
  };
}

async function loadLiveSeededItems(seedRows) {
  const seedByKey = new Map(seedRows.map((row) => [rowKey(row.kitchenSlug, row.code), row]));
  const seededSlugs = [...new Set(seedRows.map((row) => row.kitchenSlug))];
  const items = await prisma.kitchenItem.findMany({
    where: { kitchen: { slug: { in: seededSlugs } } },
    include: {
      kitchen: { select: { slug: true } },
    },
  });

  return items
    .map((item) => {
      const seedRow = seedByKey.get(rowKey(item.kitchen.slug, item.code)) || null;
      if (!seedRow) return { item, seedRow: null };

      // The seed identifies which standard kitchen item this is. Its current
      // catalog fields must come from the database, so an admin change to an
      // article or Blende remains authoritative after the next deployment.
      return {
        item,
        seedRow: {
          ...seedRow,
          itemType: item.itemType,
          articleNumber: nullableString(item.articleNumber),
          price: formatMoney(item.price),
          blendeCode: nullableString(item.blendeCode),
          blendeLabel: nullableString(item.blendeLabel),
          blendePrice: formatMoney(item.blendePrice),
          iconKey: nullableString(item.iconKey),
          componentKey: nullableString(item.componentKey),
          isLocked: Boolean(item.isLocked),
        },
      };
    })
    .filter((entry) => entry.seedRow);
}

async function main() {
  const seed = loadSeedExports();
  const seedRows = buildSeedRows(seed);
  const catalog = await loadCatalog();
  const liveSeededItems = await loadLiveSeededItems(seedRows);
  const result = {
    updated: 0,
    skippedAlreadyLinked: 0,
    linkedByKind: {
      "article-only": 0,
      "article + blende": 0,
      "fixed-price package": 0,
      service: 0,
    },
    skippedByReason: {},
    examplesByReason: {},
  };

  for (const { item, seedRow } of liveSeededItems) {
    const link = buildLinkData(seedRow, catalog);

    if (!link.data) {
      result.skippedByReason[link.kind] = (result.skippedByReason[link.kind] || 0) + 1;
      if (!result.examplesByReason[link.kind]) {
        result.examplesByReason[link.kind] = {
          kitchenSlug: item.kitchen.slug,
          code: item.code,
          articleNumber: item.articleNumber,
          price: formatMoney(item.price),
          expectedPrice: link.expectedPrice || null,
        };
      }
      continue;
    }

    result.linkedByKind[link.kind] += 1;

    if (sameLinkFields(item, link.data)) {
      result.skippedAlreadyLinked += 1;
      continue;
    }

    await prisma.kitchenItem.update({
      where: { id: item.id },
      data: link.data,
    });
    result.updated += 1;
  }

  const [totalKitchenItems, linkedRows, defaultIncludedUnlinked, testRowsWithLinks, testRowsTotal] = await Promise.all([
    prisma.kitchenItem.count(),
    prisma.kitchenItem.count({
      where: {
        OR: [
          { catalogArticleId: { not: null } },
          { catalogBlendeId: { not: null } },
          { catalogBlendeQuantity: { not: null } },
          { catalogServiceId: { not: null } },
          { catalogLinkStatus: { not: null } },
        ],
      },
    }),
    prisma.kitchenItem.count({
      where: {
        kitchen: { slug: { in: [...new Set(seedRows.map((row) => row.kitchenSlug))] } },
        catalogArticleId: null,
        catalogBlendeId: null,
        catalogBlendeQuantity: null,
        catalogServiceId: null,
        catalogLinkStatus: null,
      },
    }),
    prisma.kitchenItem.count({
      where: {
        kitchen: { slug: "test-3d-kitchen" },
        OR: [
          { catalogArticleId: { not: null } },
          { catalogBlendeId: { not: null } },
          { catalogBlendeQuantity: { not: null } },
          { catalogServiceId: { not: null } },
          { catalogLinkStatus: { not: null } },
        ],
      },
    }),
    prisma.kitchenItem.count({ where: { kitchen: { slug: "test-3d-kitchen" } } }),
  ]);

  console.log(JSON.stringify({
    result,
    totals: {
      totalKitchenItems,
      liveSeededItems: liveSeededItems.length,
      linkedRows,
      defaultIncludedRowsLeftFullyUnlinked: defaultIncludedUnlinked,
      test3dKitchenRows: testRowsTotal,
      test3dKitchenRowsWithCatalogLinks: testRowsWithLinks,
    },
    recommendation: "Default included rows remain fully unlinked with null catalogLinkStatus until reporting/admin requirements need explicit DEFAULT_INCLUDED metadata.",
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
