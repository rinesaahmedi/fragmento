const { loadEnvConfig } = require("@next/env");
const { PrismaClient, ItemType } = require("@prisma/client");

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const CATALOG_ARTICLES = [
  { articleNumber: "517467", name: "Waste separation system Blanco Botton", nameDe: "Mülltrennsystem Blanco Botton", price: "89.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "A-EGSPV597210 + TGV60", name: "Fully integrated dishwasher incl. furniture front", nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront", price: "579.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true },
  { articleNumber: "EWA34660W + TGV60 + WU16", name: "Washing machine + front + side panel", nameDe: "Waschmaschine + Front + Wange", price: "639.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true },
  { articleNumber: "FH 664 621 S", name: "FH 664 621 S extractor hood", nameDe: "FH 664 621 S Flachschirmhaube", price: "349.00", itemType: ItemType.COMPONENT },
  { articleNumber: "FH664621E + FWK124 + HD6002", name: "Flat screen extractor hood + cabinet + filter", nameDe: "Flachschirmhaube + Schrank + Filter", price: "349.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true },
  { articleNumber: "H3002", name: "Upper cabinet 30", nameDe: "Oberschrank 30", price: "115.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H4002", name: "Upper cabinet 40", nameDe: "Oberschrank 40", price: "130.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H4502", name: "Upper cabinet 45", nameDe: "Oberschrank 45", price: "139.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H5002", name: "Upper cabinet 50", nameDe: "Oberschrank 50", price: "135.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H6002", name: "Upper cabinet 60", nameDe: "Oberschrank 60", price: "149.00", itemType: ItemType.COMPONENT },
  { articleNumber: "KA220043_S3", name: "LED lighting set", nameDe: "LED-Beleuchtungsset", price: "69.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "KHF664611S", name: "Angled extractor hood", nameDe: "Schrägesse", price: "209.00", itemType: ItemType.COMPONENT },
  { articleNumber: "KHF664611S + FWP18", name: "Angled extractor hood + filter", nameDe: "Schrägesse + Filter", price: "209.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true },
  { articleNumber: "OL-KGCN388140E", name: "Freestanding refrigerator 178cm", nameDe: "Standkühlschrank 178 cm", price: "579.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US2A60", name: "Base cabinet with drawers 60", nameDe: "Unterschrank mit Auszügen 60", price: "369.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US30", name: "Lower cabinet with drawer 30", nameDe: "Unterschrank mit Schublade 30", price: "175.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US40", name: "Lower cabinet with drawer 40", nameDe: "Unterschrank mit Schublade 40", price: "183.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US45", name: "Lower cabinet with drawer 45", nameDe: "Unterschrank mit Schublade 45", price: "198.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US50", name: "Lower cabinet with drawer 50", nameDe: "Unterschrank mit Schublade 50", price: "198.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US60", name: "Lower cabinet with drawer 60", nameDe: "Unterschrank mit Schublade 60", price: "219.00", itemType: ItemType.COMPONENT },
  { articleNumber: "ZB60SG", name: "Cutlery insert 60 cm", nameDe: "Besteckeinsatz 60 cm", price: "25.00", itemType: ItemType.ACCESSORY },
];

const CATALOG_BLENDES = [
  { code: "HPK2002", name: "HPK2002 blende", nameDe: "HPK2002 Blende", price: "35.00" },
  { code: "UPK20", name: "UPK20 blende", nameDe: "UPK20 Blende", price: "25.00" },
];

const CATALOG_SERVICES = [
  { code: "MONTAGE", name: "Lieferung, Vertragen, Montage und Anschluss", nameDe: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00" },
  { code: "PICKUP", name: "Abholung an Logistikstandort", nameDe: "Abholung an Logistikstandort", price: "0.00" },
];

function sameDecimal(left, right) {
  return Number(left || 0).toFixed(2) === Number(right || 0).toFixed(2);
}

function differs(existing, data, fields) {
  return fields.some((field) => {
    if (field === "price") return !sameDecimal(existing[field], data[field]);
    return (existing[field] ?? null) !== (data[field] ?? null);
  });
}

function normalizeData(row, fields) {
  const data = {
    ...row,
    description: row.description ?? null,
    isActive: row.isActive ?? true,
  };

  if (fields.includes("isFixedPricePackage")) {
    data.isFixedPricePackage = row.isFixedPricePackage ?? false;
  }

  return data;
}

async function upsertRows({ model, uniqueField, rows, fields }) {
  const result = { created: 0, updated: 0, skipped: 0 };

  for (const row of rows) {
    const where = { [uniqueField]: row[uniqueField] };
    const existing = await model.findUnique({ where });
    const data = normalizeData(row, fields);

    if (!existing) {
      await model.create({ data });
      result.created += 1;
      continue;
    }

    if (differs(existing, data, fields)) {
      await model.update({ where, data });
      result.updated += 1;
      continue;
    }

    result.skipped += 1;
  }

  return result;
}

async function main() {
  const articleResult = await upsertRows({
    model: prisma.catalogArticle,
    uniqueField: "articleNumber",
    rows: CATALOG_ARTICLES,
    fields: ["name", "nameDe", "description", "price", "itemType", "isFixedPricePackage", "isActive"],
  });

  const blendeResult = await upsertRows({
    model: prisma.catalogBlende,
    uniqueField: "code",
    rows: CATALOG_BLENDES,
    fields: ["name", "nameDe", "description", "price", "isActive"],
  });

  const serviceResult = await upsertRows({
    model: prisma.catalogService,
    uniqueField: "code",
    rows: CATALOG_SERVICES,
    fields: ["name", "nameDe", "description", "price", "isActive"],
  });

  const counts = {
    CatalogArticle: await prisma.catalogArticle.count(),
    CatalogBlende: await prisma.catalogBlende.count(),
    CatalogService: await prisma.catalogService.count(),
  };

  console.log(JSON.stringify({
    results: {
      CatalogArticle: articleResult,
      CatalogBlende: blendeResult,
      CatalogService: serviceResult,
    },
    counts,
    articleNumbers: CATALOG_ARTICLES.map((article) => article.articleNumber),
    blendeCodes: CATALOG_BLENDES.map((blende) => blende.code),
    serviceCodes: CATALOG_SERVICES.map((service) => service.code),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
