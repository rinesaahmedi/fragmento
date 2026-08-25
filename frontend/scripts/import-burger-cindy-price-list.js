const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const PROGRAMM_ID = "BURGER CINDY";
const DEFAULT_PROGRAMM_ID = "IP 2200";
const SOURCE_NAME = "260505 Fragmento Otto Wulff Saga VK - Burger - 2.pdf";
const IMPORT_LABEL = "Burger - Cindy Type price list 2026 (Impuls article set)";

// Burger uses the Impuls catalog identities. Only these prices come from the
// Burger supplier list; names and all other fields come from Impuls.
const ARTICLE_PRICES = {
  "A-EGSPV587915 + TGV45": 450,
  "A-EGSPV597210 + TGV60": 586,
  "EWA34660W + TGV60 + WU16": 655,
  "FH664621E + FWK124 + HD6002": 346,
  H10002: 211, H3002: 124, H4002: 128, H4502: 137,
  H5002: 135, H6002: 146, H8002: 193, H9002: 203,
  KHF664611S: 195,
  "KHF664611S + FWP18": 209,
  "OL-KGCN388140E": 579,
  US100: 427, US120: 455,
  US2A100: 718, US2A30: 387, US2A40: 396, US2A45: 414,
  US2A50: 432, US2A60: 461, US2A80: 672, US2A90: 705,
  US30: 222, US40: 232, US45: 249, US50: 247,
  US60: 270, US80: 392, US90: 410,
  517467: 89,
  "KALB KA220043_S3": 69,
  ZB100SG: 28, ZB30SG: 13, ZB40SG: 15, ZB45SG: 17,
  ZB50SG: 18, ZB60SG: 20, ZB80SG: 25, ZB90SG: 26,
};

const BLENDE_PRICES = { HPEF4302: 79, HPK2002: 35, UPEF65: 79, UPK20: 33 };
const SERVICE_PRICES = { MONTAGE: 349, PICKUP: 0 };

// The original supplier-code import touched shared master records. Restore the
// original live Impuls identity fields before cloning them into Burger.
const IMPULS_ARTICLE_RESTORES = {
  "A-EGSPV597210 + TGV60": {
    name: "Fully Integrated Dishwasher incl. Furniture Front",
    nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront",
    widthMm: 600, heightMm: null, depthMm: null,
    itemType: "COMPONENT", isFixedPricePackage: true,
  },
  KHF664611S: {
    name: "Angled extractor hood", nameDe: "Schrägesse",
    widthMm: null, heightMm: null, depthMm: null,
    itemType: "COMPONENT", isFixedPricePackage: false,
  },
  "KHF664611S + FWP18": {
    name: "Angled Extractor Hood + filter", nameDe: "Schrägesse + Filter",
    widthMm: null, heightMm: null, depthMm: null,
    itemType: "COMPONENT", isFixedPricePackage: true,
  },
  "OL-KGCN388140E": {
    name: "Freestanding refrigerator 181 cm", nameDe: "Standkühlschrank 181 cm",
    widthMm: 540, heightMm: 1780, depthMm: null,
    itemType: "COMPONENT", isFixedPricePackage: false,
  },
  US100: { name: "Lower cabinet with Drawer 100 cm", nameDe: "Unterschrank mit Schublade 100 cm", widthMm: 1000 },
  US120: { name: "Lower cabinet with Drawer 120 cm", nameDe: "Unterschrank mit Schublade 120 cm", widthMm: 1200 },
  US2A100: { name: "Lower cabinet with Drawer/Soft-close 100", nameDe: "Unterschrank mit Schublade/Auszug 100", widthMm: 1000 },
  US2A30: { name: "Lower cabinet with Drawer/Soft-close 30", nameDe: "Unterschrank mit Schublade/Auszug 30", widthMm: 300 },
  US2A40: { name: "Lower cabinet with Drawer/Soft-close 40", nameDe: "Unterschrank mit Schublade/Auszug 40", widthMm: 400 },
  US2A45: { name: "Lower cabinet with Drawer/Soft-close 45", nameDe: "Unterschrank mit Schublade/Auszug 45", widthMm: 450 },
  US2A50: { name: "Lower cabinet with Drawer/Soft-close 50", nameDe: "Unterschrank mit Schublade/Auszug 50", widthMm: 500 },
  US2A60: { name: "Base cabinet with drawers 60 cm", nameDe: "Unterschrank mit Auszügen 60 cm", widthMm: 600 },
  US2A80: { name: "Lower cabinet with Drawer/Soft-close 80", nameDe: "Unterschrank mit Schublade/Auszug 80", widthMm: 800 },
  US2A90: { name: "Lower cabinet with Drawer/Soft-close 90", nameDe: "Unterschrank mit Schublade/Auszug 90", widthMm: 900 },
  US30: { name: "Lower cabinet with Drawer 30 cm", nameDe: "Unterschrank mit Schublade 30 cm", widthMm: 300 },
  US40: { name: "Lower cabinet with Drawer 40 cm", nameDe: "Unterschrank mit Schublade 40 cm", widthMm: 400 },
  US45: { name: "Lower cabinet with Drawer 45 cm", nameDe: "Unterschrank mit Schublade 45 cm", widthMm: 450 },
  US50: { name: "Lower cabinet with Drawer 50 cm", nameDe: "Unterschrank mit Schublade 50 cm", widthMm: 500, depthMm: 600 },
  US60: { name: "Lower cabinet with Drawer 60 cm", nameDe: "Unterschrank mit Schublade 60 cm", widthMm: 600, depthMm: 600 },
  US80: { name: "Lower cabinet with Drawer 80 cm", nameDe: "Unterschrank mit Schublade 80 cm", widthMm: 800 },
  US90: { name: "Lower cabinet with Drawer 90 cm", nameDe: "Unterschrank mit Schublade 90 cm", widthMm: 900 },
  517467: { name: "Waste separation system Blanco Botton", nameDe: "Mülltrennsystem Blanco Botton" },
  "KALB KA220043_S3": { name: "Lighting set with 3 LED spotlights", nameDe: "Beleuchtungsset 3 LED-Spots" },
};

