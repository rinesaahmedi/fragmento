import { ItemType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import {
  buildSyncedKitchenItemPrice,
  centsToMoney,
  moneyToCents,
  shouldSyncKitchenItemPrice,
} from "./catalog-pricing.js";

function getCatalogPriceListImportDelegate(prisma) {
  const delegate = prisma?.catalogPriceListImport;
  return delegate && typeof delegate.findMany === "function" ? delegate : null;
}

const ARTICLE_COLUMNS = {
  articleNumber: ["articleNumber", "Article number", "Article Number"],
  name: ["name", "Name"],
  nameDe: ["nameDe", "German name", "German Name"],
  description: ["description", "Description"],
  widthMm: ["widthMm", "Width mm"],
  heightMm: ["heightMm", "Height mm"],
  depthMm: ["depthMm", "Depth mm"],
  itemType: ["itemType", "Item type", "Item Type"],
  price: ["price", "Price"],
  isFixedPricePackage: ["isFixedPricePackage", "Fixed package", "Fixed Package"],
  isActive: ["isActive", "Active"],
};

const ADDON_COLUMNS = {
  code: ["code", "Code"],
  name: ["name", "Name"],
  nameDe: ["nameDe", "German name", "German Name"],
  description: ["description", "Description"],
  price: ["price", "Price"],
  isActive: ["isActive", "Active"],
};

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getFieldValue(record, aliases) {
  const normalizedByKey = new Map(Object.entries(record).map(([key, value]) => [normalizeHeader(key), value]));
  for (const alias of aliases) {
    if (normalizedByKey.has(normalizeHeader(alias))) {
      return normalizedByKey.get(normalizeHeader(alias));
    }
  }
  return "";
}

function requiredString(value, label, sheetName, rowNumber) {
  const nextValue = String(value || "").trim();
  if (!nextValue) {
    throw new Error(`${sheetName} row ${rowNumber}: ${label} is required.`);
  }
  return nextValue;
}

function optionalString(value) {
  const nextValue = String(value || "").trim();
  return nextValue || null;
}

function parsePrice(value, sheetName, rowNumber) {
  const rawValue = requiredString(value, "price", sheetName, rowNumber).replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawValue)) {
    throw new Error(`${sheetName} row ${rowNumber}: price must be a non-negative number with up to 2 decimals.`);
  }
  return Number(rawValue).toFixed(2);
}

function parseOptionalNonNegativeInteger(value, label, sheetName, rowNumber) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return null;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || String(parsed) !== rawValue.replace(/^0+(?=\d)/, "")) {
    throw new Error(`${sheetName} row ${rowNumber}: ${label} must be a non-negative whole number.`);
  }
  return parsed;
}

function parseBoolean(value, sheetName, rowNumber, defaultValue = true) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  throw new Error(`${sheetName} row ${rowNumber}: boolean value must be true/false or yes/no.`);
}

function parseItemType(value, sheetName, rowNumber) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!Object.values(ItemType).includes(normalized)) {
    throw new Error(`${sheetName} row ${rowNumber}: itemType must be one of ${Object.values(ItemType).join(", ")}.`);
  }
  return normalized;
}

function mapRecord(record, columns) {
  return Object.fromEntries(Object.entries(columns).map(([key, aliases]) => [key, getFieldValue(record, aliases)]));
}

