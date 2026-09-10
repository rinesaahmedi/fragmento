import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLinkedComponentIds, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import {
  buildServiceClaimBlendeHotspots,
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "../lib/service-claim-kitchen-hotspots.js";
import { buildServiceClaimSelectableComponents } from "../lib/service-claim-kitchen-plan-selection.js";
import { buildServiceClaimComponentChoiceGroups } from "../lib/service-claim-component-choices.js";

const slug = "ab-110510";
const translate = (_key, fallback) => fallback;
const withBounds = (hotspot) => {
  const xs = hotspot.points.map(([x]) => x);
  const ys = hotspot.points.map(([, y]) => y);
  return {
    ...hotspot,
    left: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

test("AB 110510 uses its vector plan and covers every visible perspective face", () => {
  const svg = readFileSync(new URL("../public/plans/AB 110510.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20110510.svg");
  assert.equal(hotspots.length, 32);
  assert.ok(hotspots.every((hotspot) => hotspot.points.length >= 4));
  assert.equal(keys.filter((key) => key === "refrigerator").length, 3);
  assert.equal(keys.filter((key) => key.startsWith("wall-cabinet-")).length, 11);
  assert.equal(keys.filter((key) => key === "worktop").length, 4);
  assert.equal(keys.filter((key) => key === "sink-faucet").length, 3);
  assert.equal(keys.filter((key) => key === "base-module-2").length, 3);
  assert.equal(keys.filter((key) => key === "base-module-3").length, 3);
  assert.equal(keys.filter((key) => key === "oven-module").length, 2);
  assert.ok(keys.includes("sink-base"));
  assert.ok(keys.includes("extractor-hood"));
});

test("AB 110510 FRG extractor selection follows the complete left side seam", () => {
  const stage = readFileSync(new URL("../components/kitchen-svg-stage.jsx", import.meta.url), "utf8");

  assert.match(
    stage,
    /componentKey: "extractor-hood", points: \[\[32\.437055, 39\.294118\], \[34\.631829, 38\.931092\], \[34\.631829, 40\.625210\]\]/,
  );
});

test("AB 110510 preserves six DEFAULT rows and the corrected Excel schedule", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const block = seed.match(/const AB_110510_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-110510"[\s\S]*?kitchenCode: "110 510"[\s\S]*?items: AB_110510_ITEMS/);
  assert.equal((block.match(/defaultOvenHob|defaultWorktop|defaultSinkBase|isLocked: true/g) || []).length, 6);
  for (const [code, price] of [
    ["REF-AB110510-KGCN388140E", "579.00"],
    ["CAB-WALL-AB110510-H4502", "139.00"],
    ["CAB-HOOD-AB110510-600", "349.00"],
    ["CAB-WALL-AB110510-H4002", "130.00"],
  ]) {
    const line = block.split(/\r?\n/).find((entry) => entry.includes(`code: "${code}"`));
    assert.ok(line?.includes(`price: "${price}"`), `${code} should cost ${price}`);
  }
  assert.match(block, /CAB-BASE-AB110510-DEFAULT-CORNER[^\n]+blendeCode: "UPEF65"/);
  assert.match(block, /CAB-BASE-AB110510-DEFAULT-SINK-RUN[^\n]+blendeCode: "UPK20"/);
  assert.match(block, /code: "SINK-BASE-AB110510-DEFAULT"[^\n]+name: "Sink Lower Cabinet"[^\n]+widthMm: 1100[^\n]+articleNumber: "SPEB110"/);
  assert.match(block, /code: "CAB-BASE-AB110510-DEFAULT-LEFT"[^\n]+name: "Lower Cabinet 40 cm"[^\n]+widthMm: 400[^\n]+componentKey: "base-module-1"[^\n]+articleNumber: "U40"[^\n]+useCatalogArticle: false[^\n]+preserveName: true/);
  assert.match(block, /code: "CAB-BASE-AB110510-DEFAULT-CORNER"[^\n]+name: "Lower Cabinet 45 cm"[^\n]+widthMm: 450[^\n]+componentKey: "base-module-2"[^\n]+articleNumber: "U45"[^\n]+useCatalogArticle: false[^\n]+preserveName: true[^\n]+blendeCode: "UPEF65"/);
  assert.match(block, /code: "CAB-BASE-AB110510-DEFAULT-SINK-RUN"[^\n]+name: "Lower Cabinet with Drawer 50 cm"[^\n]+widthMm: 500[^\n]+componentKey: "base-module-3"[^\n]+articleNumber: "US50"[^\n]+preserveName: true[^\n]+blendeCode: "UPK20"/);
  assert.match(block, /CAB-WALL-AB110510-H6002-HPK2002[^\n]+articlePriceWithBlende\("H6002", "HPK2002", 1\)[^\n]+blendeCode: "HPK2002"/);
});

test("AB 110510 exposes SPEB110, U40, U45, and US50 in ASC", () => {
  const items = [
    { itemType: "COMPONENT", code: "SINK-BASE-AB110510-DEFAULT", name: "Sink Lower Cabinet", articleNumber: "SPEB110", componentKey: "sink-base", widthMm: 1100, isLocked: true },
    { itemType: "COMPONENT", code: "CAB-BASE-AB110510-DEFAULT-LEFT", name: "Lower Cabinet 40 cm", articleNumber: "U40", componentKey: "base-module-1", widthMm: 400, isLocked: true },
    { itemType: "COMPONENT", code: "CAB-BASE-AB110510-DEFAULT-CORNER", name: "Lower Cabinet 45 cm", articleNumber: "U45", componentKey: "base-module-2", widthMm: 450, isLocked: true, blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel" },
    { itemType: "COMPONENT", code: "CAB-BASE-AB110510-DEFAULT-SINK-RUN", name: "Lower Cabinet with Drawer 50 cm", articleNumber: "US50", componentKey: "base-module-3", widthMm: 500, isLocked: true, blendeCode: "UPK20", blendeLabel: "UPK20 20 cm" },
  ];
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items },
    kitchenConfig: { components: items },
    kitchenSlug: slug,
    claimParts: [{
      partKey: "sink-cabinet",
      name: "Sink Lower Cabinet",
      articleCode: "SPEB110",
      sourceKitchenItemCode: "SINK-BASE-AB110510-DEFAULT",
      sourceComponentKey: "sink-base",
    }],
  });

  const articleBySourceKey = Object.fromEntries(
    selection.selectableComponents
      .filter((entry) => (
        entry.claimPartKey !== "blende"
        && ["sink-base", "base-module-1", "base-module-2", "base-module-3"].includes(entry.sourceComponentKey || entry.componentKey)
      ))
      .map((entry) => [entry.sourceComponentKey || entry.componentKey, entry.articleCode]),
  );
  assert.deepEqual(articleBySourceKey, {
    "sink-base": "SPEB110",
    "base-module-1": "U40",
    "base-module-2": "U45",
    "base-module-3": "US50",
  });
});

test("AB 110510 maps Excel callouts and links the complete hood package", () => {
  const expectedByCode = {
    "SINK-BASE-AB110510-DEFAULT": "3",
    "REF-AB110510-KGCN388140E": "4",
    "CAB-BASE-AB110510-DEFAULT-LEFT": "5",
    "CAB-BASE-AB110510-DEFAULT-CORNER": "6",
    "CAB-BASE-AB110510-DEFAULT-SINK-RUN": "7",
    "CAB-WALL-AB110510-H4502": "8",
    "CAB-HOOD-AB110510-600": "9",
    "CAB-WALL-AB110510-H4002": "10",
    "CAB-WALL-AB110510-H6002-HPK2002": "11",
  };

  for (const [code, expected] of Object.entries(expectedByCode)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${expected}. `), `${code} should use callout ${expected}`);
  }
  assert.deepEqual(
    getLinkedComponentIds(slug, "component-wall-cabinet-2"),
    ["component-wall-cabinet-2", "component-extractor-hood"],
  );
});

test("AB 110510 claims preserve exact sink, faucet, cooktop, and worktop polygons", () => {
  const source = PLAN_HOTSPOTS_BY_SLUG[slug].map(withBounds);
  const result = buildServiceClaimPartHotspots(source, [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
    { partKey: "sink", sourceComponentKey: "sink-faucet" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
    { partKey: "cooktop", sourceComponentKey: "oven-module" },
  ], slug);

  assert.equal(isLShapedClaimKitchen(slug), true);
  assert.deepEqual(
    result.filter((hotspot) => hotspot.claimPartKey?.startsWith("worktop-"))
      .map((hotspot) => hotspot.claimPartKey),
    ["worktop-left", "worktop-right", "worktop-left", "worktop-right"],
  );
  assert.equal(result.filter((hotspot) => hotspot.claimPartKey === "sink").length, 1);
  assert.equal(result.filter((hotspot) => hotspot.claimPartKey === "faucet").length, 2);
  assert.equal(result.filter((hotspot) => hotspot.claimPartKey === "cooktop").length, 1);
  const sink = result.find((hotspot) => hotspot.claimPartKey === "sink");
  assert.ok(Math.abs(sink.left - 59.2019) < 0.000001);
  assert.ok(Math.abs(sink.top - 52.685714) < 0.000001);
  assert.deepEqual(sink.points, [
    [59.330166, 53.633613],
    [65.586698, 52.685714],
    [67.011876, 52.746218],
    [78.356295, 55.085714],
    [78.228029, 55.327731],
    [71.971496, 56.235294],
    [71.102138, 56.215126],
    [65.258907, 55.226891],
    [59.2019, 53.87563],
  ]);
  assert.ok(result.every((hotspot) => !String(hotspot.clipPath).includes("NaN")));
});

test("AB 110510 offers cabinet and Blende choices for all three supplied panels", () => {
  const cabinets = [
    { code: "CAB-BASE-AB110510-DEFAULT-CORNER", componentKey: "base-module-2", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel" },
    { code: "CAB-BASE-AB110510-DEFAULT-SINK-RUN", componentKey: "base-module-3", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm" },
    { code: "CAB-WALL-AB110510-H6002-HPK2002", componentKey: "wall-cabinet-4", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm" },
  ].map((item) => ({
    ...item,
    itemType: "COMPONENT",
    name: "Cabinet",
    nameDe: "Schrank",
    isLocked: true,
    isActive: true,
  }));
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: cabinets },
    kitchenConfig: { components: cabinets },
    kitchenSlug: slug,
  });
  const groups = buildServiceClaimComponentChoiceGroups(selection.selectableComponents);

  for (const sourceComponentKey of ["base-module-2", "base-module-3", "wall-cabinet-4"]) {
    const group = groups.find((entry) => entry.sourceComponentKey === sourceComponentKey);
    assert.deepEqual(
      group?.options.map((option) => option.componentId),
      [`component-${sourceComponentKey}`, `component-claim-blende-${sourceComponentKey}`],
    );
  }

  const source = PLAN_HOTSPOTS_BY_SLUG[slug]
    .map(withBounds)
    .map((hotspot) => ({ ...hotspot, componentId: `component-${hotspot.componentKey}` }));
  const blenden = selection.selectableComponents.filter((item) => item.claimPartKey === "blende");
  const split = buildServiceClaimBlendeHotspots(source, blenden, cabinets, slug);
  const blendeBySource = split
    .filter((hotspot) => hotspot.claimPartKey === "blende")
    .reduce((result, hotspot) => ({
      ...result,
      [hotspot.sourceComponentKey]: [...(result[hotspot.sourceComponentKey] || []), hotspot],
    }), {});

  assert.equal(blendeBySource["base-module-2"]?.length, 2);
  assert.equal(blendeBySource["base-module-3"]?.length, 1);
  assert.equal(blendeBySource["wall-cabinet-4"]?.length, 2);
});
