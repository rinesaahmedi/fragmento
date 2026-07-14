const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");

const projectRoot = path.resolve(__dirname, "..");
const seedPath = path.join(projectRoot, "prisma", "seed.js");
const seedDir = path.dirname(seedPath);

loadEnvConfig(projectRoot);

const LEGACY_MARKERS = [
  "DEFAULT + UPK20",
  "UPK20(0.16CM)",
  "HPK2002(0.5CM)",
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
    throw new Error("Unable to load seed exports for catalog parity audit.");
  }

  return { source, seed: context.__seedAuditExports };
}

function buildSeedRows(seed) {
  const rows = [];

  for (const kitchen of seed.DEFAULT_KITCHENS) {
    for (const rawItem of kitchen.items) {
      const normalized = seed.applyDefaultCatalogItem(rawItem);

      rows.push({
        kitchenSlug: kitchen.slug,
        kitchenCode: kitchen.kitchenCode || null,
        code: normalized.code,
        itemType: normalized.itemType,
        articleNumber: nullableString(normalized.articleNumber),
        name: normalized.name,
        nameDe: nullableString(normalized.nameDe),
        price: formatMoney(normalized.price),
        blendeCode: nullableString(normalized.blendeCode),
        blendeLabel: nullableString(normalized.blendeLabel),
        blendePrice: formatMoney(normalized.blendePrice),
        iconKey: nullableString(normalized.iconKey),
        componentKey: nullableString(normalized.componentKey),
        isLocked: Boolean(normalized.isLocked),
        isActive: normalized.isActive !== false,
        sortOrder: normalized.sortOrder || 0,
      });
    }
  }

  return rows;
}

function getCompositeMarkerWarnings(row) {
  const values = [
    ["articleNumber", row.articleNumber],
    ["blendeCode", row.blendeCode],
    ["blendeLabel", row.blendeLabel],
    ["name", row.name],
    ["nameDe", row.nameDe],
  ];
  const warnings = [];

  for (const marker of LEGACY_MARKERS) {
    for (const [field, value] of values) {
      if (String(value || "").includes(marker)) {
        warnings.push({ field, marker, type: "legacy marker" });
      }
    }
  }

  for (const [field, value] of values) {
    const text = String(value || "");
    if (!text) continue;
    if ((field === "articleNumber" || field === "blendeCode" || field === "blendeLabel") && /\s\+\s|\([^)]*\)/.test(text)) {
      warnings.push({ field, marker: text, type: "composite article/blende string" });
    }
  }

  return warnings;
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
  if (/\bX2\b/.test(code) || /\bX\s*2\b/.test(code) || /^2X\b/.test(label) || /\bX\s*2\b/.test(label)) {
    return 2;
  }
  if (normalizedCode === "UPK20" && price === 50) return 2;
  if (normalizedCode === "HPK2002" && price === 70) return 2;
  if (price > 0) return 1;
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

function defaultIncludedIssue(row) {
  const code = String(row.code || "").toUpperCase();

  if (row.price !== "0.00") return "default included row is not 0.00";
  if (!row.isLocked) return "default included row is not locked";
  if ((code === "SINKBASE-B-600" || code === "SINK-WORKTOP" || code.startsWith("TOP-")) && row.articleNumber) {
    return "default marker has articleNumber";
  }
  return null;
}

function classifyUnknown(row) {
  const code = String(row.code || "").toUpperCase();
  const price = Number(row.price || 0);

  if (isDefaultIncluded(row)) return "default included";
  if (code.startsWith("LKNEW-") || price === 0.01) return "obsolete/prototype";
  if (!row.articleNumber && price === 0) return "custom placeholder";
  if (row.articleNumber) return "missing catalog article";
  return "manual review";
}

function comparePrice(row, expectedPrice) {
  return row.price === formatMoney(expectedPrice);
}

function compactRow(row, extra = {}) {
  return {
    kitchenSlug: row.kitchenSlug,
    code: row.code,
    itemType: row.itemType,
    name: row.name,
    price: row.price,
    articleNumber: row.articleNumber,
    blendeCode: row.blendeCode,
    blendePrice: row.blendePrice,
    isLocked: row.isLocked,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    ...extra,
  };
}

async function loadCatalog(prisma) {
  const [articles, blenden, services] = await Promise.all([
    prisma.catalogArticle.findMany(),
    prisma.catalogBlende.findMany(),
    prisma.catalogService.findMany(),
  ]);

  return {
    articles,
    blenden,
    services,
    articleByNumber: new Map(articles.map((article) => [article.articleNumber, article])),
    blendeByCode: new Map(blenden.map((blende) => [blende.code, blende])),
    serviceByCode: new Map(services.map((service) => [service.code, service])),
  };
}

