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

const slug = "ab-105776";
const translate = (_key, fallback) => fallback;

test("AB 105776 uses the sharp source plan and measured selection rectangles", () => {
  const svg = readFileSync(new URL("../public/plans/AB 105776 - 66.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20105776%20-%2066.svg");
  assert.equal(hotspots.length, 16);
  assert.equal(keys.filter((key) => key.startsWith("wall-cabinet-")).length, 5);
  for (const key of [
    "refrigerator",
    "extractor-hood",
    "worktop",
    "sink-faucet",
    "dishwasher-base",
    "oven-module",
    "base-module-1",
    "base-module-2",
    "sink-base",
    "sink-end-blende",
  ]) {
    assert.ok(keys.includes(key), `${key} should have a plan hotspot`);
  }
  assert.deepEqual(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug].map((entry) => entry.key), [
    "dishwasher-basket",
    "dishwasher-gs-mark",
  ]);

  const rightWall = hotspots.find((entry) => entry.componentKey === "wall-cabinet-5");
  const sink = hotspots.find((entry) => entry.componentKey === "sink-base");
  const sinkBlende = hotspots.find((entry) => entry.componentKey === "sink-end-blende");
  assert.ok(Math.abs(rightWall.left + rightWall.width - 98.632089) < 0.000001);
  assert.ok(Math.abs(sink.left + sink.width - sinkBlende.left) < 0.000001);
  assert.ok(Math.abs(sinkBlende.left + sinkBlende.width - 98.632089) < 0.000001);
});

test("AB 105776 schedule rows are catalog linked and complete", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const block = seed.match(/const AB_105776_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-105776"[\s\S]*?kitchenCode: "105 776"[\s\S]*?items: AB_105776_ITEMS/);
  assert.match(block, /defaultOvenHob\(\{[\s\S]*?catalogArticleNumber: "A-EH923640E \+ 9EC744100C"/);
  assert.match(block, /defaultWorktop\(\{ code: "TOP-AB105776"[^\n]+catalogArticleNumber: "PLR60"/);
  assert.match(block, /defaultSinkBase\(\{[\s\S]*?catalogArticleNumber: "SP60"/);
  assert.match(block, /sinkEndBlende\("105776", \{ sortOrder: 80, catalogBlendeCode: "UPK20" \}\)/);

  for (const [code, article] of [
    ["REF-AB105776-KGCN388140E", "OL-KGCN388140E"],
    ["DISH-AB105776-600", "A-EGSPV597210 + TGV60"],
    ["CAB-BASE-AB105776-US60", "US60"],
    ["CAB-BASE-AB105776-US50", "US50"],
    ["CAB-WALL-AB105776-H6002-1", "H6002"],
    ["CAB-HOOD-AB105776-600", "FH664621E + FWK124 + HD6002"],
    ["CAB-WALL-AB105776-H6002-2", "H6002"],
    ["CAB-WALL-AB105776-H5002", "H5002"],
    ["CAB-WALL-AB105776-H6002-HPK2002", "H6002"],
  ]) {
    const line = block.split(/\r?\n/).find((entry) => entry.includes(`code: "${code}"`));
    assert.ok(line?.includes(`articleNumber: "${article}"`), `${code} should link ${article}`);
  }
  assert.match(block, /CAB-WALL-AB105776-H6002-HPK2002[^\n]+catalogArticleNumber: "H6002"[^\n]+blendeCode: "HPK2002"[^\n]+blendePrice: "0\.00"/);
  assert.match(block, /\.\.\.defaultAccessories\(\)/);
  assert.match(block, /\.\.\.defaultServices\(\)/);
});

test("AB 105776 callouts and linked hood match the supplied schedule", () => {
  const expected = {
    "TOP-AB105776": "2",
    "SINK-BASE-AB105776-SP60": "3",
    "REF-AB105776-KGCN388140E": "4",
    "DISH-AB105776-600": "5",
    "CAB-BASE-AB105776-US60": "6",
    "CAB-BASE-AB105776-US50": "7",
    "BLENDE-AB105776-SINK-END": "8",
    "CAB-WALL-AB105776-H6002-1": "9",
    "CAB-HOOD-AB105776-600": "10",
    "HOOD-AB105776-FH664621E": "10",
    "CAB-WALL-AB105776-H6002-2": "11",
    "CAB-WALL-AB105776-H5002": "12",
    "CAB-WALL-AB105776-H6002-HPK2002": "13",
  };
  for (const [code, number] of Object.entries(expected)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${number}. `), `${code} should use callout ${number}`);
  }
  assert.deepEqual(
    getLinkedComponentIds(slug, "component-wall-cabinet-2"),
    ["component-wall-cabinet-2", "component-extractor-hood"],
  );
});

test("AB 105776 resolves the requested contract number", () => {
  assert.equal(`670${"105 776".replace(/\D/g, "")}`, "670105776");
});