function parseArticleRecord(record, rowNumber) {
  const row = mapRecord(record, ARTICLE_COLUMNS);
  return {
    key: requiredString(row.articleNumber, "articleNumber", "Articles", rowNumber),
    data: {
      articleNumber: requiredString(row.articleNumber, "articleNumber", "Articles", rowNumber),
      name: requiredString(row.name, "name", "Articles", rowNumber),
      nameDe: optionalString(row.nameDe),
      description: optionalString(row.description),
      widthMm: parseOptionalNonNegativeInteger(row.widthMm, "widthMm", "Articles", rowNumber),
      heightMm: parseOptionalNonNegativeInteger(row.heightMm, "heightMm", "Articles", rowNumber),
      depthMm: parseOptionalNonNegativeInteger(row.depthMm, "depthMm", "Articles", rowNumber),
      itemType: parseItemType(row.itemType, "Articles", rowNumber),
      price: parsePrice(row.price, "Articles", rowNumber),
      isFixedPricePackage: parseBoolean(row.isFixedPricePackage, "Articles", rowNumber, false),
      isActive: parseBoolean(row.isActive, "Articles", rowNumber, true),
    },
  };
}

function parseAddonRecord(record, rowNumber, sheetName) {
  const row = mapRecord(record, ADDON_COLUMNS);
  return {
    key: requiredString(row.code, "code", sheetName, rowNumber),
    data: {
      code: requiredString(row.code, "code", sheetName, rowNumber),
      name: requiredString(row.name, "name", sheetName, rowNumber),
      nameDe: optionalString(row.nameDe),
      description: optionalString(row.description),
      price: parsePrice(row.price, sheetName, rowNumber),
      isActive: parseBoolean(row.isActive, sheetName, rowNumber, true),
    },
  };
}

function normalizeSheetName(value) {
  return String(value || "").trim().toLowerCase();
}

function readRowsFromWorkbook(fileData) {
  const workbook = XLSX.read(fileData, { type: "array", raw: false });
  const rowsBySheet = {};
  for (const sheetName of workbook.SheetNames) {
    rowsBySheet[normalizeSheetName(sheetName)] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: false,
      defval: "",
      blankrows: false,
    });
  }
  return rowsBySheet;
}

function findSheetRows(rowsBySheet, wantedName) {
  const normalized = normalizeSheetName(wantedName);
  return rowsBySheet[normalized] || rowsBySheet[`${normalized}s`] || [];
}

function assertUnique(rows, label) {
  const seen = new Set();
  const errors = [];
  for (const row of rows) {
    const key = row.key.toUpperCase();
    if (seen.has(key)) {
      errors.push(`${label}: duplicate key "${row.key}" in uploaded file.`);
    }
    seen.add(key);
  }
  return errors;
}

export function parseCatalogPriceListFile(fileData) {
  const bytes = fileData instanceof Uint8Array ? fileData : new Uint8Array(fileData || []);
  if (!bytes.length) {
    throw new Error("The uploaded price list file is empty.");
  }

  const rowsBySheet = readRowsFromWorkbook(bytes);
  const validationErrors = [];

  const parseRows = (sheetName, parser) => {
    const rows = [];
    findSheetRows(rowsBySheet, sheetName).forEach((record, index) => {
      try {
        rows.push(parser(record, index + 2));
      } catch (error) {
        validationErrors.push(error instanceof Error ? error.message : String(error));
      }
    });
    return rows;
  };

  const articles = parseRows("Articles", parseArticleRecord);
  const blenden = parseRows("Blenden", (record, rowNumber) => parseAddonRecord(record, rowNumber, "Blenden"));
  const services = parseRows("Services", (record, rowNumber) => parseAddonRecord(record, rowNumber, "Services"));

  validationErrors.push(...assertUnique(articles, "Articles"));
  validationErrors.push(...assertUnique(blenden, "Blenden"));
  validationErrors.push(...assertUnique(services, "Services"));

  return {
    articles,
    blenden,
    services,
    validationErrors,
  };
}

function compareDecimal(left, right) {
  return moneyToCents(left) === moneyToCents(right);
}

