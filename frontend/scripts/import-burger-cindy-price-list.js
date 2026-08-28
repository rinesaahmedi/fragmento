const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const PROGRAMM_ID = "BURGER CINDY";
const DEFAULT_PROGRAMM_ID = "IP 2200";
const SOURCE_NAME = "260505 Fragmento Otto Wulff Saga VK - Burger - 2.pdf";
const IMPORT_LABEL = "Burger - Cindy Type price list 2026 (supplier article codes)";

// The Burger list has its own Typen-NR. values. The source identifier points
// to the equivalent Impuls record so descriptive metadata can be reused, while
// target is the exact Burger code shown in the PDF. The two visually clipped
// bundle codes are completed from the component rows immediately above them.
const ARTICLE_CODE_MAPPINGS = [
  { source: "US30", target: "US30", price: 222 },
  { source: "US40", target: "US40", price: 232 },
  { source: "US45", target: "US45", price: 249 },
  { source: "US50", target: "US50", price: 247 },
  { source: "US60", target: "US60", price: 270 },
  { source: "US80", target: "US80", price: 392 },
  { source: "US90", target: "US90", price: 410 },
  { source: "US100", target: "US100", price: 427 },
  { source: "US120", target: "US120", price: 455 },
  { source: "US2A30", target: "US2A30", price: 387 },
  { source: "US2A40", target: "US2A40", price: 396 },
  { source: "US2A45", target: "US2A45", price: 414 },
  { source: "US2A50", target: "US2A50", price: 432 },
  { source: "US2A60", target: "US2A60", price: 461 },
  { source: "US2A80", target: "US2A80", price: 672 },
  { source: "US2A90", target: "US2A90", price: 705 },
  { source: "US2A100", target: "US2A100", price: 718 },
  { source: "H3002", target: "H3072", price: 124 },
  { source: "H4502", target: "H4572", price: 137 },
  { source: "H6002", target: "H6072", price: 146 },
  { source: "H4002", target: "H4072", price: 128 },
  { source: "H5002", target: "H5072", price: 135 },
  { source: "H8002", target: "H8072", price: 193 },
  { source: "H9002", target: "H9072", price: 203 },
  { source: "H10002", target: "H10072", price: 211 },
  { source: "A-EGSPV597210 + TGV60", target: "A-EGSPV597210 + TGV60", price: 586 },
  {
    source: "A-EGSPV587915 + TGV45",
    target: "A-EGSPV594 + TGV60",
    price: 687,
    overrides: {
      name: "Fully Integrated Dishwasher incl. Furniture Front",
      nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront",
      widthMm: 600,
      isFixedPricePackage: true,
    },
  },
  { source: "OL-KGCN388140E", target: "OL-KGCN388140E", price: 579 },
  {
    source: "FH664621E + FWK124 + HD6002",
    target: "FH664621E+FWK124+HFLH6072",
    legacyTargets: ["FH664621E + FWK124 + HFLH6072"],
    price: 346,
  },
  {
    source: "EWA34660W + TGV60 + WU16",
    target: "EWA34660W+TV60+WU1672",
    legacyTargets: ["EWA34660W + TV60 + WU1672"],
    price: 655,
  },
  { source: "KHF664611S", target: "KHF664611S", price: 195 },
  { source: "KHF664611S + FWP18", target: "KHF664611S+FWP18", price: 209 },
  { source: "517467", target: "Blanco Botton 517467", price: 89 },
  { source: "ZB30SG", target: "ZBE30", price: 13 },
  { source: "ZB40SG", target: "ZBE40", price: 15 },
  { source: "ZB45SG", target: "ZBE45", price: 17 },
  { source: "ZB50SG", target: "ZBE50", price: 18 },
  { source: "ZB60SG", target: "ZBE60", price: 20 },
  { source: "ZB80SG", target: "ZBE80", price: 25 },
  { source: "ZB90SG", target: "ZBE90", price: 26 },
  { source: "ZB100SG", target: "ZBE100", price: 28 },
  { source: "KALB KA220043_S3", target: "KALB KA220043_S3", price: 69 },
];

