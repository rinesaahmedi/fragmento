import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { getProductInfoDocuments, getLocalizedItemName } from "../components/kitchen-selection-utils.js";

const source = readFileSync(new URL("../components/kitchen-configurator.js", import.meta.url), "utf8");
const mergeSource = source.slice(source.indexOf("function mergeInitialOrderItemFields("), source.indexOf("function expandLinkedComponentIds("));
const mergeInitialOrderItemFields = runInNewContext(`${mergeSource}\nmergeInitialOrderItemFields;`);

test("included oven info keeps the corrected EH923640E catalog article despite an old order snapshot", () => {
  const item = {
    code: "OVEN-B-600-HOB", isLocked: true,
    articleNumber: "A-EH923640E + 9EC744100C", catalogArticleId: "catalog-40",
    name: "Built-in oven and ceramic cooktop",
  };
  const lookup = new Map([[`component:${item.code}`, {
    articleNumber: "EH92364E-A + 9EC744100C + UHK", sourceOrderId: "existing-order",
  }]]);
  const merged = mergeInitialOrderItemFields(item, "component", lookup);
  assert.equal(merged.articleNumber, item.articleNumber);
  assert.equal(merged.sourceOrderId, "existing-order");
  assert.match(getProductInfoDocuments(merged)[0].href, /\/eh923640e\/a-eh923640e-product-info\.pdf$/);
  assert.equal(getLocalizedItemName(merged, (_key, fallback) => fallback, "en", false), "Built-in oven and ceramic cooktop");
});

test("paid cabinet variants still retain their historical article snapshot", () => {
  const item = { code: "CAB-BASE-90", isLocked: false, articleNumber: "US90" };
  const lookup = new Map([[`component:${item.code}`, { articleNumber: "US2A90" }]]);
  assert.equal(mergeInitialOrderItemFields(item, "component", lookup).articleNumber, "US2A90");
});
