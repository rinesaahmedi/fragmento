import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));

function readProjectFile(...parts) {
  return fs.readFileSync(path.join(testDir, "..", ...parts), "utf8");
}

test("contract access tracking stores the complete normalized contract number", () => {
  const trackingSource = readProjectFile("lib", "public-visit-tracking.js");
  const schemaSource = readProjectFile("prisma", "schema.prisma");

  assert.match(schemaSource, /contractNumber\s+String\?\s+@db\.VarChar\(200\)/);
  assert.match(trackingSource, /const storedContractNumber = cleanText\(normalizedContractNumber, 200\)/);
  assert.match(trackingSource, /contractNumber: storedContractNumber/);
});

test("contract access admin shows a stored complete number before the legacy last-four fallback", () => {
  const pageSource = readProjectFile("app", "admin", "contract-access", "page.js");

  assert.match(
    pageSource,
    /event\.contractNumber \|\| \(event\.contractNumberLast4 \? `[^`]*\$\{event\.contractNumberLast4\}` : "-"\)/,
  );
});
