import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isCutleryAccessoryCode,
  parseCutleryLineFromOrderItem,
  MAX_CUTLERY_QUANTITY,
  normalizeCutleryQuantity,
} from "../lib/cutlery-accessories.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ordersPath = path.join(__dirname, "..", "lib", "orders.js");
const ordersSource = fs.readFileSync(ordersPath, "utf8");

function loadBuildOrderItemSelectionKey() {
  const source = ordersSource;
  const match = source.match(/export function buildOrderItemSelectionKey\(item\) \{[\s\S]*?\n\}/);
  assert.ok(match, "buildOrderItemSelectionKey should be exported from orders.js");

  const moduleFactory = new Function(
    "isCutleryAccessoryCode",
    "parseCutleryLineFromOrderItem",
    `${match[0].replace("export function", "function")}
return buildOrderItemSelectionKey;`,
  );

  return moduleFactory(isCutleryAccessoryCode, parseCutleryLineFromOrderItem);
}

const buildOrderItemSelectionKey = loadBuildOrderItemSelectionKey();

const submissionSource = ordersSource.match(/function normalizeSubmissionItems\(items = \[\]\) \{[\s\S]*?\n\}/);
assert.ok(submissionSource, "order submission normalization should be available");
const normalizeSubmissionItems = new Function(
  "isCutleryAccessoryCode",
  "MAX_CUTLERY_QUANTITY",
  "normalizeCutleryQuantity",
  `${submissionSource[0]}\nreturn normalizeSubmissionItems;`,
)(isCutleryAccessoryCode, MAX_CUTLERY_QUANTITY, normalizeCutleryQuantity);

test("order submission preserves and merges cutlery quantities above 99", () => {
  const items = normalizeSubmissionItems([
    { code: "ACC-CUTLERY", articleNumber: "ZB50SG", quantity: 150 },
    { code: "ACC-CUTLERY", articleNumber: "ZB50SG", quantity: 25 },
    { code: "ACC-CUTLERY", articleNumber: "ZB60SG", quantity: 200 },
    { code: "ACC-LIGHTING", quantity: 150 },
  ]);
  assert.equal(items[0].quantity, 175);
  assert.equal(items[1].quantity, 200);
  assert.equal(items[2].quantity, 99);
});

test("confirmed cutlery baseline keys infer article number from the snapshot name", () => {
  const confirmedItem = {
    itemType: "ACCESSORY",
    code: "ACC-CUTLERY",
    nameSnapshot: "Cutlery insert 60 cm",
    articleNumber: null,
    quantity: 1,
  };
  const submittedItem = {
    itemType: "ACCESSORY",
    code: "ACC-CUTLERY",
    name: "Cutlery insert 60 cm",
    articleNumber: "ZB60SG",
    quantity: 1,
  };

  assert.equal(
    buildOrderItemSelectionKey(confirmedItem),
    buildOrderItemSelectionKey(submittedItem),
  );
});

test("non-cutlery baseline keys remain type and code based", () => {
  assert.equal(
    buildOrderItemSelectionKey({
      itemType: "COMPONENT",
      code: "CAB-BASE-1",
      articleNumber: "US50",
    }),
    "COMPONENT:CAB-BASE-1",
  );
});

test("order creation merges confirmed baseline items into server-side selection", () => {
  assert.match(ordersSource, /function withConfirmedBaselineSelection\(selectedItems,\s*confirmedItems\)/);
  assert.match(ordersSource, /const submittedSelected = \[\.\.\.selectedComponents,\s*\.\.\.selectedAccessories,\s*\.\.\.selectedServices\];/);
  assert.match(ordersSource, /const allSelected = withConfirmedBaselineSelection\(submittedSelected,\s*contractOrderState\.confirmedItems\);/);
  assert.match(ordersSource, /const submittedKeys = new Set\(allSelected\.map\(buildOrderItemSelectionKey\)\);/);
});