const BLENDE_CODE_MAPPINGS = [
  { source: "UPK20", target: "UP20K", price: 33 },
  { source: "HPK2002", target: "HP2072K", price: 35 },
  { source: "UPEF65", target: "UPE65", price: 79 },
  { source: "HPEF4302", target: "HPE7072", price: 79 },
];
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
    name: "Freestanding Refrigerator 181 cm", nameDe: "Standkühlschrank 181 cm",
    widthMm: 540, heightMm: 1810, depthMm: null,
    itemType: "COMPONENT", isFixedPricePackage: false,
  },
  US100: { name: "Lower Cabinet with Drawer 100 cm", nameDe: "Unterschrank mit Schublade 100 cm", widthMm: 1000 },
  US120: { name: "Lower Cabinet with Drawer 120 cm", nameDe: "Unterschrank mit Schublade 120 cm", widthMm: 1200 },
  US2A100: { name: "Lower Cabinet with Drawer/Soft-close 100", nameDe: "Unterschrank mit Schublade/Auszug 100", widthMm: 1000 },
  US2A30: { name: "Lower Cabinet with Drawer/Soft-close 30", nameDe: "Unterschrank mit Schublade/Auszug 30", widthMm: 300 },
  US2A40: { name: "Lower Cabinet with Drawer/Soft-close 40", nameDe: "Unterschrank mit Schublade/Auszug 40", widthMm: 400 },
  US2A45: { name: "Lower Cabinet with Drawer/Soft-close 45", nameDe: "Unterschrank mit Schublade/Auszug 45", widthMm: 450 },
  US2A50: { name: "Lower Cabinet with Drawer/Soft-close 50", nameDe: "Unterschrank mit Schublade/Auszug 50", widthMm: 500 },
  US2A60: { name: "Base cabinet with drawers 60 cm", nameDe: "Unterschrank mit Auszügen 60 cm", widthMm: 600 },
  US2A80: { name: "Lower Cabinet with Drawer/Soft-close 80", nameDe: "Unterschrank mit Schublade/Auszug 80", widthMm: 800 },
  US2A90: { name: "Lower Cabinet with Drawer/Soft-close 90", nameDe: "Unterschrank mit Schublade/Auszug 90", widthMm: 900 },
  US30: { name: "Lower Cabinet with Drawer 30 cm", nameDe: "Unterschrank mit Schublade 30 cm", widthMm: 300 },
  US40: { name: "Lower Cabinet with Drawer 40 cm", nameDe: "Unterschrank mit Schublade 40 cm", widthMm: 400 },
  US45: { name: "Lower Cabinet with Drawer 45 cm", nameDe: "Unterschrank mit Schublade 45 cm", widthMm: 450 },
  US50: { name: "Lower Cabinet with Drawer 50 cm", nameDe: "Unterschrank mit Schublade 50 cm", widthMm: 500, depthMm: null },
  US60: { name: "Lower Cabinet with Drawer 60 cm", nameDe: "Unterschrank mit Schublade 60 cm", widthMm: 600, depthMm: null },
  US80: { name: "Lower Cabinet with Drawer 80 cm", nameDe: "Unterschrank mit Schublade 80 cm", widthMm: 800 },
  US90: { name: "Lower Cabinet with Drawer 90 cm", nameDe: "Unterschrank mit Schublade 90 cm", widthMm: 900 },
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

