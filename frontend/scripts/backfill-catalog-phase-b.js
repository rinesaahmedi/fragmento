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
  { articleNumber: "H3002", name: "Upper cabinet 30", nameDe: "Oberschrank 30", widthMm: 300, heightMm: 720, depthMm: 340, price: "115.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H4002", name: "Upper cabinet 40", nameDe: "Oberschrank 40", widthMm: 400, heightMm: 720, depthMm: 340, price: "130.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H4502", name: "Upper cabinet 45", nameDe: "Oberschrank 45", widthMm: 450, heightMm: 720, depthMm: 340, price: "139.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H5002", name: "Upper cabinet 50", nameDe: "Oberschrank 50", widthMm: 500, heightMm: 720, depthMm: 340, price: "135.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H6002", name: "Upper cabinet 60", nameDe: "Oberschrank 60", widthMm: 600, heightMm: 720, depthMm: 340, price: "149.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H8002", name: "Upper cabinet 80", nameDe: "Oberschrank 80", widthMm: 800, heightMm: 720, depthMm: 340, price: "200.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H9002", name: "Upper cabinet 90", nameDe: "Oberschrank 90", widthMm: 900, heightMm: 720, depthMm: 340, price: "203.00", itemType: ItemType.COMPONENT },
  { articleNumber: "H10002", name: "Upper cabinet 100", nameDe: "Oberschrank 100", widthMm: 1000, heightMm: 720, depthMm: 340, price: "209.00", itemType: ItemType.COMPONENT },
  { articleNumber: "KA220043_S3", name: "LED lighting set", nameDe: "LED-Beleuchtungsset", price: "69.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "KHF664611S", name: "Angled extractor hood", nameDe: "Schrägesse", price: "209.00", itemType: ItemType.COMPONENT },
  { articleNumber: "KHF664611S + FWP18", name: "Angled extractor hood + filter", nameDe: "Schrägesse + Filter", price: "209.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true },
  { articleNumber: "OL-KGCN388140E", name: "Freestanding refrigerator 178cm", nameDe: "Standkühlschrank 178 cm", price: "579.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US2A60", name: "Base cabinet with drawers 60", nameDe: "Unterschrank mit Auszügen 60", widthMm: 600, heightMm: 720, depthMm: 600, price: "369.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US30", name: "Lower cabinet with drawer 30", nameDe: "Unterschrank mit Schublade 30", widthMm: 300, heightMm: 720, depthMm: 600, price: "175.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US40", name: "Lower cabinet with drawer 40", nameDe: "Unterschrank mit Schublade 40", widthMm: 400, heightMm: 720, depthMm: 600, price: "183.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US45", name: "Lower cabinet with drawer 45", nameDe: "Unterschrank mit Schublade 45", widthMm: 450, heightMm: 720, depthMm: 600, price: "198.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US50", name: "Lower cabinet with drawer 50", nameDe: "Unterschrank mit Schublade 50", widthMm: 500, heightMm: 720, depthMm: 600, price: "198.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US60", name: "Lower cabinet with drawer 60", nameDe: "Unterschrank mit Schublade 60", widthMm: 600, heightMm: 720, depthMm: 600, price: "219.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US80", name: "Lower cabinet with drawer 80", nameDe: "Unterschrank mit Schublade 80", widthMm: 800, heightMm: 720, depthMm: 600, price: "333.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US90", name: "Lower cabinet with drawer 90", nameDe: "Unterschrank mit Schublade 90", widthMm: 900, heightMm: 720, depthMm: 600, price: "339.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US100", name: "Lower cabinet with drawer 100", nameDe: "Unterschrank mit Schublade 100", widthMm: 1000, heightMm: 720, depthMm: 600, price: "353.00", itemType: ItemType.COMPONENT },
  { articleNumber: "US120", name: "Lower cabinet with drawer 120", nameDe: "Unterschrank mit Schublade 120", widthMm: 1200, heightMm: 720, depthMm: 600, price: "403.00", itemType: ItemType.COMPONENT },
  { articleNumber: "ZB30SG", name: "Cutlery insert 30 cm", nameDe: "Besteckeinsatz 30 cm", price: "19.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "ZB40SG", name: "Cutlery insert 40 cm", nameDe: "Besteckeinsatz 40 cm", price: "19.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "ZB45SG", name: "Cutlery insert 45 cm", nameDe: "Besteckeinsatz 45 cm", price: "22.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "ZB50SG", name: "Cutlery insert 50 cm", nameDe: "Besteckeinsatz 50 cm", price: "22.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "ZB60SG", name: "Cutlery insert 60 cm", nameDe: "Besteckeinsatz 60 cm", price: "25.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "ZB80SG", name: "Cutlery insert 80 cm", nameDe: "Besteckeinsatz 80 cm", price: "31.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "ZB90SG", name: "Cutlery insert 90 cm", nameDe: "Besteckeinsatz 90 cm", price: "31.00", itemType: ItemType.ACCESSORY },
  { articleNumber: "ZB100SG", name: "Cutlery insert 100 cm", nameDe: "Besteckeinsatz 100 cm", price: "36.00", itemType: ItemType.ACCESSORY },
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
    fields: ["name", "nameDe", "description", "widthMm", "heightMm", "depthMm", "price", "itemType", "isFixedPricePackage", "isActive"],
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