for (const articleNumber of [
  "US100", "US120", "US2A100", "US2A30", "US2A40", "US2A45", "US2A50", "US2A60", "US2A80", "US2A90",
  "US30", "US40", "US45", "US80", "US90",
]) {
  Object.assign(IMPULS_ARTICLE_RESTORES[articleNumber], {
    heightMm: null, depthMm: null, itemType: "COMPONENT", isFixedPricePackage: false,
  });
}
for (const articleNumber of ["US50", "US60"]) {
  Object.assign(IMPULS_ARTICLE_RESTORES[articleNumber], {
    heightMm: null, itemType: "COMPONENT", isFixedPricePackage: false,
  });
}
for (const articleNumber of ["517467", "KALB KA220043_S3"]) {
  Object.assign(IMPULS_ARTICLE_RESTORES[articleNumber], {
    widthMm: null, heightMm: null, depthMm: null,
    itemType: "ACCESSORY", isFixedPricePackage: false,
  });
}

async function backfillImpulsProgramPrices(cutoff) {
  const [articles, blenden, services] = await Promise.all([
    prisma.catalogArticle.findMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.catalogBlende.findMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.catalogService.findMany({ where: { createdAt: { lt: cutoff } } }),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.catalogProgram.upsert({
      where: { programmId: DEFAULT_PROGRAMM_ID },
      create: { programmId: DEFAULT_PROGRAMM_ID, name: "Impuls", isActive: true },
      update: { name: "Impuls", isActive: true },
    });
    for (const record of articles) {
      await tx.catalogArticleProgramPrice.upsert({
        where: { programmId_catalogArticleId: { programmId: DEFAULT_PROGRAMM_ID, catalogArticleId: record.id } },
        create: { programmId: DEFAULT_PROGRAMM_ID, catalogArticleId: record.id, articleNumber: record.articleNumber, price: record.price, isActive: record.isActive },
        update: {},
      });
    }
    for (const record of blenden) {
      await tx.catalogBlendeProgramPrice.upsert({
        where: { programmId_catalogBlendeId: { programmId: DEFAULT_PROGRAMM_ID, catalogBlendeId: record.id } },
        create: { programmId: DEFAULT_PROGRAMM_ID, catalogBlendeId: record.id, code: record.code, price: record.price, isActive: record.isActive },
        update: {},
      });
    }
    for (const record of services) {
      await tx.catalogServiceProgramPrice.upsert({
        where: { programmId_catalogServiceId: { programmId: DEFAULT_PROGRAMM_ID, catalogServiceId: record.id } },
        create: { programmId: DEFAULT_PROGRAMM_ID, catalogServiceId: record.id, code: record.code, price: record.price, isActive: record.isActive },
        update: {},
      });
    }
  });

  return { articles: articles.length, blenden: blenden.length, services: services.length };
}

