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
} from "../lib/kitchen-plan-preview-data.js";
import {
  buildServiceClaimBlendeHotspots,
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "../lib/service-claim-kitchen-hotspots.js";
import { buildServiceClaimSelectableComponents } from "../lib/service-claim-kitchen-plan-selection.js";
import { buildServiceClaimComponentChoiceGroups } from "../lib/service-claim-component-choices.js";

const slug = "ab-110140";
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

test("AB 110140 uses its sharp vector plan and exact perspective faces", () => {
  const svg = readFileSync(new URL("../public/plans/AB 110140.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20110140.svg");
  assert.equal(hotspots.length, 23);
  assert.ok(hotspots.every((hotspot) => hotspot.points.length >= 4));
  assert.equal(keys.filter((key) => key.startsWith("wall-cabinet-")).length, 9);
  assert.equal(keys.filter((key) => key === "refrigerator").length, 3);
  assert.equal(keys.filter((key) => key === "sink-base").length, 1);
  assert.equal(keys.filter((key) => key === "base-module-2").length, 2);
  assert.equal(keys.filter((key) => key === "base-module-3").length, 2);
  assert.ok(keys.includes("oven-module"));
  assert.ok(keys.includes("sink-faucet"));
  assert.ok(keys.includes("extractor-hood"));
});

test("AB 110140 FRG extractor selection includes the fascia and bounded right side", () => {
  const stage = readFileSync(new URL("../components/kitchen-svg-stage.jsx", import.meta.url), "utf8");

  assert.match(
    stage,
    /componentKey: "extractor-hood", points: \[\[70\.959620, 43\.206723\], \[76\.118765, 44\.255462\], \[70\.959620, 44\.900840\]\]/,
  );
  assert.match(
    stage,
    /componentKey: "extractor-hood", points: \[\[61\.695962, 41\.290756\], \[70\.959620, 43\.206723\], \[70\.959620, 44\.900840\], \[61\.695962, 42\.984874\]\]/,
  );
});

test("AB 110140 schedule preserves six DEFAULT rows and all priced articles", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const block = seed.match(/const AB_110140_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-110140"[\s\S]*?kitchenCode: "110 140"[\s\S]*?items: AB_110140_ITEMS/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "670"\)/);
  assert.equal((block.match(/defaultOvenHob|defaultWorktop|defaultSinkBase|isLocked: true/g) || []).length, 6);
  for (const [code, price] of [
    ["REF-AB110140-KGCN388140E", "579.00"],
    ["CAB-WALL-AB110140-H6002", "149.00"],
    ["CAB-HOOD-AB110140-600", "349.00"],
    ["CAB-WALL-AB110140-H5002", "135.00"],
  ]) {
    const line = block.split(/\r?\n/).find((entry) => entry.includes(`code: "${code}"`));
    assert.ok(line?.includes(`price: "${price}"`), `${code} should cost ${price}`);
  }
  assert.match(block, /code: "REF-AB110140-KGCN388140E"[^\n]+articleNumber: "OL-KGCN388140E"/);
  assert.match(block, /code: "SINK-BASE-AB110140-DEFAULT"[\s\S]*?widthMm: 1100[\s\S]*?articleNumber: "SPEB110"/);
  assert.match(block, /code: "CAB-BASE-AB110140-DEFAULT-SINK-RUN"[^\n]+name: "Lower Cabinet 45 cm"[^\n]+widthMm: 450[^\n]+componentKey: "base-module-1"[^\n]+articleNumber: "U45"/);
  assert.match(block, /code: "CAB-BASE-AB110140-DEFAULT-LEFT"[^\n]+name: "Lower Cabinet with Drawer 60 cm"[^\n]+widthMm: 600[^\n]+componentKey: "base-module-2"[^\n]+articleNumber: "US60"[^\n]+blendeCode: "UPEF65"[^\n]+blendePrice: blendePrice\("UPEF65", 1\)/);
  assert.match(block, /code: "CAB-BASE-AB110140-DEFAULT-RIGHT"[^\n]+name: "Lower Cabinet 50 cm"[^\n]+widthMm: 500[^\n]+componentKey: "base-module-3"[^\n]+articleNumber: "U50"/);
  assert.match(block, /code: "CAB-WALL-AB110140-H6002-HPK2002"[^\n]+price: articlePriceWithBlende\("H6002", "HPK2002", 1\)[^\n]+articleNumber: "H6002"[^\n]+catalogArticleNumber: "H6002"[^\n]+blendeCode: "HPK2002"[^\n]+blendePrice: blendePrice\("HPK2002", 1\)/);
  assert.doesNotMatch(block, /CAB-WALL-AB110140-H6002-HPK2002[^\n]+displayArticleNumber/);
  assert.doesNotMatch(block, /A-EGSPV597210|TGV60|DISH-AB110140/);
});

test("AB 110140 exposes SPEB110, U45, US60, and U50 in ASC", () => {
  const items = [
    { itemType: "COMPONENT", code: "SINK-BASE-AB110140-DEFAULT", name: "Sink Lower Cabinet", articleNumber: "SPEB110", componentKey: "sink-base", widthMm: 1100, isLocked: true },
    { itemType: "COMPONENT", code: "CAB-BASE-AB110140-DEFAULT-SINK-RUN", name: "Lower Cabinet 45 cm", articleNumber: "U45", componentKey: "base-module-1", widthMm: 450, isLocked: true },
    { itemType: "COMPONENT", code: "CAB-BASE-AB110140-DEFAULT-LEFT", name: "Lower Cabinet with Drawer 60 cm", articleNumber: "US60", componentKey: "base-module-2", widthMm: 600, isLocked: true, blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", catalogBlende: { code: "UPEF65", name: "Corner filler panel for Lower cabinet", nameDe: "Eckpassblende Unterschrank" } },
    { itemType: "COMPONENT", code: "CAB-BASE-AB110140-DEFAULT-RIGHT", name: "Lower Cabinet 50 cm", articleNumber: "U50", componentKey: "base-module-3", widthMm: 500, isLocked: true },
  ];
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items },
    kitchenConfig: { components: items },
    kitchenSlug: slug,
    claimParts: [{
      partKey: "sink-cabinet",
      name: "Sink Lower Cabinet",
      articleCode: "SPEB110",
      sourceKitchenItemCode: "SINK-BASE-AB110140-DEFAULT",
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
  assert.equal(articleBySourceKey["sink-base"], "SPEB110");
  assert.equal(articleBySourceKey["base-module-1"], "U45");
  assert.equal(articleBySourceKey["base-module-2"], "US60");
  assert.equal(articleBySourceKey["base-module-3"], "U50");
});

test("AB 110140 maps schedule callouts and links the complete hood package", () => {
  const expectedByCode = {
    "SINK-BASE-AB110140-DEFAULT": "3",
    "REF-AB110140-KGCN388140E": "4",
    "CAB-BASE-AB110140-DEFAULT-SINK-RUN": "5",
    "CAB-BASE-AB110140-DEFAULT-LEFT": "6",
    "CAB-BASE-AB110140-DEFAULT-RIGHT": "7",
    "CAB-WALL-AB110140-H6002-HPK2002": "8",
    "CAB-WALL-AB110140-H6002": "9",
    "CAB-HOOD-AB110140-600": "10",
    "CAB-WALL-AB110140-H5002": "11",
  };

  for (const [code, expected] of Object.entries(expectedByCode)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${expected}. `), `${code} should use callout ${expected}`);
  }
  assert.deepEqual(
    getLinkedComponentIds(slug, "component-wall-cabinet-3"),
    ["component-wall-cabinet-3", "component-extractor-hood"],
  );
});

test("AB 110140 service claims use measured sink, cooktop, and worktop seams", () => {
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
    result.filter((hotspot) => hotspot.claimPartKey?.startsWith("worktop-")).map((hotspot) => hotspot.claimPartKey),
    ["worktop-left", "worktop-right"],
  );
  const sink = result.find((hotspot) => hotspot.claimPartKey === "sink");
  const cooktop = result.find((hotspot) => hotspot.claimPartKey === "cooktop");
  assert.ok(Math.abs(sink.left - 31.140143) < 0.000001);
  assert.ok(Math.abs(sink.top - 53.754622) < 0.000001);
  assert.ok(Math.abs(cooktop.left - 57.178147) < 0.000001);
  assert.ok(Math.abs(cooktop.top - 56.678992) < 0.000001);
  const [leftWorktop, rightWorktop] = result.filter(
    (hotspot) => hotspot.claimPartKey?.startsWith("worktop-"),
  );
  const absoluteClipPoints = (hotspot) => [...hotspot.clipPath.matchAll(
    /([\d.-]+)%\s+([\d.-]+)%/g,
  )].map((match) => [
    hotspot.left + (Number(match[1]) / 100) * hotspot.width,
    hotspot.top + (Number(match[2]) / 100) * hotspot.height,
  ]);
  const leftPoints = absoluteClipPoints(leftWorktop);
  const rightPoints = absoluteClipPoints(rightWorktop);
  const includesPoint = (points, expectedX, expectedY) => points.some(([x, y]) => (
    Math.abs(x - expectedX) < 0.000001 && Math.abs(y - expectedY) < 0.000001
  ));

  assert.equal(includesPoint(leftPoints, 57.904988, 54.581513), true);
  assert.equal(includesPoint(rightPoints, 57.904988, 54.581513), true);
  assert.equal(includesPoint(rightPoints, 48.627078, 52.685714), false);
  assert.ok(result.every((hotspot) => !String(hotspot.clipPath).includes("NaN")));
});

test("AB 110140 assigns the inside-corner Blende to the cabinet on its right", () => {
  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];
  const cornerPoints = [
    [45.933492, 57.647059],
    [47.629454, 57.828571],
    [47.629454, 87.475630],
    [45.933492, 87.334454],
  ];
  const cornerFace = hotspots.find((hotspot) =>
    JSON.stringify(hotspot.points) === JSON.stringify(cornerPoints),
  );

  assert.equal(cornerFace?.componentKey, "base-module-2");
});

test("AB 110140 offers cabinet and corner Blende choices from their shared claim area", () => {
  const cabinet = {
    itemType: "COMPONENT",
    code: "CAB-BASE-AB110140-DEFAULT-LEFT",
    componentKey: "base-module-2",
    name: "Lower Cabinet with Drawer 60 cm",
    nameDe: "Unterschrank mit Schublade 60 cm",
    articleNumber: "US60",
    blendeCode: "UPEF65",
    blendeLabel: "UPEF65 Corner filler panel",
    catalogBlende: {
      code: "UPEF65",
      name: "Corner filler panel for Lower cabinet",
      nameDe: "Eckpassblende Unterschrank",
    },
    widthMm: 600,
    isLocked: true,
    isActive: true,
  };
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [cabinet] },
    kitchenConfig: { components: [cabinet] },
    kitchenSlug: slug,
  });
  const blende = selection.selectableComponents.find(
    (entry) => entry.componentId === "component-claim-blende-base-module-2",
  );
  const group = buildServiceClaimComponentChoiceGroups(selection.selectableComponents)
    .find((entry) => entry.sourceComponentKey === "base-module-2");

  assert.equal(blende?.articleCode, "UPEF65");
  assert.equal(blende?.name, "Corner filler panel for Lower cabinet");
  assert.equal(blende?.nameDe, "Eckpassblende Unterschrank");
  assert.equal(blende?.isCompanionOption, true);
  assert.equal(blende?.isPlanSelectableCompanion, true);
  assert.deepEqual(
    group?.options.map((option) => option.componentId),
    ["component-base-module-2", "component-claim-blende-base-module-2"],
  );

  const source = PLAN_HOTSPOTS_BY_SLUG[slug]
    .map(withBounds)
    .map((hotspot) => ({ ...hotspot, componentId: `component-${hotspot.componentKey}` }));
  const split = buildServiceClaimBlendeHotspots(
    source,
    [blende],
    [cabinet],
    slug,
  );
  const corner = split.find((hotspot) => hotspot.claimPartKey === "blende");
  const cabinetFace = split.find((hotspot) =>
    hotspot.componentId === "component-base-module-2" && hotspot.width > 8,
  );

  assert.ok(Math.abs(corner.left - 45.933492) < 0.000001);
  assert.ok(Math.abs(corner.width - 1.695962) < 0.000001);
  assert.ok(cabinetFace);
});
