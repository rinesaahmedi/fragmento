import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("admin catalog separates records and prices by selected program", () => {
  const page = read("app/admin/catalog/articles/page.js");
  const exportRoute = read("app/api/admin/catalog/export/route.js");
  const articleRoute = read("app/api/admin/catalog/articles/[id]/route.js");

  assert.match(page, /selectedProgramId/);
  assert.match(page, /CatalogArticleProgramPrice/);
  assert.match(page, /CatalogBlendeProgramPrice/);
  assert.match(page, /CatalogServiceProgramPrice/);
  assert.match(page, /name="programmId"/);
  assert.match(page, /programCatalogTabsStyle/);
  assert.match(exportRoute, /searchParams\.get\("programmId"\)/);
  assert.match(exportRoute, /capp\."programmId" = \$\{programmId\}/);
  assert.match(articleRoute, /catalogArticleProgramPrice\.upsert/);
  assert.match(articleRoute, /syncCatalogProgramKitchenItemPrices/);
});

test("Burger import reuses the complete Impuls catalog and changes only program prices", () => {
  const importer = read("scripts/import-burger-cindy-price-list.js");

  assert.match(importer, /backfillImpulsProgramPrices/);
  assert.match(importer, /createdAt: \{ lt: cutoff \}/);
  assert.match(importer, /DEFAULT_PROGRAMM_ID = "IP 2200"/);
  assert.match(importer, /buildParsedFromImpulsCatalog/);
  assert.match(importer, /include: \{ catalogArticle: true \}/);
  assert.match(importer, /name: record\.name, nameDe: record\.nameDe/);
  assert.match(importer, /removeBurgerOnlyCatalogRecords/);
  assert.match(importer, /programPrices: \{ none: \{\} \}/);
  assert.match(importer, /Burger prices are mapped onto the exact Impuls master article/);
});