async function restoreImpulsMasterMetadata() {
  await prisma.$transaction(async (tx) => {
    for (const [articleNumber, data] of Object.entries(IMPULS_ARTICLE_RESTORES)) {
      await tx.catalogArticle.updateMany({
        where: { articleNumber, programPrices: { some: { programmId: DEFAULT_PROGRAMM_ID } } },
        data,
      });
    }
    await tx.catalogService.updateMany({
      where: { code: "MONTAGE", programPrices: { some: { programmId: DEFAULT_PROGRAMM_ID } } },
      data: {
        name: "Delivery, Carry-in, Assembly and Installation",
        nameDe: "Lieferung, Vertragen, Montage und Anschluss",
      },
    });
  });
}

async function removeBurgerOnlyCatalogRecords() {
  const [impulsArticles, impulsBlenden, impulsServices, burgerArticles, burgerBlenden, burgerServices] = await Promise.all([
    prisma.catalogArticleProgramPrice.findMany({ where: { programmId: DEFAULT_PROGRAMM_ID }, select: { catalogArticleId: true } }),
    prisma.catalogBlendeProgramPrice.findMany({ where: { programmId: DEFAULT_PROGRAMM_ID }, select: { catalogBlendeId: true } }),
    prisma.catalogServiceProgramPrice.findMany({ where: { programmId: DEFAULT_PROGRAMM_ID }, select: { catalogServiceId: true } }),
    prisma.catalogArticleProgramPrice.findMany({ where: { programmId: PROGRAMM_ID }, select: { catalogArticleId: true } }),
    prisma.catalogBlendeProgramPrice.findMany({ where: { programmId: PROGRAMM_ID }, select: { catalogBlendeId: true } }),
    prisma.catalogServiceProgramPrice.findMany({ where: { programmId: PROGRAMM_ID }, select: { catalogServiceId: true } }),
  ]);
  const articleIds = new Set(impulsArticles.map((row) => row.catalogArticleId));
  const blendeIds = new Set(impulsBlenden.map((row) => row.catalogBlendeId));
  const serviceIds = new Set(impulsServices.map((row) => row.catalogServiceId));
  const extraArticleIds = burgerArticles.map((row) => row.catalogArticleId).filter((id) => !articleIds.has(id));
  const extraBlendeIds = burgerBlenden.map((row) => row.catalogBlendeId).filter((id) => !blendeIds.has(id));
  const extraServiceIds = burgerServices.map((row) => row.catalogServiceId).filter((id) => !serviceIds.has(id));

  await prisma.$transaction(async (tx) => {
    if (extraArticleIds.length) {
      await tx.catalogArticleProgramPrice.deleteMany({ where: { programmId: PROGRAMM_ID, catalogArticleId: { in: extraArticleIds } } });
      await tx.catalogArticle.deleteMany({ where: { id: { in: extraArticleIds }, programPrices: { none: {} }, kitchenItems: { none: {} } } });
    }
    if (extraBlendeIds.length) {
      await tx.catalogBlendeProgramPrice.deleteMany({ where: { programmId: PROGRAMM_ID, catalogBlendeId: { in: extraBlendeIds } } });
      await tx.catalogBlende.deleteMany({ where: { id: { in: extraBlendeIds }, programPrices: { none: {} }, kitchenItems: { none: {} } } });
    }
    if (extraServiceIds.length) {
      await tx.catalogServiceProgramPrice.deleteMany({ where: { programmId: PROGRAMM_ID, catalogServiceId: { in: extraServiceIds } } });
      await tx.catalogService.deleteMany({ where: { id: { in: extraServiceIds }, programPrices: { none: {} }, kitchenItems: { none: {} } } });
    }
  });

  return { articles: extraArticleIds.length, blenden: extraBlendeIds.length, services: extraServiceIds.length };
}

function mappedPrice(prices, identifier, kind) {
  if (!Object.prototype.hasOwnProperty.call(prices, identifier)) {
    throw new Error(`Burger ${kind} price is missing for Impuls identifier ${identifier}.`);
  }
  return Number(prices[identifier]).toFixed(2);
}

