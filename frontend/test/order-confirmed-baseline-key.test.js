import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isCutleryAccessoryCode,
  parseCutleryLineFromOrderItem,
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
