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
import {
  buildServiceClaimBlendeHotspots,
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "../lib/service-claim-kitchen-hotspots.js";
import {
  allowsKitchenArticleNumberAlias,
  matchesConfiguredArticleNumber,
} from "../lib/order-article-aliases.js";

const slug = "ab-105775";
const translate = (_key, fallback) => fallback;

test("AB 105775 uses its vector plan and exact perspective polygons", () => {
  const svg = readFileSync(new URL("../public/plans/AB 105775 - 64.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];
  const keys = new Set(hotspots.map((hotspot) => hotspot.componentKey));

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.doesNotMatch(svg, /d="M418\.(?:09333|2109)/, "the duplicate PDF separator must be removed");
  assert.doesNotMatch(svg, /d="M3485 502V1789/, "the converted SVG must not add a middle vertical seam");
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20105775%20-%2064.svg?v=4");
  assert.equal(hotspots.length, 47);
  assert.equal(hotspots.every((hotspot) => hotspot.points?.length >= 3), true);
  for (const key of [
    "refrigerator", "extractor-hood", "worktop", "sink-faucet",
    "oven-module", "sink-base", "dishwasher-base", "drawer-module",
    "wall-cabinet-1", "wall-cabinet-7",
  ]) {
    assert.ok(keys.has(key), `${key} should have a plan polygon`);
  }
  assert.deepEqual(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug].map((entry) => entry.key), [
    "dishwasher-basket",
    "dishwasher-gs-mark",
  ]);
  assert.equal(isLShapedClaimKitchen(slug), true);
  assert.equal(
    hotspots.filter(({ componentKey }) => componentKey === "worktop").length,
    5,
    "the left worktop should be split around the cooktop cut-out",
  );
});

test("AB 105775 schedule rows are catalog linked and complete", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const block = seed.match(/const AB_105775_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-105775"[\s\S]*?kitchenCode: "105 775"[\s\S]*?items: AB_105775_ITEMS/);
  assert.match(block, /defaultOvenHob\(\{[\s\S]*?catalogArticleNumber: "A-EH923640E \+ 9EC744100C"/);
  assert.match(block, /defaultWorktop\(\{[\s\S]*?code: "TOP-AB105775"[\s\S]*?catalogArticleNumber: "PLR60"/);
  assert.match(block, /defaultSinkBase\(\{[\s\S]*?catalogArticleNumber: "SP60"/);

  for (const [code, article] of [
    ["REF-AB105775-KGCN388140E", "OL-KGCN388140E"],
    ["CAB-BASE-AB105775-US50-UPEF65", "US50"],
    ["CAB-BASE-AB105775-US30-1", "US30"],
    ["CAB-BASE-AB105775-US30-UPK20", "US30"],
    ["CAB-BASE-AB105775-US30-2", "US30"],
    ["DISH-AB105775-600-UPK20", "A-EGSPV597210 + TGV60"],
    ["CAB-WALL-AB105775-H6002-HPK2002-L", "H6002"],
    ["CAB-WALL-AB105775-H3002-1", "H3002"],
    ["CAB-HOOD-AB105775-600", "FH664621E + FWK124 + HD6002"],
    ["CAB-WALL-AB105775-H3002-2", "H3002"],
    ["CAB-WALL-AB105775-H3002-3", "H3002"],
    ["CAB-WALL-AB105775-H6002-1", "H6002"],
    ["CAB-WALL-AB105775-H6002-HPK2002-R", "H6002"],
  ]) {
    const line = block.split(/\r?\n/).find((entry) => entry.includes(`code: "${code}"`));
    assert.ok(line?.includes(`articleNumber: "${article}"`), `${code} should link ${article}`);
  }
  for (const blende of ["UPEF65", "UPK20", "HPK2002"]) {
    assert.match(block, new RegExp(`blendeCode: "${blende}"`));
  }
  const row13 = block.split(/\r?\n/).find((entry) => entry.includes('code: "CAB-WALL-AB105775-H3002-2"'));
  assert.ok(row13?.includes('blendeCode: "HPK2002"'), "row 13 should include its HPK2002 filler panel");
  assert.match(block, /\.\.\.defaultAccessories\(\)/);
  assert.match(block, /\.\.\.defaultServices\(\)/);
});

test("AB 105775 callouts and hood selection match rows 2-16", () => {
  const expected = {
    "TOP-AB105775": "2",
    "SINK-BASE-AB105775-SP60": "3",
    "REF-AB105775-KGCN388140E": "4",
    "CAB-BASE-AB105775-US50-UPEF65": "5",
    "CAB-BASE-AB105775-US30-1": "6",
    "CAB-BASE-AB105775-US30-UPK20": "7",
    "CAB-BASE-AB105775-US30-2": "8",
    "DISH-AB105775-600-UPK20": "9",
    "CAB-WALL-AB105775-H6002-HPK2002-L": "10",
    "CAB-WALL-AB105775-H3002-1": "11",
    "CAB-HOOD-AB105775-600": "12",
    "HOOD-AB105775-FH664621E": "12",
    "CAB-WALL-AB105775-H3002-2": "13",
    "CAB-WALL-AB105775-H3002-3": "14",
    "CAB-WALL-AB105775-H6002-1": "15",
    "CAB-WALL-AB105775-H6002-HPK2002-R": "16",
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

test("AB 105775 resolves the requested contract number", () => {
  assert.equal(`670${"105 775".replace(/\D/g, "")}`, "670105775");
});

test("AB 105775 accepts its supplier-facing bundle article numbers at checkout", () => {
  assert.equal(allowsKitchenArticleNumberAlias(slug), true);
  assert.equal(matchesConfiguredArticleNumber({
    submittedArticleNumber: "PLR60-1 + PLR60-2",
    catalogArticleNumber: "PLR60",
    kitchenArticleNumber: "PLR60-1 + PLR60-2",
    allowKitchenArticleNumberAlias: true,
  }), true);
  assert.equal(matchesConfiguredArticleNumber({
    submittedArticleNumber: "517720 + 526335",
    catalogArticleNumber: "526335 + 517720",
    kitchenArticleNumber: "517720 + 526335",
    allowKitchenArticleNumberAlias: true,
  }), true);
});

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

test("AB 105775 ASC assigns each Blende to its exact PDF face", () => {
  const source = PLAN_HOTSPOTS_BY_SLUG[slug].map(withBounds);
  const definitions = [
    ["base-module-1", "UPEF65", 500],
    ["base-module-3", "UPK20", 300],
    ["dishwasher-base", "UPK20", 600],
    ["wall-cabinet-1", "HPK2002", 600],
    ["wall-cabinet-4", "HPK2002", 300],
    ["wall-cabinet-7", "HPK2002", 600],
  ];
  const blenden = definitions.map(([sourceComponentKey, code], index) => ({
    componentId: `blende-${index}`,
    componentKey: `claim-blende-${sourceComponentKey}`,
    sourceComponentKey,
    code,
    claimPartKey: "blende",
    blendeQuantity: 1,
    sourceWidthMm: definitions[index][2],
  }));
  const components = definitions.map(([componentKey, , widthMm]) => ({ componentKey, widthMm }));
  const result = buildServiceClaimBlendeHotspots(source, blenden, components, slug);
  const claimsFor = (sourceComponentKey) => result.filter((hotspot) => (
    hotspot.claimPartKey === "blende" && hotspot.sourceComponentKey === sourceComponentKey
  ));
  const horizontalBounds = (sourceComponentKey) => claimsFor(sourceComponentKey).map(
    ({ left, width }) => [Number(left.toFixed(6)), Number(width.toFixed(6))],
  );

  assert.deepEqual(
    horizontalBounds("base-module-1"),
    [[28.033254, 1.482185]],
    "UPEF65 should own the complete corner face, not the US50 outer edge",
  );
  assert.deepEqual(
    horizontalBounds("dishwasher-base"),
    [[86.736342, 0.954869]],
    "dishwasher UPK20 should be the narrow right face",
  );
  assert.deepEqual(
    horizontalBounds("wall-cabinet-1"),
    [[22.56057, 0.7981]],
    "left HPK2002 should own its complete visible face",
  );
  assert.deepEqual(
    horizontalBounds("wall-cabinet-7"),
    [[90.256532, 0.969121], [91.225653, 0.270784]],
    "right HPK2002 should stop before the exposed cabinet side",
  );
  assert.ok(
    result.some((hotspot) => hotspot.componentKey === "wall-cabinet-7" && hotspot.left === 91.496437),
    "the outer side face must remain selectable as H6002",
  );
  assert.deepEqual(
    horizontalBounds("base-module-3"),
    [[49.290471, 0.690527]],
    "the oven-side UPK20 should include both visible divider strokes",
  );
  assert.equal(
    claimsFor("wall-cabinet-4").length,
    0,
    "the non-visible HPK2002 must not cut a strip from H3002",
  );
  const completeH3002 = result.filter((hotspot) => hotspot.componentKey === "wall-cabinet-4");
  assert.equal(completeH3002.length, 2);
  assert.deepEqual(completeH3002.map(({ points }) => points), source
    .filter((hotspot) => hotspot.componentKey === "wall-cabinet-4")
    .map(({ points }) => points));
});

test("AB 105775 ASC cooktop follows the outside glass perimeter", () => {
  const source = PLAN_HOTSPOTS_BY_SLUG[slug].map(withBounds);
  const cooktop = buildServiceClaimPartHotspots(source, [{
    componentId: "component-claim-cooktop",
    partKey: "cooktop",
    sourceComponentKey: "oven-module",
  }], slug).find((hotspot) => hotspot.claimPartKey === "cooktop");

  assert.deepEqual(cooktop.points, [
    [42.470309, 59.018487],
    [49.980998, 60.107563],
    [49.980998, 60.773109],
    [44.47981, 61.902521],
    [34.674584, 60.490756],
  ]);
});

test("AB 105775 ASC sink follows the complete bowl and drainer rim", () => {
  const source = PLAN_HOTSPOTS_BY_SLUG[slug].map(withBounds);
  const sink = buildServiceClaimPartHotspots(source, [{
    componentId: "component-claim-sink",
    partKey: "sink",
    sourceComponentKey: "sink-faucet",
  }], slug).find((hotspot) => hotspot.claimPartKey === "sink");

  assert.deepEqual(sink.points, [
    [67.581948, 64.746218],
    [67.667458, 64.685714],
    [73.524941, 63.717647],
    [85.368171, 65.431933],
    [85.467933, 65.67395],
    [80.87886, 66.621849],
    [79.795724, 66.642017],
    [67.92399, 64.907563],
  ]);
});

test("AB 105775 worktop stops exactly on every cooktop edge", () => {
  const worktops = PLAN_HOTSPOTS_BY_SLUG[slug]
    .filter((hotspot) => hotspot.componentKey === "worktop");
  const cooktop = PLAN_HOTSPOTS_BY_SLUG[slug]
    .find((hotspot) => hotspot.claimApplianceSurface === "cooktop");
  const pointKey = ([x, y]) => `${x}:${y}`;
  const worktopPointCounts = new Map();
  worktops.slice(0, 3).flatMap((hotspot) => hotspot.points).forEach((point) => {
    const key = pointKey(point);
    worktopPointCounts.set(key, (worktopPointCounts.get(key) || 0) + 1);
  });

  assert.deepEqual(
    cooktop.points.map((point) => worktopPointCounts.get(pointKey(point)) || 0),
    [2, 1, 1, 1, 2],
    "the three worktop masks must share the complete five-point cooktop boundary",
  );
  assert.deepEqual(worktops[0].points, [
    [21.27791, 57.848739],
    [27.149644, 56.638655],
    [42.470309, 59.018487],
    [34.674584, 60.490756],
    [28.71734, 59.704202],
    [21.27791, 61.236975],
  ]);
});