async function buildParsedFromImpulsCatalog() {
  const [articles, blenden, services] = await Promise.all([
    prisma.catalogArticleProgramPrice.findMany({
      where: { programmId: DEFAULT_PROGRAMM_ID }, include: { catalogArticle: true }, orderBy: { articleNumber: "asc" },
    }),
    prisma.catalogBlendeProgramPrice.findMany({
      where: { programmId: DEFAULT_PROGRAMM_ID }, include: { catalogBlende: true }, orderBy: { code: "asc" },
    }),
    prisma.catalogServiceProgramPrice.findMany({
      where: { programmId: DEFAULT_PROGRAMM_ID }, include: { catalogService: true }, orderBy: { code: "asc" },
    }),
  ]);

  const parsed = {
    articles: articles.map(({ catalogArticle: record, isActive }) => ({
      key: record.articleNumber,
      data: {
        articleNumber: record.articleNumber, name: record.name, nameDe: record.nameDe,
        description: record.description, widthMm: record.widthMm, heightMm: record.heightMm,
        depthMm: record.depthMm, itemType: record.itemType,
        price: mappedPrice(ARTICLE_PRICES, record.articleNumber, "article"),
        isFixedPricePackage: record.isFixedPricePackage, isActive,
      },
    })),
    blenden: blenden.map(({ catalogBlende: record, isActive }) => ({
      key: record.code,
      data: {
        code: record.code, name: record.name, nameDe: record.nameDe,
        description: record.description, price: mappedPrice(BLENDE_PRICES, record.code, "blende"), isActive,
      },
    })),
    services: services.map(({ catalogService: record, isActive }) => ({
      key: record.code,
      data: {
        code: record.code, name: record.name, nameDe: record.nameDe,
        description: record.description, price: mappedPrice(SERVICE_PRICES, record.code, "service"), isActive,
      },
    })),
    validationErrors: [],
  };

  const expectedCounts = {
    articles: Object.keys(ARTICLE_PRICES).length,
    blenden: Object.keys(BLENDE_PRICES).length,
    services: Object.keys(SERVICE_PRICES).length,
  };
  for (const kind of ["articles", "blenden", "services"]) {
    if (parsed[kind].length !== expectedCounts[kind]) {
      throw new Error(`Impuls ${kind} count is ${parsed[kind].length}; expected ${expectedCounts[kind]} before Burger import.`);
    }
  }
  return parsed;
}

async function main() {
  const force = process.argv.includes("--force");
  const firstBurgerImport = await prisma.catalogPriceListImport.findFirst({
    where: { programmId: PROGRAMM_ID, sourceName: SOURCE_NAME },
    orderBy: { createdAt: "asc" },
  });
  const impulsBackfill = await backfillImpulsProgramPrices(firstBurgerImport?.createdAt || new Date());
  await restoreImpulsMasterMetadata();
  const removed = await removeBurgerOnlyCatalogRecords();
  const parsed = await buildParsedFromImpulsCatalog();

  await prisma.catalogProgram.upsert({
    where: { programmId: PROGRAMM_ID },
    create: { programmId: PROGRAMM_ID, name: "Burger - Cindy Type", description: "Supplier price list valid through 2026-12-31.", isActive: true },
    update: { name: "Burger - Cindy Type", description: "Supplier price list valid through 2026-12-31.", isActive: true },
  });

  const existingAlignedImport = await prisma.catalogPriceListImport.findFirst({
    where: { programmId: PROGRAMM_ID, label: IMPORT_LABEL, status: { in: ["APPLIED", "SCHEDULED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existingAlignedImport && !force) {
    console.log(`Burger catalog is already aligned by import ${existingAlignedImport.id}.`);
    console.log(JSON.stringify({ impulsBackfill, removed }, null, 2));
    return;
  }

  const { applyCatalogPriceListImport } = await import("../lib/catalog-price-list-import.js");
  const result = await applyCatalogPriceListImport(prisma, parsed, {
    sourceName: SOURCE_NAME,
    programmId: PROGRAMM_ID,
    effectiveFrom: new Date(),
    label: IMPORT_LABEL,
    notes: [
      "Source validity: 2026-12-31. Minimum order value: EUR 1,000 excluding services.",
      "Burger prices are mapped onto the exact Impuls master article, blende, and service records.",
      "The 45 cm dishwasher is absent from the Burger list and retains the Impuls price as a fallback.",
    ].join("\n"),
    importedBy: "price-list-script",
    syncLinkedKitchenItems: true,
    includeLocked: false,
    includeTestKitchens: false,
  });

  console.log(JSON.stringify({
    programmId: PROGRAMM_ID,
    importId: result.importRecord.id,
    impulsBackfill,
    removed,
    summary: result.summary,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
