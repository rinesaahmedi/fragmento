import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("admin kitchen item writes require catalog links and preserve valid blende quantities", () => {
  const source = fs.readFileSync(path.join(repoRoot, "lib", "admin-kitchen-items.js"), "utf8");

  assert.match(source, /Active kitchen items cannot use free-text article data/);
  assert.match(source, /Choose a service from the catalog/);
  assert.match(source, /A blende can only be attached to a linked catalog article/);
  assert.match(source, /standaloneCatalogBlende/);
  assert.doesNotMatch(source, /input\.catalogBlendeQuantity = 1/);
  assert.match(source, /const newQuantity = catalogBlende \? \(input\.catalogBlendeQuantity \|\| 1\) : null/);
  assert.match(source, /name:\s*catalogArticle\?\.name/);
  assert.match(source, /nameDe:\s*catalogArticle\?\.nameDe/);
  assert.match(source, /catalogLinkStatus:[^\r\n]+"MATCHED"/);
  assert.match(source, /programPrices:[^\r\n]+programmId: kitchen\.programmId/);
  assert.match(source, /getCatalogProgramPrice\(catalogArticle\)/);
  assert.match(source, /getCatalogProgramPrice\(catalogBlende\)/);
  assert.match(source, /getCatalogProgramPrice\(catalogService\)/);
});
