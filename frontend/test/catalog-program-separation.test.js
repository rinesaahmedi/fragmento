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

test("Burger import uses the supplier article and blende codes printed in the PDF", () => {
  const importer = read("scripts/import-burger-cindy-price-list.js");

  assert.match(importer, /backfillImpulsProgramPrices/);
  assert.match(importer, /createdAt: \{ lt: cutoff \}/);
  assert.match(importer, /DEFAULT_PROGRAMM_ID = "IP 2200"/);
  assert.match(importer, /buildParsedFromImpulsCatalog/);
  assert.match(importer, /source: "H3002", target: "H3072", price: 124/);
  assert.match(importer, /source: "H6002", target: "H6072", price: 146/);
  assert.match(importer, /target: "A-EGSPV594 \+ TGV60"/);
  assert.match(importer, /target: "FH664621E\+FWK124\+HFLH6072"/);
  assert.match(importer, /target: "EWA34660W\+TV60\+WU1672"/);
  assert.match(importer, /source: "ZB60SG", target: "ZBE60", price: 20/);
  assert.match(importer, /source: "UPK20", target: "UP20K", price: 33/);
  assert.match(importer, /source: "HPEF4302", target: "HPE7072", price: 79/);
  assert.match(importer, /removeObsoleteBurgerProgramPrices/);
  assert.match(importer, /Burger article and blende identifiers match the Typen-NR\./);
});
