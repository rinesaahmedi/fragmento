import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLinkedComponentIds, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import { AB_105778_LAYOUT_ALIAS_SLUGS, PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG, PLAN_IMAGE_SOURCE_SIZE_BY_SLUG, PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { buildServiceClaimPartHotspots, isLShapedClaimKitchen } from "../lib/service-claim-kitchen-hotspots.js";

const slug = "ab-105778";
const boxes = PLAN_HOTSPOTS_BY_SLUG[slug];
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00002, `${actual} must match ${expected}`);
const byKey = (key) => boxes.find((box) => box.componentKey === key);

test("105778 source plan loads for both orders and service claims", async () => {
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/670%20105778.svg");
  const expected = readFileSync(new URL("../public/plans/670 105778.svg", import.meta.url), "utf8").trim();
  assert.equal(await loadKitchenSvgMarkup(slug), expected);
  assert.match(expected, /width="842" height="595" viewBox="0 0 842 595"/);
});

test("selection covers the PDF cabinet faces without gaps or overlaps", () => {
  // Source coordinates are taken from PDF path rectangles, independent of the percentage map.
  for (const [key, x0, y0, x1, y1] of [
    ["base-module-1", 183.96, 386.68, 273, 582.16],
    ["oven-module", 273, 386.68, 406.56, 582.16],
    ["dishwasher-base", 406.56, 386.68, 540.24, 582.16],
    ["sink-base", 540.24, 386.68, 651.6, 582.16],
    ["sink-end-blende", 651.6, 386.68, 663.6, 582.16],
    ["wall-cabinet-1", 183.96, 99.88, 273, 260.8],
    ["wall-cabinet-2", 273, 99.88, 406.56, 260.8],
    ["wall-cabinet-3", 406.56, 99.88, 540.24, 260.8],
    ["wall-cabinet-4", 540.24, 99.88, 663.6, 260.8],
    ["extractor-hood", 273, 260.8, 406.56, 271.96],
  ]) {
    const box = byKey(key);
    near(box.left, x0 / 842 * 100);
    near(box.top, y0 / 595 * 100);
    near(box.left + box.width, x1 / 842 * 100);
    near(box.top + box.height, y1 / 595 * 100);
    assert.equal(box.preserveManualSize, true);
  }
  assert.equal(boxes.length, 15);
  const worktop = boxes.filter((box) => box.componentKey === "worktop");
  near(worktop[0].left + worktop[0].width, byKey("sink-end-blende").left + byKey("sink-end-blende").width);
  near(worktop[1].left + worktop[1].width, byKey("base-module-1").left);
  assert.equal(worktop[1].separateLockedSidePanel, true);
  for (const detail of PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug]) {
    const dishwasher = byKey(detail.componentKey);
    assert.equal(detail.persistWhenSelected, true);
    assert.ok(detail.left > dishwasher.left && detail.left + detail.width < dishwasher.left + dishwasher.width);
    assert.ok(detail.top > dishwasher.top && detail.top + detail.height < dishwasher.top + dishwasher.height);
  }
});

test("supplier callouts and linked hood selection match the 105778 schedule", () => {
  const codes = ["OVEN-B-600-HOB", "TOP-AB105778", "SINK-BASE-AB105778-SP50-R", "CAB-BASE-AB105778-US40", "DISH-AB105778-600", "BLENDE-AB105778-SINK-END", "CAB-WALL-AB105778-H4002", "CAB-HOOD-AB105778-600", "CAB-WALL-AB105778-H6002", "CAB-WALL-AB105778-H5002-HPK2002"];
  codes.forEach((code, index) => assert.ok(getLocalizedItemName({ code, name: "Item" }, (_key, fallback) => fallback, "en", true).startsWith(`${index + 1}. `)));
  assert.deepEqual(getLinkedComponentIds(slug, "component-extractor-hood"), ["component-wall-cabinet-2", "component-extractor-hood"]);
});

test("ASC oven and drawer meet on the source seam and the sink follows both worktop edges", () => {
  assert.equal(isLShapedClaimKitchen(slug), false);
  const parts = ["oven", "oven-drawer", "cooktop"].map((partKey) => ({ partKey, sourceComponentKey: "oven-module", name: partKey }));
  parts.push(...["sink", "faucet"].map((partKey) => ({ partKey, sourceComponentKey: "sink-faucet", name: partKey })));
  const claims = buildServiceClaimPartHotspots(boxes, parts, slug);
  const oven = claims.find((entry) => entry.claimPartKey === "oven");
  const drawer = claims.find((entry) => entry.claimPartKey === "oven-drawer");
  near(oven.top + oven.height, 515.92 / 595 * 100);
  near(drawer.top, oven.top + oven.height);
  near(drawer.top + drawer.height, 582.16 / 595 * 100);
  const sink = claims.find((entry) => entry.claimPartKey === "sink");
  const faucet = claims.find((entry) => entry.claimPartKey === "faucet");
  near(sink.left, byKey("sink-base").left);
  near(sink.width, byKey("sink-base").width);
  near(sink.top, 377.68 / 595 * 100);
  near(sink.height, 9 / 595 * 100);
  near(sink.top + sink.height, byKey("sink-base").top);
  near(faucet.left, byKey("sink-faucet").left);
  assert.notEqual(sink.componentId, faucet.componentId);
});

for (const siblingSlug of AB_105778_LAYOUT_ALIAS_SLUGS) {
  test(`${siblingSlug} retains the complete 105778 order and ASC geometry`, async () => {
    assert.equal(await loadKitchenSvgMarkup(siblingSlug), await loadKitchenSvgMarkup(slug));
    assert.deepEqual(PLAN_IMAGE_BY_SLUG[siblingSlug], PLAN_IMAGE_BY_SLUG[slug]);
    assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[siblingSlug], PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[slug]);
    assert.deepEqual(PLAN_HOTSPOTS_BY_SLUG[siblingSlug], boxes);
    assert.deepEqual(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[siblingSlug], PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug]);
    assert.deepEqual(getLinkedComponentIds(siblingSlug, "component-extractor-hood"), getLinkedComponentIds(slug, "component-extractor-hood"));
    assert.equal(isLShapedClaimKitchen(siblingSlug), false);
    const parts = ["oven", "oven-drawer", "cooktop"].map((partKey) => ({ partKey, sourceComponentKey: "oven-module" }));
    parts.push(...["sink", "faucet"].map((partKey) => ({ partKey, sourceComponentKey: "sink-faucet" })));
    parts.push({ partKey: "sink-cabinet", sourceComponentKey: "sink-base" });
    assert.deepEqual(buildServiceClaimPartHotspots(PLAN_HOTSPOTS_BY_SLUG[siblingSlug], parts, siblingSlug), buildServiceClaimPartHotspots(boxes, parts, slug));
  });
}
