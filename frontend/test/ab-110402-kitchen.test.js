import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLinkedComponentIds, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import {
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
  PLAN_IMAGE_SOURCE_SIZE_BY_SLUG,
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG,
} from "../lib/kitchen-plan-preview-data.js";
import { buildServiceClaimPartHotspots, isLShapedClaimKitchen } from "../lib/service-claim-kitchen-hotspots.js";

const slug = "ab-110402";
const translate = (_key, fallback) => fallback;

function withBounds(hotspot) {
  const xs = hotspot.points.map(([x]) => x);
  const ys = hotspot.points.map(([, y]) => y);
  return {
    ...hotspot,
    left: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

test("AB 110402 uses its vector PDF and exact shared FRG/ASC rectangles", () => {
  const svg = readFileSync(new URL("../public/plans/AB 110402.svg", import.meta.url), "utf8");
  const stage = readFileSync(new URL("../components/kitchen-svg-stage.jsx", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20110402.svg");
  assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[slug], { width: 842, height: 595 });
  assert.match(stage, /IMAGE_HOTSPOTS_BY_SLUG\["ab-110402"\] = AB_110402_FRG_ORDER_HOTSPOTS/);
  assert.equal(hotspots.length, 18);
  assert.ok(hotspots.every((hotspot) => hotspot.preserveManualSize === true));
  assert.equal(new Set(hotspots.filter((entry) => entry.componentKey.startsWith("wall-cabinet-")).map((entry) => entry.componentKey)).size, 6);
  assert.equal(hotspots.filter((entry) => entry.componentKey === "sink-faucet").length, 4);
  const sinkBase = hotspots.find((entry) => entry.componentKey === "sink-base");
  assert.deepEqual(sinkBase.points.slice(0, 2), [
    [53.857482, 64.72605],
    [64.517815, 64.72605],
  ]);
  assert.deepEqual(hotspots.find((entry) => entry.componentKey === "worktop").points, [
    [12.541568, 63.213445], [86.907363, 63.213445],
    [86.907363, 64.72605], [12.541568, 64.72605],
  ]);
  for (const key of ["base-module-1", "oven-module", "dishwasher-base", "base-module-2", "sink-base", "base-module-3"]) {
    const lower = hotspots.find((entry) => entry.componentKey === key);
    assert.equal(lower.points[2][1], 97.842017);
    assert.equal(lower.points[3][1], 97.842017);
  }
});

test("AB 110402 preserves all thirteen supplier rows and six defaults", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const items = seed.match(/const AB_110402_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-110402"[\s\S]*?kitchenCode: "110 402"[\s\S]*?items: AB_110402_ITEMS/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "670"\)/);
  assert.match(items, /defaultOvenHob/);
  assert.match(items, /defaultWorktop/);
  assert.match(items, /SINK-BASE-AB110402-DEFAULT/);
  assert.equal((items.match(/isLocked: true/g) || []).length, 3);
  for (const [code, article, price] of [
    ["DISH-AB110402-600", "A-EGSPV597210 \\+ TGV60", "articlePrice"],
    ["CAB-WALL-AB110402-H3002-HPK2002", "H3002", "articlePriceWithBlende"],
    ["CAB-HOOD-AB110402-600", "FH664621E \\+ FWK124 \\+ HD6002", "bundlePrice"],
    ["CAB-WALL-AB110402-H6002", "H6002", "articlePrice"],
    ["CAB-WALL-AB110402-H4002-1", "H4002", "articlePrice"],
    ["CAB-WALL-AB110402-H4002-2", "H4002", "articlePrice"],
    ["CAB-WALL-AB110402-H4002-HPK2002", "H4002", "articlePriceWithBlende"],
  ]) {
    const row = items.split(/\r?\n/).find((line) => line.includes(`code: "${code}"`)) || "";
    assert.match(row, new RegExp(article));
    assert.ok(row.includes(price), `${code} should retain supplier/catalog price ${price}`);
  }
  assert.match(items, /CAB-WALL-AB110402-H3002-HPK2002[^\n]+displayArticleNumber: "H3002 \+ HPK2002"/);
  assert.match(items, /CAB-WALL-AB110402-H4002-HPK2002[^\n]+displayArticleNumber: "H4002 \+ HPK2002"/);
  assert.doesNotMatch(items, /\((?:25|35)E\)/);
});

test("AB 110402 maps supplier callouts and links both hood faces", () => {
  const expectedByCode = {
    "SINK-BASE-AB110402-DEFAULT": "3",
    "CAB-BASE-AB110402-DEFAULT-UPK20-1": "4",
    "DISH-AB110402-600": "5",
    "CAB-BASE-AB110402-DEFAULT-2": "6",
    "CAB-BASE-AB110402-DEFAULT-UPK20-2": "7",
    "CAB-WALL-AB110402-H3002-HPK2002": "8",
    "CAB-HOOD-AB110402-600": "9",
    "HOOD-AB110402-FH664621E": "9",
    "CAB-WALL-AB110402-H6002": "10",
    "CAB-WALL-AB110402-H4002-1": "11",
    "CAB-WALL-AB110402-H4002-2": "12",
    "CAB-WALL-AB110402-H4002-HPK2002": "13",
  };
  for (const [code, expected] of Object.entries(expectedByCode)) {
    assert.ok(getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true).startsWith(`${expected}. `));
  }
  assert.deepEqual(getLinkedComponentIds(slug, "component-wall-cabinet-2"), [
    "component-wall-cabinet-2",
    "component-extractor-hood",
  ]);
});

test("AB 110402 keeps dishwasher internals light and exposes linear ASC parts", () => {
  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug];
  assert.deepEqual(details.map((entry) => entry.key), ["dishwasher-basket", "dishwasher-gs-mark"]);
  assert.ok(details.every((entry) => entry.persistWhenSelected === true));
  assert.equal(isLShapedClaimKitchen(slug), false);

  const result = buildServiceClaimPartHotspots(PLAN_HOTSPOTS_BY_SLUG[slug].map(withBounds), [
    { partKey: "sink", sourceComponentKey: "sink-faucet" },
    { partKey: "sink-cabinet", sourceComponentKey: "sink-base" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", sourceComponentKey: "oven-module" },
  ], slug);
  for (const partKey of ["sink", "sink-cabinet", "oven", "oven-drawer", "cooktop"]) {
    assert.equal(result.filter((entry) => entry.claimPartKey === partKey).length, 1);
  }
  assert.equal(result.filter((entry) => entry.claimPartKey === "faucet").length, 4);
  assert.ok(result.every((entry) => !String(entry.clipPath || "").includes("NaN")));
});
