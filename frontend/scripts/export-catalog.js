const fs = require("fs");
const path = require("path");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseArgs(argv) {
  const options = {
    includeInactive: false,
    includeIds: false,
    out: "",
    stdout: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--include-inactive" || arg === "--all") {
      options.includeInactive = true;
      continue;
    }

    if (arg === "--include-ids") {
      options.includeIds = true;
      continue;
    }

    if (arg === "--stdout") {
      options.stdout = true;
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

function defaultOutputPath() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return path.join(process.cwd(), "exports", `catalog-seed-data-${stamp}.json`);
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function cleanNullableString(value) {
  const text = repairMojibake(String(value ?? "").trim());
  return text || null;
}

function repairMojibake(value) {
  if (!/[ÃÂâ]/.test(value)) return value;
  return Buffer.from(value, "latin1").toString("utf8");
}

function removeNullishFields(row) {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== null && value !== undefined),
  );
}

function formatDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function mapArticle(article, options) {
  return removeNullishFields({
    id: options.includeIds ? article.id : null,
    articleNumber: article.articleNumber,
    name: repairMojibake(article.name),
    nameDe: cleanNullableString(article.nameDe),
    description: cleanNullableString(article.description),
    widthMm: article.widthMm,
    heightMm: article.heightMm,
    depthMm: article.depthMm,
    price: formatMoney(article.price),
    itemType: article.itemType,
    isFixedPricePackage: Boolean(article.isFixedPricePackage),
    isActive: Boolean(article.isActive),
    linkedKitchenItems: article._count?.kitchenItems ?? 0,
    createdAt: options.includeIds ? formatDate(article.createdAt) : null,
    updatedAt: options.includeIds ? formatDate(article.updatedAt) : null,
  });
}

function mapBlende(blende, options) {
  return removeNullishFields({
    id: options.includeIds ? blende.id : null,
    code: blende.code,
    name: repairMojibake(blende.name),
    nameDe: cleanNullableString(blende.nameDe),
    description: cleanNullableString(blende.description),
    price: formatMoney(blende.price),
    isActive: Boolean(blende.isActive),
    linkedKitchenItems: blende._count?.kitchenItems ?? 0,
    createdAt: options.includeIds ? formatDate(blende.createdAt) : null,
    updatedAt: options.includeIds ? formatDate(blende.updatedAt) : null,
  });
}

function mapService(service, options) {
  return removeNullishFields({
    id: options.includeIds ? service.id : null,
    code: service.code,
    name: repairMojibake(service.name),
    nameDe: cleanNullableString(service.nameDe),
    description: cleanNullableString(service.description),
    price: formatMoney(service.price),
    isActive: Boolean(service.isActive),
    linkedKitchenItems: service._count?.kitchenItems ?? 0,
    createdAt: options.includeIds ? formatDate(service.createdAt) : null,
    updatedAt: options.includeIds ? formatDate(service.updatedAt) : null,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outPath = path.resolve(process.cwd(), options.out || defaultOutputPath());
  const activeWhere = options.includeInactive ? {} : { isActive: true };

  const [articles, blenden, services] = await Promise.all([
    prisma.catalogArticle.findMany({
      where: activeWhere,
      include: {
        _count: { select: { kitchenItems: true } },
      },
      orderBy: [
        { itemType: "asc" },
        { articleNumber: "asc" },
      ],
    }),
    prisma.catalogBlende.findMany({
      where: activeWhere,
      include: {
        _count: { select: { kitchenItems: true } },
      },
      orderBy: [{ code: "asc" }],
    }),
    prisma.catalogService.findMany({
      where: activeWhere,
      include: {
        _count: { select: { kitchenItems: true } },
      },
      orderBy: [{ code: "asc" }],
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    purpose: "Catalog data for CatalogArticle, CatalogBlende, and CatalogService.",
    filters: {
      includeInactive: options.includeInactive,
      includeIds: options.includeIds,
    },
    usage: {
      articlesUniqueField: "articleNumber",
      blendenUniqueField: "code",
      servicesUniqueField: "code",
      note: options.includeIds
        ? "Database ids and timestamps are included because --include-ids was used."
        : "These arrays can be used in prisma/seed.js or scripts/backfill-catalog-phase-b.js for upserts. Database ids and timestamps are excluded by default.",
    },
    catalogArticles: articles.map((article) => mapArticle(article, options)),
    catalogBlenden: blenden.map((blende) => mapBlende(blende, options)),
    catalogServices: services.map((service) => mapService(service, options)),
  };

  const json = `${JSON.stringify(exportData, null, 2)}\n`;

  if (options.stdout) {
    process.stdout.write(json);
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json, "utf8");

    console.log(
      `Exported ${exportData.catalogArticles.length} articles, ${exportData.catalogBlenden.length} blenden, and ${exportData.catalogServices.length} services.`,
    );
    console.log(outPath);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
