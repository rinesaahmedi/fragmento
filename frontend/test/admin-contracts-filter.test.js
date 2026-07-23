import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");
}

test("admin contracts page filters ARC and FRG contract types end to end", () => {
  const filtersSource = read("components/admin-contracts-filters.js");
  const pageSource = read("app/admin/contracts/page.js");
  const catalogSource = read("lib/catalog.js");

  assert.match(filtersSource, /name="contractType"/);
  assert.match(filtersSource, /value="ARC"/);
  assert.match(filtersSource, /value="FRG"/);
  assert.match(pageSource, /contractType:\s*normalizeContractTypeFilter\(resolvedSearchParams\.contractType\)/);
  assert.match(pageSource, /normalized === "ARC" \|\| normalized === "FRG"/);
  assert.match(catalogSource, /filters\.contractType === "ARC" \|\| filters\.contractType === "FRG"/);
  assert.match(catalogSource, /kc\."contractType" = \$\{filters\.contractType\}/);
});

test("admin contract type filter is translated in English and German", () => {
  const english = JSON.parse(read("locales/admin.en.json"));
  const german = JSON.parse(read("locales/admin.de.json"));

  assert.equal(english.contractsAdmin.contractType, "Contract type");
  assert.equal(english.contractsAdmin.allContractTypes, "All contract types");
  assert.equal(german.contractsAdmin.contractType, "Vertragstyp");
  assert.equal(german.contractsAdmin.allContractTypes, "Alle Vertragstypen");
});