async function loadLiveRows(prisma, seedRows) {
  const seedKeys = new Set(seedRows.map((row) => rowKey(row.kitchenSlug, row.code)));
  const seededSlugs = [...new Set(seedRows.map((row) => row.kitchenSlug))];
  const items = await prisma.kitchenItem.findMany({
    where: { kitchen: { slug: { in: seededSlugs } } },
    include: {
      kitchen: { select: { slug: true, kitchenCode: true } },
      catalogArticle: { select: { id: true, articleNumber: true, isActive: true } },
      catalogBlende: { select: { id: true, code: true, isActive: true } },
      catalogService: { select: { id: true, code: true, isActive: true } },
    },
    orderBy: [
      { kitchen: { slug: "asc" } },
      { sortOrder: "asc" },
      { code: "asc" },
    ],
  });

  return items
    .filter((item) => seedKeys.has(rowKey(item.kitchen.slug, item.code)))
    .map((item) => ({
      kitchenSlug: item.kitchen.slug,
      kitchenCode: item.kitchen.kitchenCode || null,
      code: item.code,
      itemType: item.itemType,
      articleNumber: nullableString(item.articleNumber),
      name: item.name,
      nameDe: nullableString(item.nameDe),
      price: formatMoney(item.price),
      blendeCode: nullableString(item.blendeCode),
      blendeLabel: nullableString(item.blendeLabel),
      blendePrice: formatMoney(item.blendePrice),
      iconKey: nullableString(item.iconKey),
      componentKey: nullableString(item.componentKey),
      isLocked: Boolean(item.isLocked),
      isActive: Boolean(item.isActive),
      sortOrder: item.sortOrder || 0,
      catalogArticleId: nullableString(item.catalogArticleId),
      catalogArticleNumber: nullableString(item.catalogArticle?.articleNumber),
      catalogArticleIsActive: item.catalogArticle?.isActive ?? null,
      catalogBlendeId: nullableString(item.catalogBlendeId),
      catalogBlendeCode: nullableString(item.catalogBlende?.code),
      catalogBlendeIsActive: item.catalogBlende?.isActive ?? null,
      catalogBlendeQuantity: item.catalogBlendeQuantity ?? null,
      catalogServiceId: nullableString(item.catalogServiceId),
      catalogServiceCode: nullableString(item.catalogService?.code),
      catalogServiceIsActive: item.catalogService?.isActive ?? null,
      catalogLinkStatus: nullableString(item.catalogLinkStatus),
    }));
}

async function loadTestLinkSummary(prisma) {
  const anyLink = {
    OR: [
      { catalogArticleId: { not: null } },
      { catalogBlendeId: { not: null } },
      { catalogBlendeQuantity: { not: null } },
      { catalogServiceId: { not: null } },
      { catalogLinkStatus: { not: null } },
    ],
  };

  const [total, linked] = await Promise.all([
    prisma.kitchenItem.count({ where: { kitchen: { slug: "test-3d-kitchen" } } }),
    prisma.kitchenItem.count({ where: { kitchen: { slug: "test-3d-kitchen" }, ...anyLink } }),
  ]);

  return { total, linked };
}

function expectedLinkDataForArticle(row, article) {
  return {
    catalogArticleId: article.id,
    catalogBlendeId: null,
    catalogBlendeQuantity: null,
    catalogServiceId: null,
    catalogLinkStatus: "MATCHED",
  };
}

function expectedLinkDataForArticleBlende(row, article, blende, quantity) {
  return {
    catalogArticleId: article.id,
    catalogBlendeId: blende.id,
    catalogBlendeQuantity: quantity,
    catalogServiceId: null,
    catalogLinkStatus: "MATCHED",
  };
}

function expectedLinkDataForService(service) {
  return {
    catalogArticleId: null,
    catalogBlendeId: null,
    catalogBlendeQuantity: null,
    catalogServiceId: service.id,
    catalogLinkStatus: "MATCHED",
  };
}

function linkFieldDiffs(row, expected) {
  const fields = [
    "catalogArticleId",
    "catalogBlendeId",
    "catalogBlendeQuantity",
    "catalogServiceId",
    "catalogLinkStatus",
  ];
  const diffs = {};

  for (const field of fields) {
    if ((row[field] ?? null) !== (expected[field] ?? null)) {
      diffs[field] = { actual: row[field] ?? null, expected: expected[field] ?? null };
    }
  }

  return diffs;
}

