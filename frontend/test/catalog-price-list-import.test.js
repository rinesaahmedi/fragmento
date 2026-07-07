import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import {
  buildSyncedKitchenItemPrice,
  shouldSyncKitchenItemPrice,
} from "../lib/catalog-pricing.js";
import {
  parseCatalogPriceListFile,
  previewCatalogPriceListImport,
} from "../lib/catalog-price-list-import.js";

function buildWorkbookBuffer() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Article number", "Name", "German name", "Description", "Width mm", "Height mm", "Depth mm", "Item type", "Price", "Fixed package", "Active"],
    ["US60", "Base cabinet 60", "Unterschrank 60", "", "600", "720", "600", "COMPONENT", "229.00", "No", "Yes"],
    ["NEW-1", "New accessory", "", "", "", "", "", "ACCESSORY", "19.99", "No", "Yes"],
  ]), "Articles");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Code", "Name", "German name", "Description", "Price", "Active"],
    ["UPK20", "UPK20 blende", "UPK20 Blende", "", "29.00", "Yes"],
  ]), "Blenden");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Code", "Name", "German name", "Description", "Price", "Active"],
    ["MONTAGE", "Assembly", "Montage", "", "349.00", "Yes"],
  ]), "Services");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

test("buildSyncedKitchenItemPrice includes catalog blende quantity", () => {
  const price = buildSyncedKitchenItemPrice({
    catalogArticle: { price: "229.00" },
    catalogBlende: { price: "29.00" },
    catalogBlendeId: "blende-1",
    catalogBlendeQuantity: 2,
  });

  assert.equal(price, "287.00");
});

test("shouldSyncKitchenItemPrice skips manual, default included, and test rows by default", () => {
  const base = {
    catalogLinkStatus: "MATCHED",
    catalogPriceSyncMode: "AUTO",
    isLocked: false,
    code: "CAB-BASE-600",
    iconKey: "",
    componentKey: "base-module-1",
    kitchen: { slug: "ab-105806" },
    catalogArticle: { price: "219.00" },
  };

  assert.equal(shouldSyncKitchenItemPrice(base), true);
  assert.equal(shouldSyncKitchenItemPrice({ ...base, catalogPriceSyncMode: "MANUAL" }), false);
  assert.equal(shouldSyncKitchenItemPrice({ ...base, isLocked: true, code: "SINK-WORKTOP", componentKey: "worktop" }), false);
  assert.equal(shouldSyncKitchenItemPrice({ ...base, kitchen: { slug: "test-3d-kitchen" } }), false);
});

test("parseCatalogPriceListFile reads editable catalog workbook sheets", () => {
  const parsed = parseCatalogPriceListFile(buildWorkbookBuffer());

  assert.deepEqual(parsed.validationErrors, []);
  assert.equal(parsed.articles.length, 2);
  assert.equal(parsed.articles[0].data.articleNumber, "US60");
  assert.equal(parsed.articles[0].data.price, "229.00");
  assert.equal(parsed.blenden[0].data.code, "UPK20");
  assert.equal(parsed.services[0].data.code, "MONTAGE");
});

test("previewCatalogPriceListImport summarizes create update and unchanged rows", async () => {
  const parsed = parseCatalogPriceListFile(buildWorkbookBuffer());
  const prisma = {
    catalogArticle: {
      findMany: async () => [
        { articleNumber: "US60", name: "Base cabinet 60", nameDe: "Unterschrank 60", description: null, widthMm: 600, heightMm: 720, depthMm: 600, itemType: "COMPONENT", price: "219.00", isFixedPricePackage: false, isActive: true },
      ],
    },
    catalogBlende: {
      findMany: async () => [
        { code: "UPK20", name: "UPK20 blende", nameDe: "UPK20 Blende", description: null, price: "29.00", isActive: true },
      ],
    },
    catalogService: {
      findMany: async () => [
        { code: "MONTAGE", name: "Assembly", nameDe: "Montage", description: null, price: "349.00", isActive: true },
      ],
    },
  };

  const preview = await previewCatalogPriceListImport(prisma, parsed);

  assert.equal(preview.summary.created, 1);
  assert.equal(preview.summary.updated, 1);
  assert.equal(preview.summary.unchanged, 2);
  assert.equal(preview.summary.failed, 0);
});