function startOfLocalDay(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function resolveEffectiveFrom(value) {
  return startOfLocalDay(value || new Date());
}

function isFutureEffectiveDate(effectiveFrom, now = new Date()) {
  return startOfLocalDay(effectiveFrom).getTime() > startOfLocalDay(now).getTime();
}

function sameNullableValue(left, right) {
  return String(left ?? "") === String(right ?? "");
}

function hasArticleChanged(existing, data) {
  return !sameNullableValue(existing.name, data.name)
    || !sameNullableValue(existing.nameDe, data.nameDe)
    || !sameNullableValue(existing.description, data.description)
    || !sameNullableValue(existing.widthMm, data.widthMm)
    || !sameNullableValue(existing.heightMm, data.heightMm)
    || !sameNullableValue(existing.depthMm, data.depthMm)
    || !sameNullableValue(existing.itemType, data.itemType)
    || !compareDecimal(existing.price, data.price)
    || Boolean(existing.isFixedPricePackage) !== Boolean(data.isFixedPricePackage)
    || Boolean(existing.isActive) !== Boolean(data.isActive);
}

function hasAddonChanged(existing, data) {
  return !sameNullableValue(existing.name, data.name)
    || !sameNullableValue(existing.nameDe, data.nameDe)
    || !sameNullableValue(existing.description, data.description)
    || !compareDecimal(existing.price, data.price)
    || Boolean(existing.isActive) !== Boolean(data.isActive);
}

function buildEntityPreview(importRows, existingRows, keyField, comparableFields) {
  const existingByKey = new Map(existingRows.map((row) => [String(row[keyField]).toUpperCase(), row]));
  const rows = importRows.map((row) => {
    const existing = existingByKey.get(String(row.key).toUpperCase()) || null;
    if (!existing) {
      return { key: row.key, action: "create", oldPrice: null, newPrice: row.data.price, data: row.data };
    }

    const existingPrice = existing.programPrices?.[0]?.price ?? existing.price;
    const changed = comparableFields.some((field) => {
      if (field === "price") return !compareDecimal(existingPrice, row.data.price);
      return String(existing[field] ?? "") !== String(row.data[field] ?? "");
    });

    return {
      key: row.key,
      action: changed ? "update" : "unchanged",
      oldPrice: Number(existingPrice || 0).toFixed(2),
      newPrice: row.data.price,
      data: row.data,
    };
  });

  return rows;
}

export async function previewCatalogPriceListImport(prisma, parsed, options = {}) {
  const programmId = String(options.programmId || "").trim();
  const includeProgramPrices = programmId
    ? { include: { programPrices: { where: { programmId } } } }
    : undefined;
  const [articles, blenden, services] = await Promise.all([
    prisma.catalogArticle.findMany(includeProgramPrices),
    prisma.catalogBlende.findMany(includeProgramPrices),
    prisma.catalogService.findMany(includeProgramPrices),
  ]);

  const articleRows = buildEntityPreview(
    parsed.articles,
    articles,
    "articleNumber",
    ["name", "nameDe", "description", "widthMm", "heightMm", "depthMm", "itemType", "price", "isFixedPricePackage", "isActive"],
  );
  const blendeRows = buildEntityPreview(parsed.blenden, blenden, "code", ["name", "nameDe", "description", "price", "isActive"]);
  const serviceRows = buildEntityPreview(parsed.services, services, "code", ["name", "nameDe", "description", "price", "isActive"]);
  const allRows = [...articleRows, ...blendeRows, ...serviceRows];

  return {
    articles: articleRows,
    blenden: blendeRows,
    services: serviceRows,
    summary: {
      created: allRows.filter((row) => row.action === "create").length,
      updated: allRows.filter((row) => row.action === "update").length,
      unchanged: allRows.filter((row) => row.action === "unchanged").length,
      failed: parsed.validationErrors.length,
    },
    validationErrors: parsed.validationErrors,
  };
}

async function syncLinkedKitchenItems(tx, options = {}) {
  const programmId = String(options.programmId || "").trim();
  const items = await tx.kitchenItem.findMany({
    where: programmId ? { kitchen: { programmId } } : undefined,
    include: {
      kitchen: { select: { slug: true, programmId: true } },
      catalogArticle: true,
      catalogBlende: true,
      catalogService: true,
    },
  });
  const [articleProgramPrices, blendeProgramPrices, serviceProgramPrices] = programmId
    ? await Promise.all([
        tx.catalogArticleProgramPrice.findMany({ where: { programmId } }),
        tx.catalogBlendeProgramPrice.findMany({ where: { programmId } }),
        tx.catalogServiceProgramPrice.findMany({ where: { programmId } }),
      ])
    : [[], [], []];
  const articlePriceById = new Map(articleProgramPrices.map((row) => [row.catalogArticleId, row]));
  const blendePriceById = new Map(blendeProgramPrices.map((row) => [row.catalogBlendeId, row]));
  const servicePriceById = new Map(serviceProgramPrices.map((row) => [row.catalogServiceId, row]));

  let synced = 0;
  for (const item of items) {
    if (!shouldSyncKitchenItemPrice(item, options)) continue;
    const nextPrice = buildSyncedKitchenItemPrice({
      ...item,
      catalogArticleProgramPrice: articlePriceById.get(item.catalogArticleId),
      catalogBlendeProgramPrice: blendePriceById.get(item.catalogBlendeId),
      catalogServiceProgramPrice: servicePriceById.get(item.catalogServiceId),
    });
    if (nextPrice == null || centsToMoney(moneyToCents(item.price)) === nextPrice) continue;
    await tx.kitchenItem.update({
      where: { id: item.id },
      data: { price: nextPrice },
    });
    synced += 1;
  }
  return synced;
}

function buildImportSnapshotRows(parsed, importId) {
  return [
    ...parsed.articles.map((row) => ({
      importId,
      itemKind: "Article",
      identifier: row.data.articleNumber,
      articleNumber: row.data.articleNumber,
      name: row.data.name,
      nameDe: row.data.nameDe,
      description: row.data.description,
      widthMm: row.data.widthMm,
      heightMm: row.data.heightMm,
      depthMm: row.data.depthMm,
      itemType: row.data.itemType,
      price: row.data.price,
      isFixedPricePackage: row.data.isFixedPricePackage,
      isActive: row.data.isActive,
    })),
    ...parsed.blenden.map((row) => ({
      importId,
      itemKind: "Blende",
      identifier: row.data.code,
      code: row.data.code,
      name: row.data.name,
      nameDe: row.data.nameDe,
      description: row.data.description,
      price: row.data.price,
      isActive: row.data.isActive,
    })),
    ...parsed.services.map((row) => ({
      importId,
      itemKind: "Service",
      identifier: row.data.code,
      code: row.data.code,
      name: row.data.name,
      nameDe: row.data.nameDe,
      description: row.data.description,
      price: row.data.price,
      isActive: row.data.isActive,
    })),
  ];
}

function parsedFromSnapshotRows(rows) {
  return {
    articles: rows
      .filter((row) => row.itemKind === "Article")
      .map((row) => ({
        key: row.articleNumber || row.identifier,
        data: {
          articleNumber: row.articleNumber || row.identifier,
          name: row.name,
          nameDe: row.nameDe || null,
          description: row.description || null,
          widthMm: row.widthMm ?? null,
          heightMm: row.heightMm ?? null,
          depthMm: row.depthMm ?? null,
          itemType: row.itemType,
          price: Number(row.price || 0).toFixed(2),
          isFixedPricePackage: Boolean(row.isFixedPricePackage),
          isActive: row.isActive !== false,
        },
      })),
    blenden: rows
      .filter((row) => row.itemKind === "Blende")
      .map((row) => ({
        key: row.code || row.identifier,
        data: {
          code: row.code || row.identifier,
          name: row.name,
          nameDe: row.nameDe || null,
          description: row.description || null,
          price: Number(row.price || 0).toFixed(2),
          isActive: row.isActive !== false,
        },
      })),
    services: rows
      .filter((row) => row.itemKind === "Service")
      .map((row) => ({
        key: row.code || row.identifier,
        data: {
          code: row.code || row.identifier,
          name: row.name,
          nameDe: row.nameDe || null,
          description: row.description || null,
          price: Number(row.price || 0).toFixed(2),
          isActive: row.isActive !== false,
        },
      })),
    validationErrors: [],
  };
}

async function listImportSnapshotRows(tx, importId) {
  return tx.$queryRaw`
    SELECT
      "itemKind",
      "identifier",
      "articleNumber",
      "code",
      "name",
      "nameDe",
      "description",
      "widthMm",
      "heightMm",
      "depthMm",
      "itemType",
      "price",
      "isFixedPricePackage",
      "isActive"
    FROM "CatalogPriceListImportRow"
    WHERE "importId" = ${importId}
    ORDER BY "itemKind" ASC, "identifier" ASC
  `;
}

async function createImportSnapshotRows(tx, rows) {
  for (const row of rows) {
    await tx.$executeRaw`
      INSERT INTO "CatalogPriceListImportRow" (
        "id",
        "importId",
        "itemKind",
        "identifier",
        "articleNumber",
        "code",
        "name",
        "nameDe",
        "description",
        "widthMm",
        "heightMm",
        "depthMm",
        "itemType",
        "price",
        "isFixedPricePackage",
        "isActive",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${row.importId},
        ${row.itemKind},
        ${row.identifier},
        ${row.articleNumber || null},
        ${row.code || null},
        ${row.name},
        ${row.nameDe || null},
        ${row.description || null},
        ${row.widthMm ?? null},
        ${row.heightMm ?? null},
        ${row.depthMm ?? null},
        ${row.itemType || null}::"ItemType",
        ${row.price}::decimal,
        ${row.isFixedPricePackage ?? null},
        ${row.isActive ?? true},
        NOW()
      )
    `;
  }
}

function withoutPrice(data) {
  const next = { ...data };
  delete next.price;
  return next;
}

async function upsertArticle(tx, row, importId, programmId) {
  const existing = await tx.catalogArticle.findUnique({ where: { articleNumber: row.data.articleNumber } });
  const record = existing
    ? await tx.catalogArticle.update({ where: { id: existing.id }, data: withoutPrice(row.data) })
    : await tx.catalogArticle.create({ data: row.data });
  const existingProgramPrice = await tx.catalogArticleProgramPrice.findUnique({
    where: { programmId_catalogArticleId: { programmId, catalogArticleId: record.id } },
  });
  const identityChanged = existing ? hasArticleChanged({ ...existing, price: row.data.price }, row.data) : true;
  const priceChanged = !existingProgramPrice || !compareDecimal(existingProgramPrice.price, row.data.price);

  if (existing && !identityChanged && !priceChanged) {
    return "unchanged";
  }

  await tx.catalogArticleProgramPrice.upsert({
    where: { programmId_catalogArticleId: { programmId, catalogArticleId: record.id } },
    create: {
      programmId,
      catalogArticleId: record.id,
      articleNumber: record.articleNumber,
      price: row.data.price,
      isActive: row.data.isActive,
    },
    update: {
      articleNumber: record.articleNumber,
      price: row.data.price,
      isActive: row.data.isActive,
    },
  });

  if (priceChanged) {
    await tx.catalogArticlePriceHistory.create({
      data: {
        importId,
        catalogArticleId: record.id,
        articleNumber: record.articleNumber,
        oldPrice: existingProgramPrice ? existingProgramPrice.price : null,
        newPrice: row.data.price,
      },
    });
  }
  return existing ? "updated" : "created";
}

async function upsertBlende(tx, row, importId, programmId) {
  const existing = await tx.catalogBlende.findUnique({ where: { code: row.data.code } });
  const record = existing
    ? await tx.catalogBlende.update({ where: { id: existing.id }, data: withoutPrice(row.data) })
    : await tx.catalogBlende.create({ data: row.data });
  const existingProgramPrice = await tx.catalogBlendeProgramPrice.findUnique({
    where: { programmId_catalogBlendeId: { programmId, catalogBlendeId: record.id } },
  });
  const identityChanged = existing ? hasAddonChanged({ ...existing, price: row.data.price }, row.data) : true;
  const priceChanged = !existingProgramPrice || !compareDecimal(existingProgramPrice.price, row.data.price);

  if (existing && !identityChanged && !priceChanged) {
    return "unchanged";
  }

  await tx.catalogBlendeProgramPrice.upsert({
    where: { programmId_catalogBlendeId: { programmId, catalogBlendeId: record.id } },
    create: {
      programmId,
      catalogBlendeId: record.id,
      code: record.code,
      price: row.data.price,
      isActive: row.data.isActive,
    },
    update: {
      code: record.code,
      price: row.data.price,
      isActive: row.data.isActive,
    },
  });

  if (priceChanged) {
    await tx.catalogBlendePriceHistory.create({
      data: {
        importId,
        catalogBlendeId: record.id,
        code: record.code,
        oldPrice: existingProgramPrice ? existingProgramPrice.price : null,
        newPrice: row.data.price,
      },
    });
  }
  return existing ? "updated" : "created";
}

async function upsertService(tx, row, importId, programmId) {
  const existing = await tx.catalogService.findUnique({ where: { code: row.data.code } });
  const record = existing
    ? await tx.catalogService.update({ where: { id: existing.id }, data: withoutPrice(row.data) })
    : await tx.catalogService.create({ data: row.data });
  const existingProgramPrice = await tx.catalogServiceProgramPrice.findUnique({
    where: { programmId_catalogServiceId: { programmId, catalogServiceId: record.id } },
  });
  const identityChanged = existing ? hasAddonChanged({ ...existing, price: row.data.price }, row.data) : true;
  const priceChanged = !existingProgramPrice || !compareDecimal(existingProgramPrice.price, row.data.price);

  if (existing && !identityChanged && !priceChanged) {
    return "unchanged";
  }

  await tx.catalogServiceProgramPrice.upsert({
    where: { programmId_catalogServiceId: { programmId, catalogServiceId: record.id } },
    create: {
      programmId,
      catalogServiceId: record.id,
      code: record.code,
      price: row.data.price,
      isActive: row.data.isActive,
    },
    update: {
      code: record.code,
      price: row.data.price,
      isActive: row.data.isActive,
    },
  });

  if (priceChanged) {
    await tx.catalogServicePriceHistory.create({
      data: {
        importId,
        catalogServiceId: record.id,
        code: record.code,
        oldPrice: existingProgramPrice ? existingProgramPrice.price : null,
        newPrice: row.data.price,
      },
    });
  }
  return existing ? "updated" : "created";
}

async function applyParsedImportToRecord(tx, record, parsed, options = {}) {
  const programmId = String(options.programmId || record.programmId || "").trim();
  const summary = {
    created: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    syncedKitchenItems: 0,
  };

  for (const row of parsed.articles) {
    const action = await upsertArticle(tx, row, record.id, programmId);
    summary[action] += 1;
  }
  for (const row of parsed.blenden) {
    const action = await upsertBlende(tx, row, record.id, programmId);
    summary[action] += 1;
  }
  for (const row of parsed.services) {
    const action = await upsertService(tx, row, record.id, programmId);
    summary[action] += 1;
  }

  if (options.syncLinkedKitchenItems) {
    summary.syncedKitchenItems = await syncLinkedKitchenItems(tx, {
      programmId,
      includeLocked: Boolean(options.includeLocked),
      includeTestKitchens: Boolean(options.includeTestKitchens),
    });
  }

  const importRecord = await tx.catalogPriceListImport.update({
    where: { id: record.id },
    data: {
      status: "APPLIED",
      createdCount: summary.created,
      updatedCount: summary.updated,
      unchangedCount: summary.unchanged,
      failedCount: summary.failed,
      syncedKitchenItemCount: summary.syncedKitchenItems,
      appliedAt: new Date(),
      syncAppliedAt: options.syncLinkedKitchenItems ? new Date() : null,
    },
  });

  return { importRecord, summary };
}

export async function applyCatalogPriceListImport(prisma, parsed, options = {}) {
  if (parsed.validationErrors.length) {
    throw new Error(parsed.validationErrors.slice(0, 5).join(" "));
  }
  const programmId = String(options.programmId || "").trim();
  if (!programmId) {
    throw new Error("Programm ID is required for price-list imports.");
  }

  const effectiveFrom = resolveEffectiveFrom(options.effectiveFrom);
  const preview = await previewCatalogPriceListImport(prisma, parsed, { programmId });
  const shouldSchedule = isFutureEffectiveDate(effectiveFrom) && !options.forceImmediate;

  const result = await prisma.$transaction(async (tx) => {
    const record = options.existingImportId
      ? await tx.catalogPriceListImport.update({
          where: { id: options.existingImportId },
          data: { status: "APPLYING" },
        })
      : await tx.catalogPriceListImport.create({
          data: {
            label: options.label || null,
            sourceName: options.sourceName || null,
            programmId,
            status: shouldSchedule ? "SCHEDULED" : "APPLYING",
            notes: options.notes || null,
            importedBy: options.importedBy || null,
            createdCount: preview.summary.created,
            updatedCount: preview.summary.updated,
            unchangedCount: preview.summary.unchanged,
            failedCount: 0,
            effectiveFrom,
            syncLinkedKitchenItemsRequested: Boolean(options.syncLinkedKitchenItems),
            appliedAt: shouldSchedule ? null : new Date(),
          },
        });

    if (!options.existingImportId) {
      const snapshotRows = buildImportSnapshotRows(parsed, record.id);
      if (snapshotRows.length) {
        await createImportSnapshotRows(tx, snapshotRows);
      }
    }

    if (shouldSchedule) {
      return {
        importRecord: record,
        summary: {
          created: preview.summary.created,
          updated: preview.summary.updated,
          unchanged: preview.summary.unchanged,
          failed: 0,
          syncedKitchenItems: 0,
          scheduled: true,
        },
      };
    }

    return applyParsedImportToRecord(tx, record, parsed, {
      ...options,
      programmId,
    });
  });

  return result;
}

export async function applyDueScheduledCatalogPriceListImports(prisma, now = new Date()) {
  const catalogPriceListImport = getCatalogPriceListImportDelegate(prisma);
  if (!catalogPriceListImport) {
    return [];
  }

  const dueImports = await catalogPriceListImport.findMany({
    where: {
      status: "SCHEDULED",
      effectiveFrom: { lte: now },
    },
    orderBy: [{ effectiveFrom: "asc" }, { createdAt: "asc" }],
    take: 10,
  });

  const results = [];
  for (const entry of dueImports) {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await listImportSnapshotRows(tx, entry.id);
      if (!rows.length) {
        return tx.catalogPriceListImport.update({
          where: { id: entry.id },
          data: { status: "FAILED", notes: [entry.notes, "Scheduled import could not be applied because its saved price-list rows are missing."].filter(Boolean).join("\n") },
        });
      }

      return applyParsedImportToRecord(
        tx,
        await tx.catalogPriceListImport.update({
          where: { id: entry.id },
          data: { status: "APPLYING" },
        }),
        parsedFromSnapshotRows(rows),
        {
          programmId: entry.programmId,
          syncLinkedKitchenItems: entry.syncLinkedKitchenItemsRequested,
        },
      );
    });
    results.push(result);
  }

  return results;
}