function hasAnyCatalogLink(row) {
  return Boolean(
    row.catalogArticleId
    || row.catalogBlendeId
    || row.catalogBlendeQuantity != null
    || row.catalogServiceId
    || row.catalogLinkStatus,
  );
}

function auditRows(rows, catalog) {
  const result = {
    articleOnlyMatches: [],
    articleBlendeMatches: [],
    serviceMatches: [],
    fixedPackageMatches: [],
    defaultIncludedSkipped: [],
    defaultIncludedIssues: [],
    missingCatalogRows: [],
    priceMismatches: [],
    compositeMarkerWarnings: [],
    markerProblemRows: [],
    linkStateIssues: [],
    inactiveCatalogLinks: [],
    safeToLinkLater: [],
    shouldRemainUnlinked: [],
    unknownByReason: new Map(),
  };

  for (const row of rows) {
    const markerWarnings = getCompositeMarkerWarnings(row);
    if (markerWarnings.length > 0) {
      result.compositeMarkerWarnings.push(compactRow(row, { warnings: markerWarnings }));
    }

    if (isDefaultIncluded(row)) {
      const issue = defaultIncludedIssue(row);
      result.defaultIncludedSkipped.push(compactRow(row));
      result.shouldRemainUnlinked.push(compactRow(row, { reason: "default included" }));
      if (issue) result.defaultIncludedIssues.push(compactRow(row, { issue }));
      if (hasAnyCatalogLink(row)) {
        result.linkStateIssues.push(compactRow(row, {
          reason: "default included row should remain fully unlinked",
          actual: {
            catalogArticleId: row.catalogArticleId,
            catalogBlendeId: row.catalogBlendeId,
            catalogBlendeQuantity: row.catalogBlendeQuantity,
            catalogServiceId: row.catalogServiceId,
            catalogLinkStatus: row.catalogLinkStatus,
          },
        }));
      }
      continue;
    }

    const serviceCode = SERVICE_CODE_MAP[row.code];
    if (serviceCode) {
      const service = catalog.serviceByCode.get(serviceCode);
      if (!service) {
        result.missingCatalogRows.push(compactRow(row, { reason: "missing catalog service", serviceCode }));
        continue;
      }

      if (comparePrice(row, service.price)) {
        result.serviceMatches.push(compactRow(row, { serviceCode }));
        result.safeToLinkLater.push(compactRow(row, { catalogType: "CatalogService", catalogCode: serviceCode }));
        const diffs = linkFieldDiffs(row, expectedLinkDataForService(service));
        if (Object.keys(diffs).length > 0) {
          result.linkStateIssues.push(compactRow(row, { reason: "service catalog link mismatch", diffs }));
        }
        if (service.isActive === false) {
          result.inactiveCatalogLinks.push(compactRow(row, { catalogType: "CatalogService", catalogCode: serviceCode }));
        }
      } else {
        result.priceMismatches.push(compactRow(row, {
          reason: "service price mismatch",
          serviceCode,
          expectedPrice: formatMoney(service.price),
        }));
      }
      continue;
    }

    const article = row.articleNumber ? catalog.articleByNumber.get(row.articleNumber) : null;
    if (article && row.blendeCode) {
      const normalizedBlendeCode = normalizeBlendeCode(row.blendeCode);
      const blende = catalog.blendeByCode.get(normalizedBlendeCode);
      const quantity = getBlendeQuantity(row);

      if (!blende) {
        result.missingCatalogRows.push(compactRow(row, {
          reason: "missing catalog blende",
          normalizedBlendeCode,
        }));
        continue;
      }

      const expectedPrice = Number(article.price) + (Number(blende.price) * quantity);
      if (comparePrice(row, expectedPrice)) {
        result.articleBlendeMatches.push(compactRow(row, {
          catalogArticle: article.articleNumber,
          catalogBlende: normalizedBlendeCode,
          blendeQuantity: quantity,
        }));
        result.safeToLinkLater.push(compactRow(row, {
          catalogType: "CatalogArticle+CatalogBlende",
          catalogArticle: article.articleNumber,
          catalogBlende: normalizedBlendeCode,
          blendeQuantity: quantity,
        }));
        const diffs = linkFieldDiffs(row, expectedLinkDataForArticleBlende(row, article, blende, quantity));
        if (Object.keys(diffs).length > 0) {
          result.linkStateIssues.push(compactRow(row, { reason: "article + blende catalog link mismatch", diffs }));
        }
        if (article.isActive === false || blende.isActive === false) {
          result.inactiveCatalogLinks.push(compactRow(row, {
            catalogArticle: article.articleNumber,
            catalogArticleIsActive: article.isActive,
            catalogBlende: normalizedBlendeCode,
            catalogBlendeIsActive: blende.isActive,
          }));
        }
      } else {
        result.priceMismatches.push(compactRow(row, {
          reason: "article + blende price mismatch",
          expectedPrice: formatMoney(expectedPrice),
          catalogArticlePrice: formatMoney(article.price),
          catalogBlende: normalizedBlendeCode,
          catalogBlendePrice: formatMoney(blende.price),
          blendeQuantity: quantity,
        }));
      }
      continue;
    }

    if (article) {
      if (comparePrice(row, article.price)) {
        const matchedRow = compactRow(row, { catalogArticle: article.articleNumber });
        if (article.isFixedPricePackage) {
          result.fixedPackageMatches.push(matchedRow);
        } else {
          result.articleOnlyMatches.push(matchedRow);
        }
        result.safeToLinkLater.push(compactRow(row, {
          catalogType: "CatalogArticle",
          catalogArticle: article.articleNumber,
          isFixedPricePackage: article.isFixedPricePackage,
        }));
        const diffs = linkFieldDiffs(row, expectedLinkDataForArticle(row, article));
        if (Object.keys(diffs).length > 0) {
          result.linkStateIssues.push(compactRow(row, { reason: "article catalog link mismatch", diffs }));
        }
        if (article.isActive === false) {
          result.inactiveCatalogLinks.push(compactRow(row, {
            catalogArticle: article.articleNumber,
            catalogArticleIsActive: article.isActive,
          }));
        }
      } else {
        result.priceMismatches.push(compactRow(row, {
          reason: article.isFixedPricePackage ? "fixed-package price mismatch" : "article price mismatch",
          expectedPrice: formatMoney(article.price),
          catalogArticle: article.articleNumber,
        }));
      }
      continue;
    }

    const reason = classifyUnknown(row);
    const unknownRow = compactRow(row, { reason });
    result.missingCatalogRows.push(unknownRow);
    result.shouldRemainUnlinked.push(unknownRow);
    const current = result.unknownByReason.get(reason) || 0;
    result.unknownByReason.set(reason, current + 1);
  }

  const problemRows = new Map();
  for (const row of [
    ...result.priceMismatches,
    ...result.missingCatalogRows,
    ...result.linkStateIssues,
    ...result.inactiveCatalogLinks,
  ]) {
    problemRows.set(rowKey(row.kitchenSlug, row.code), row);
  }

  result.markerProblemRows = result.compositeMarkerWarnings
    .filter((row) => problemRows.has(rowKey(row.kitchenSlug, row.code)))
    .map((row) => ({ ...row, linkedProblem: problemRows.get(rowKey(row.kitchenSlug, row.code)) }));

  return result;
}

