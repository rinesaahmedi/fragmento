import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getLinkedComponentIds,
  getLocalizedItemName,
} from "../components/kitchen-selection-utils.js";
import {
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG,
} from "../lib/kitchen-plan-preview-data.js";

const slug = "ab-105760";
const translate = (_key, fallback) => fallback;

test("AB 105760 uses the sharp 105760-61 plan and measured element rectangles", () => {
  const svg = readFileSync(new URL("../public/plans/AB 105760-61.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20105760-61.svg");
  assert.equal(hotspots.length, 14);
  assert.equal(keys.filter((key) => key.startsWith("wall-cabinet-")).length, 4);
  for (const key of [
    "extractor-hood",
    "worktop",
    "sink-faucet",
    "sink-end-blende",
    "sink-base",
    "dishwasher-base",
    "oven-module",
    "base-module-1",
    "refrigerator",
  ]) {
    assert.ok(keys.includes(key), `${key} should have a plan hotspot`);
  }
  assert.deepEqual(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug].map((entry) => entry.key), [
    "dishwasher-basket",
    "dishwasher-gs-mark",
  ]);
  for (const key of ["sink-end-blende", "sink-base", "dishwasher-base", "oven-module", "base-module-1", "refrigerator"]) {
    const hotspot = hotspots.find((entry) => entry.componentKey === key);
    assert.ok(Math.abs(hotspot.top + hotspot.height - 97.842017) < 0.000001, `${key} should reach the final PDF baseline`);
  }
  const worktopHotspots = hotspots.filter((entry) => entry.componentKey === "worktop");
  assert.equal(worktopHotspots.length, 2);
  assert.deepEqual(worktopHotspots[1], {
    componentKey: "worktop",
    left: 71.586698,
    top: 65.109244,
    width: 0.413302,
    height: 32.732773,
    preserveManualSize: true,
  });
  const rightBase = hotspots.find((entry) => entry.componentKey === "base-module-1");
  assert.ok(Math.abs(rightBase.left + rightBase.width - worktopHotspots[1].left) < 0.000001);
});

test("AB 105760 schedule rows, prices, and catalog article links are complete", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const block = seed.match(/const AB_105760_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-105760"[\s\S]*?kitchenCode: "105 760"[\s\S]*?items: AB_105760_ITEMS/);
  assert.match(block, /defaultOvenHob\(\{ catalogArticleNumber: "A-EH923640E \+ 9EC744100C"/);
  assert.match(block, /defaultWorktop/);
  assert.match(block, /defaultSinkBase/);
  assert.match(block, /sinkEndBlende\("105760", \{ sortOrder: 40, catalogBlendeCode: "UPK20" \}\)/);
  for (const [code, article, price] of [
    ["DISH-AB105760-600", "A-EGSPV597210 + TGV60", "579.00"],
    ["CAB-BASE-AB105760-US60", "US60", "219.00"],
    ["REF-AB105760-KGCN388140E", "OL-KGCN388140E", "579.00"],
    ["CAB-WALL-AB105760-H6002-HPK2002", "H6002", "149.00"],
    ["CAB-WALL-AB105760-H6002-2", "H6002", "149.00"],
    ["CAB-HOOD-AB105760-600", "FH664621E + FWK124 + HD6002", "349.00"],
    ["CAB-WALL-AB105760-H6002-4", "H6002", "149.00"],
  ]) {
    const line = block.split(/\r?\n/).find((entry) => entry.includes(`code: "${code}"`));
    assert.ok(line?.includes(`articleNumber: "${article}"`), `${code} should link ${article}`);
    assert.ok(line?.includes(`price: "${price}"`), `${code} should cost ${price}`);
  }
  assert.match(block, /CAB-WALL-AB105760-H6002-HPK2002[^\n]+catalogArticleNumber: "H6002"[^\n]+blendeCode: "HPK2002"[^\n]+blendePrice: "0\.00"/);
  assert.match(block, /\.\.\.defaultAccessories\(\)/);
  assert.match(block, /\.\.\.defaultServices\(\)/);
});

test("AB 105760 maps callouts 4-11 and links the third upper cabinet to its hood", () => {
  const expected = {
    "BLENDE-AB105760-SINK-END": "4",
    "DISH-AB105760-600": "5",
    "CAB-BASE-AB105760-US60": "6",
    "REF-AB105760-KGCN388140E": "7",
    "CAB-WALL-AB105760-H6002-HPK2002": "8",
    "CAB-WALL-AB105760-H6002-2": "9",
    "CAB-HOOD-AB105760-600": "10",
    "HOOD-AB105760-FH664621E": "10",
    "CAB-WALL-AB105760-H6002-4": "11",
  };
  for (const [code, number] of Object.entries(expected)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${number}. `), `${code} should use callout ${number}`);
  }
  assert.deepEqual(
    getLinkedComponentIds(slug, "component-wall-cabinet-3"),
    ["component-wall-cabinet-3", "component-extractor-hood"],
  );
});

test("AB 105760 is available under both 670 and 111 contract prefixes", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");

  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "670"\)/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "111"\)/);
  assert.equal(`670${"105 760".replace(/\D/g, "")}`, "670105760");
  assert.equal(`111${"105 760".replace(/\D/g, "")}`, "111105760");
});