async function restoreImpulsCatalogIdentifiers() {
  let articles = 0;
  let blenden = 0;

  for (const mapping of ARTICLE_CODE_MAPPINGS.filter((row) => row.source !== row.target)) {
    const legacyArticleNumbers = [mapping.target, ...(mapping.legacyTargets || [])];
    const changed = await prisma.$transaction(async (tx) => {
      const [sourceRecord, legacyRecords] = await Promise.all([
        tx.catalogArticle.findUnique({ where: { articleNumber: mapping.source } }),
        tx.catalogArticle.findMany({
          where: {
            articleNumber: { in: legacyArticleNumbers },
            programPrices: { some: { programmId: DEFAULT_PROGRAMM_ID } },
          },
          include: { programPrices: { where: { programmId: DEFAULT_PROGRAMM_ID }, take: 1 } },
        }),
      ]);
      if (!legacyRecords.length) return 0;

      if (!sourceRecord) {
        const legacy = legacyRecords[0];
        await tx.catalogArticle.update({ where: { id: legacy.id }, data: { articleNumber: mapping.source } });
        await tx.catalogArticleProgramPrice.updateMany({
          where: { programmId: DEFAULT_PROGRAMM_ID, catalogArticleId: legacy.id },
          data: { articleNumber: mapping.source },
        });
        await tx.kitchenItem.updateMany({
          where: { catalogArticleId: legacy.id, kitchen: { programmId: DEFAULT_PROGRAMM_ID } },
          data: { articleNumber: mapping.source },
        });
        return 1;
      }

      for (const legacy of legacyRecords) {
        const legacyPrice = legacy.programPrices[0];
        if (legacyPrice) {
          await tx.catalogArticleProgramPrice.upsert({
            where: {
              programmId_catalogArticleId: {
                programmId: DEFAULT_PROGRAMM_ID,
                catalogArticleId: sourceRecord.id,
              },
            },
            create: {
              programmId: DEFAULT_PROGRAMM_ID,
              catalogArticleId: sourceRecord.id,
              articleNumber: mapping.source,
              price: legacyPrice.price,
              isActive: legacyPrice.isActive,
            },
            update: { articleNumber: mapping.source },
          });
        }
        await tx.kitchenItem.updateMany({
          where: { catalogArticleId: legacy.id, kitchen: { programmId: DEFAULT_PROGRAMM_ID } },
          data: { catalogArticleId: sourceRecord.id, articleNumber: mapping.source },
        });
        await tx.catalogArticleProgramPrice.deleteMany({
          where: { programmId: DEFAULT_PROGRAMM_ID, catalogArticleId: legacy.id },
        });
      }
      return legacyRecords.length;
    });
    articles += changed;
  }

  for (const mapping of BLENDE_CODE_MAPPINGS.filter((row) => row.source !== row.target)) {
    const changed = await prisma.$transaction(async (tx) => {
      const [sourceRecord, legacyRecord] = await Promise.all([
        tx.catalogBlende.findUnique({ where: { code: mapping.source } }),
        tx.catalogBlende.findFirst({
          where: {
            code: mapping.target,
            programPrices: { some: { programmId: DEFAULT_PROGRAMM_ID } },
          },
          include: { programPrices: { where: { programmId: DEFAULT_PROGRAMM_ID }, take: 1 } },
        }),
      ]);
      if (!legacyRecord) return 0;

      if (!sourceRecord) {
        await tx.catalogBlende.update({ where: { id: legacyRecord.id }, data: { code: mapping.source } });
        await tx.catalogBlendeProgramPrice.updateMany({
          where: { programmId: DEFAULT_PROGRAMM_ID, catalogBlendeId: legacyRecord.id },
          data: { code: mapping.source },
        });
        await tx.kitchenItem.updateMany({
          where: { catalogBlendeId: legacyRecord.id, kitchen: { programmId: DEFAULT_PROGRAMM_ID } },
          data: { blendeCode: mapping.source },
        });
        return 1;
      }

      const legacyPrice = legacyRecord.programPrices[0];
      if (legacyPrice) {
        await tx.catalogBlendeProgramPrice.upsert({
          where: {
            programmId_catalogBlendeId: {
              programmId: DEFAULT_PROGRAMM_ID,
              catalogBlendeId: sourceRecord.id,
            },
          },
          create: {
            programmId: DEFAULT_PROGRAMM_ID,
            catalogBlendeId: sourceRecord.id,
            code: mapping.source,
            price: legacyPrice.price,
            isActive: legacyPrice.isActive,
          },
          update: { code: mapping.source },
        });
      }
      await tx.kitchenItem.updateMany({
        where: { catalogBlendeId: legacyRecord.id, kitchen: { programmId: DEFAULT_PROGRAMM_ID } },
        data: { catalogBlendeId: sourceRecord.id, blendeCode: mapping.source },
      });
      await tx.catalogBlendeProgramPrice.deleteMany({
        where: { programmId: DEFAULT_PROGRAMM_ID, catalogBlendeId: legacyRecord.id },
      });
      return 1;
    });
    blenden += changed;
  }

  return { articles, blenden };
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

async function removeObsoleteBurgerProgramPrices() {
  const validArticleNumbers = ARTICLE_CODE_MAPPINGS.map((row) => row.target);
  const validBlendeCodes = BLENDE_CODE_MAPPINGS.map((row) => row.target);
  const validServiceCodes = new Set(Object.keys(SERVICE_PRICES));
  const [validArticles, validBlenden, burgerArticles, burgerBlenden, burgerServices] = await Promise.all([
    prisma.catalogArticle.findMany({ where: { articleNumber: { in: validArticleNumbers } }, select: { id: true } }),
    prisma.catalogBlende.findMany({ where: { code: { in: validBlendeCodes } }, select: { id: true } }),
    prisma.catalogArticleProgramPrice.findMany({ where: { programmId: PROGRAMM_ID } }),
    prisma.catalogBlendeProgramPrice.findMany({ where: { programmId: PROGRAMM_ID } }),
    prisma.catalogServiceProgramPrice.findMany({ where: { programmId: PROGRAMM_ID } }),
  ]);
  const validArticleIds = new Set(validArticles.map((row) => row.id));
  const validBlendeIds = new Set(validBlenden.map((row) => row.id));
  const obsoleteArticles = burgerArticles.filter((row) => !validArticleIds.has(row.catalogArticleId));
  const obsoleteBlenden = burgerBlenden.filter((row) => !validBlendeIds.has(row.catalogBlendeId));
  const obsoleteServices = burgerServices.filter((row) => !validServiceCodes.has(row.code));

  await prisma.$transaction(async (tx) => {
    if (obsoleteArticles.length) {
      const ids = obsoleteArticles.map((row) => row.catalogArticleId);
      await tx.catalogArticleProgramPrice.deleteMany({ where: { programmId: PROGRAMM_ID, catalogArticleId: { in: ids } } });
      await tx.catalogArticle.deleteMany({ where: { id: { in: ids }, programPrices: { none: {} }, kitchenItems: { none: {} } } });
    }
    if (obsoleteBlenden.length) {
      const ids = obsoleteBlenden.map((row) => row.catalogBlendeId);
      await tx.catalogBlendeProgramPrice.deleteMany({ where: { programmId: PROGRAMM_ID, catalogBlendeId: { in: ids } } });
      await tx.catalogBlende.deleteMany({ where: { id: { in: ids }, programPrices: { none: {} }, kitchenItems: { none: {} } } });
    }
    if (obsoleteServices.length) {
      const ids = obsoleteServices.map((row) => row.catalogServiceId);
      await tx.catalogServiceProgramPrice.deleteMany({ where: { programmId: PROGRAMM_ID, catalogServiceId: { in: ids } } });
      await tx.catalogService.deleteMany({ where: { id: { in: ids }, programPrices: { none: {} }, kitchenItems: { none: {} } } });
    }
  });

  return {
    articles: obsoleteArticles.length,
    blenden: obsoleteBlenden.length,
    services: obsoleteServices.length,
  };
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

  const articleByNumber = new Map(articles.map((row) => [row.catalogArticle.articleNumber, row]));
  const blendeByCode = new Map(blenden.map((row) => [row.catalogBlende.code, row]));
  const serviceByCode = new Map(services.map((row) => [row.catalogService.code, row]));
  const missingArticles = ARTICLE_CODE_MAPPINGS.filter((row) => !articleByNumber.has(row.source)).map((row) => row.source);
  const missingBlenden = BLENDE_CODE_MAPPINGS.filter((row) => !blendeByCode.has(row.source)).map((row) => row.source);
  const missingServices = Object.keys(SERVICE_PRICES).filter((code) => !serviceByCode.has(code));
  if (missingArticles.length || missingBlenden.length || missingServices.length) {
    throw new Error([
      missingArticles.length ? `Impuls articles missing: ${missingArticles.join(", ")}` : null,
      missingBlenden.length ? `Impuls blenden missing: ${missingBlenden.join(", ")}` : null,
      missingServices.length ? `Impuls services missing: ${missingServices.join(", ")}` : null,
    ].filter(Boolean).join(". "));
  }

  const parsed = {
    articles: ARTICLE_CODE_MAPPINGS.map((mapping) => {
      const { catalogArticle: record, isActive } = articleByNumber.get(mapping.source);
      return {
        key: mapping.target,
        data: {
          articleNumber: mapping.target, name: record.name, nameDe: record.nameDe,
          description: record.description, widthMm: record.widthMm, heightMm: record.heightMm,
          depthMm: record.depthMm, itemType: record.itemType,
          price: Number(mapping.price).toFixed(2),
          isFixedPricePackage: record.isFixedPricePackage, isActive,
          ...(mapping.overrides || {}),
        },
      };
    }),
    blenden: BLENDE_CODE_MAPPINGS.map((mapping) => {
      const { catalogBlende: record, isActive } = blendeByCode.get(mapping.source);
      return {
        key: mapping.target,
        data: {
          code: mapping.target, name: record.name, nameDe: record.nameDe,
          description: record.description, price: Number(mapping.price).toFixed(2), isActive,
        },
      };
    }),
    services: Object.entries(SERVICE_PRICES).map(([code, price]) => {
      const { catalogService: record, isActive } = serviceByCode.get(code);
      return {
        key: code,
        data: {
          code: record.code, name: record.name, nameDe: record.nameDe,
          description: record.description, price: Number(price).toFixed(2), isActive,
        },
      };
    }),
    validationErrors: [],
  };

  const expectedCounts = {
    articles: ARTICLE_CODE_MAPPINGS.length,
    blenden: BLENDE_CODE_MAPPINGS.length,
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
  const impulsIdentifiersRestored = await restoreImpulsCatalogIdentifiers();
  await restoreImpulsMasterMetadata();
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
    console.log(JSON.stringify({ impulsBackfill, impulsIdentifiersRestored }, null, 2));
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
      "Burger article and blende identifiers match the Typen-NR. values printed in the supplier PDF.",
      "The full flat-hood and washing-machine bundle identifiers are completed from their component rows because the total cells are visually clipped.",
    ].join("\n"),
    importedBy: "price-list-script",
    syncLinkedKitchenItems: true,
    includeLocked: false,
    includeTestKitchens: false,
  });
  const removed = await removeObsoleteBurgerProgramPrices();

  console.log(JSON.stringify({
    programmId: PROGRAMM_ID,
    importId: result.importRecord.id,
    impulsBackfill,
    impulsIdentifiersRestored,
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