function printSection(title, value) {
  console.log(`\n${title}`);
  console.log(JSON.stringify(value, null, 2));
}

function countBy(rows, keyFn) {
  const counts = new Map();

  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => ({ key, count }));
}

async function main() {
  const { source, seed } = loadSeedExports();
  const seedRows = buildSeedRows(seed);
  const prisma = new PrismaClient();
  let catalog;
  let liveRows;
  let testLinkSummary;

  try {
    catalog = await loadCatalog(prisma);
    liveRows = await loadLiveRows(prisma, seedRows);
    testLinkSummary = await loadTestLinkSummary(prisma);
  } finally {
    await prisma.$disconnect();
  }

  const emptyCatalogTables = [
    catalog.articles.length === 0 ? "CatalogArticle" : null,
    catalog.blenden.length === 0 ? "CatalogBlende" : null,
    catalog.services.length === 0 ? "CatalogService" : null,
  ].filter(Boolean);

  const result = auditRows(liveRows, catalog);
  const legacyMarkersInSeed = LEGACY_MARKERS.filter((marker) => source.includes(marker));
  const unknownByReason = Object.fromEntries([...result.unknownByReason.entries()].sort());
  const fullyUnlinkedRows = liveRows.filter((row) => !hasAnyCatalogLink(row));
  const defaultIncludedFullyUnlinked = result.defaultIncludedSkipped.filter((row) => (
    fullyUnlinkedRows.some((unlinkedRow) => rowKey(unlinkedRow.kitchenSlug, unlinkedRow.code) === rowKey(row.kitchenSlug, row.code))
  ));
  const markerWarningGroups = countBy(result.compositeMarkerWarnings, (row) => (
    row.warnings.map((warning) => warning.type).sort().join(", ")
  ));

  const summary = {
    catalogCounts: {
      CatalogArticle: catalog.articles.length,
      CatalogBlende: catalog.blenden.length,
      CatalogService: catalog.services.length,
    },
    defaultKitchenCount: seed.DEFAULT_KITCHENS.length,
    totalKitchenItemsChecked: liveRows.length,
    articleOnlyMatches: result.articleOnlyMatches.length,
    articleBlendeMatches: result.articleBlendeMatches.length,
    serviceMatches: result.serviceMatches.length,
    fixedPackageMatches: result.fixedPackageMatches.length,
    defaultIncludedRowsSkipped: result.defaultIncludedSkipped.length,
    defaultIncludedIssues: result.defaultIncludedIssues.length,
    missingCatalogRows: result.missingCatalogRows.length,
    priceMismatches: result.priceMismatches.length,
    inactiveCatalogLinks: result.inactiveCatalogLinks.length,
    linkStateIssues: result.linkStateIssues.length,
    legacyOrCompositeMarkerWarnings: legacyMarkersInSeed.length + result.compositeMarkerWarnings.length,
    markerProblems: result.markerProblemRows.length,
    safeToLinkLater: result.safeToLinkLater.length,
    shouldRemainUnlinked: result.shouldRemainUnlinked.length,
    matchedCatalogLinkRows: liveRows.filter((row) => row.catalogLinkStatus === "MATCHED").length,
    fullyUnlinkedSeededRows: fullyUnlinkedRows.length,
    defaultIncludedRowsFullyUnlinked: defaultIncludedFullyUnlinked.length,
    test3dKitchenRows: testLinkSummary.total,
    test3dKitchenRowsWithCatalogLinks: testLinkSummary.linked,
    unknownByReason,
  };

  console.log("Catalog parity audit summary");
  console.log(JSON.stringify(summary, null, 2));

  printSection("Price mismatches (failing)", result.priceMismatches.slice(0, 50));
  printSection("Missing catalog rows / manual review (failing for non-default production rows)", result.missingCatalogRows.slice(0, 100));
  printSection("Default included issues (review)", result.defaultIncludedIssues.slice(0, 50));
  printSection("Legacy/composite marker warnings (non-failing unless tied to pricing/link problems)", {
    seedMarkers: legacyMarkersInSeed,
    grouped: markerWarningGroups,
    examples: result.compositeMarkerWarnings.slice(0, 10),
  });
  printSection("Marker rows with real pricing/link problems (failing)", result.markerProblemRows.slice(0, 50));
  printSection("Catalog link state issues (failing)", result.linkStateIssues.slice(0, 50));
  printSection("Inactive catalog links (failing)", result.inactiveCatalogLinks.slice(0, 50));
  printSection("Safe to link later grouped by catalog target", countBy(result.safeToLinkLater, (row) => {
    if (row.catalogType === "CatalogService") return `${row.catalogType}:${row.catalogCode}`;
    if (row.catalogType === "CatalogArticle+CatalogBlende") {
      return `${row.catalogType}:${row.catalogArticle}+${row.catalogBlende}x${row.blendeQuantity}`;
    }
    return `${row.catalogType}:${row.catalogArticle}`;
  }));
  printSection("Safe to link later examples", result.safeToLinkLater.slice(0, 10));
  printSection("Should remain unlinked grouped by reason", countBy(result.shouldRemainUnlinked, (row) => row.reason));
  printSection("Should remain unlinked examples", result.shouldRemainUnlinked.slice(0, 10));

  const shouldFail = (
    emptyCatalogTables.length > 0
    || result.priceMismatches.length > 0
    || result.missingCatalogRows.length > 0
    || result.linkStateIssues.length > 0
    || result.inactiveCatalogLinks.length > 0
    || result.markerProblemRows.length > 0
    || testLinkSummary.linked > 0
    || liveRows.filter((row) => row.catalogLinkStatus === "MATCHED").length !== result.safeToLinkLater.length
    || defaultIncludedFullyUnlinked.length !== result.defaultIncludedSkipped.length
  );

  if (emptyCatalogTables.length > 0) {
    console.error(`\nCatalog parity audit failed: empty catalog tables: ${emptyCatalogTables.join(", ")}`);
  }

  if (shouldFail) {
    console.error("\nCatalog parity audit failed: catalog tables are empty, prices differ, catalog rows are missing/inactive, link state is wrong, or test/default rows are linked incorrectly.");
    process.exitCode = 1;
  } else {
    console.log("\nCatalog parity audit passed: matched catalog rows agree with KitchenItem prices; marker/composite strings are warnings only.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
