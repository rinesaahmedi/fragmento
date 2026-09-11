import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLinkedComponentIds, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
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
import { buildServiceClaimSelectableComponents } from "../lib/service-claim-kitchen-plan-selection.js";

const slug = "ab-111539";
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

test("AB 111539 uses its vector plan and exact perspective hotspots", () => {
  const svg = readFileSync(new URL("../public/plans/AB 111539.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20111539.svg");
  assert.equal(hotspots.length, 28);
  assert.ok(hotspots.every((hotspot) => hotspot.points.length >= 4));
  assert.equal(keys.filter((key) => key === "worktop").length, 4);
  const [leftWorktop, rightWorktop] = hotspots.filter((hotspot) => hotspot.componentKey === "worktop");
  const worktopJoint = [57.847981, 53.028571];
  assert.ok(leftWorktop.points.some((point) => point[0] === worktopJoint[0] && point[1] === worktopJoint[1]));
  assert.ok(rightWorktop.points.some((point) => point[0] === worktopJoint[0] && point[1] === worktopJoint[1]));
  assert.ok(leftWorktop.points.some((point) => point[0] === 45.477435 && point[1] === 54.823529));
  assert.ok(rightWorktop.points.some((point) => point[0] === 45.477435 && point[1] === 54.823529));
  assert.equal(keys.filter((key) => key === "sink-base").length, 2);
  assert.equal(keys.filter((key) => key === "dishwasher-base").length, 1);
  assert.equal(keys.filter((key) => key === "base-module-1").length, 3);
  assert.equal(keys.filter((key) => key === "base-module-2").length, 2);
  assert.equal(keys.filter((key) => key === "under-cabinet-light").length, 2);
  assert.deepEqual(
    getLinkedComponentIds(slug, "component-wall-cabinet-3"),
    ["component-wall-cabinet-3", "component-extractor-hood"],
  );
  assert.equal(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug].length, 2);
});

test("AB 111539 matches the ten-row schedule and locks SP50, US40 and U30", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const block = seed.match(/const AB_111539_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-111539"[\s\S]*?kitchenCode: "111 539"[\s\S]*?items: AB_111539_ITEMS/);
  assert.match(block, /defaultOvenHob\(\{ catalogArticleNumber: "A-EH923640E \+ 9EC744100C"/);
  assert.match(seed, /articleNumber: "SP50"[^\n]+name: "Sink Lower Cabinet 50 cm"[^\n]+widthMm: 500/);
  assert.match(block, /SINK-BASE-AB111539-SP50[^\n]+widthMm: 500[^\n]+articleNumber: "SP50"[^\n]+catalogArticleNumber: "SP50"[^\n]+blendeCode: "UPK20"[^\n]+blendePrice: "0\.00"/);
  assert.match(block, /DISH-AB111539-450[^\n]+price: "450\.00"[^\n]+widthMm: 450[^\n]+A-EGSPV587915 \+ TGV45/);
  assert.match(block, /CAB-BASE-AB111539-US40-DEFAULT[^\n]+price: "183\.00"[^\n]+widthMm: 400[^\n]+isLocked: true[^\n]+articleNumber: "US40"[^\n]+blendeCode: "UPEF65"[^\n]+blendePrice: "0\.00"/);
  assert.match(block, /CAB-BASE-AB111539-U30-DEFAULT[^\n]+price: "0\.00"[^\n]+widthMm: 300[^\n]+isLocked: true[^\n]+articleNumber: "U30"[^\n]+useCatalogArticle: false[^\n]+blendeCode: "UPK20"[^\n]+blendePrice: "0\.00"/);
  assert.match(block, /CAB-WALL-AB111539-H6002-HPK2002[^\n]+price: "149\.00"[^\n]+articleNumber: "H6002"[^\n]+catalogArticleNumber: "H6002"[^\n]+blendeCode: "HPK2002"/);
  assert.match(block, /CAB-WALL-AB111539-H4002[^\n]+price: "130\.00"/);
  assert.match(block, /CAB-HOOD-AB111539-600[^\n]+price: "349\.00"/);
  assert.match(block, /CAB-WALL-AB111539-H3002-HPK2002[^\n]+price: "115\.00"[^\n]+articleNumber: "H3002"[^\n]+catalogArticleNumber: "H3002"[^\n]+blendeCode: "HPK2002"/);
  assert.doesNotMatch(block, /CAB-WALL-AB111539-(?:H6002|H3002)-HPK2002[^\n]+displayArticleNumber/);
});

test("AB 111539 maps all PDF callouts", () => {
  const expected = {
    "SINK-BASE-AB111539-SP50": "3",
    "DISH-AB111539-450": "4",
    "CAB-BASE-AB111539-US40-DEFAULT": "5",
    "CAB-BASE-AB111539-U30-DEFAULT": "6",
    "CAB-WALL-AB111539-H6002-HPK2002": "7",
    "CAB-WALL-AB111539-H4002": "8",
    "CAB-HOOD-AB111539-600": "9",
    "HOOD-AB111539-FH664621E": "9",
    "CAB-WALL-AB111539-H3002-HPK2002": "10",
  };
  for (const [code, number] of Object.entries(expected)) {
    assert.ok(getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true).startsWith(`${number}. `));
  }
});

test("AB 111539 exposes each default cabinet and every split fixture in ASC", () => {
  const items = [
    { itemType: "COMPONENT", code: "SINK-BASE-AB111539-SP50", name: "Sink Lower Cabinet 50 cm", articleNumber: "SP50", componentKey: "sink-base", widthMm: 500, isLocked: true, blendeCode: "UPK20", blendeLabel: "UPK20 Filler panel" },
    { itemType: "COMPONENT", code: "CAB-BASE-AB111539-US40-DEFAULT", name: "Lower Cabinet with Drawer 40 cm", articleNumber: "US40", componentKey: "base-module-1", widthMm: 400, isLocked: true, blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel" },
    { itemType: "COMPONENT", code: "CAB-BASE-AB111539-U30-DEFAULT", name: "Lower Cabinet 30 cm", articleNumber: "U30", componentKey: "base-module-2", widthMm: 300, isLocked: true, blendeCode: "UPK20", blendeLabel: "UPK20 Filler panel" },
    { itemType: "COMPONENT", code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", componentKey: "oven-module", isLocked: true },
    { itemType: "COMPONENT", code: "SINK-WORKTOP", name: "Sink and faucet", componentKey: "sink-faucet", isLocked: true },
    { itemType: "COMPONENT", code: "TOP-AB105806", name: "Worktop", componentKey: "worktop", isLocked: true },
  ];
  const claimParts = [
    { partKey: "sink", articleCode: "526335", sourceKitchenItemCode: "SINK-WORKTOP", sourceComponentKey: "sink-faucet" },
    { partKey: "sink-cabinet", articleCode: "SP50", sourceKitchenItemCode: "SINK-BASE-AB111539-SP50", sourceComponentKey: "sink-base" },
    { partKey: "faucet", articleCode: "517720", sourceKitchenItemCode: "SINK-WORKTOP", sourceComponentKey: "sink-faucet" },
    { partKey: "cabinet-base-module-2", articleCode: "U30", name: "Lower Cabinet 30 cm", sourceKitchenItemCode: "CAB-BASE-AB111539-U30-DEFAULT", sourceComponentKey: "base-module-2" },
    { partKey: "oven", articleCode: "A-EH923640E", sourceKitchenItemCode: "OVEN-B-600-HOB", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", articleCode: "UHK", sourceKitchenItemCode: "OVEN-B-600-HOB", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", articleCode: "9EC744100C", sourceKitchenItemCode: "OVEN-B-600-HOB", sourceComponentKey: "oven-module" },
    { partKey: "worktop-left", articleCode: "PLR60-1", sourceKitchenItemCode: "TOP-AB105806", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", articleCode: "PLR60-2", sourceKitchenItemCode: "TOP-AB105806", sourceComponentKey: "worktop" },
  ];
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items }, kitchenConfig: { components: items }, kitchenSlug: slug, claimParts,
  });
  const articleCodes = new Set(selection.selectableComponents.map((entry) => entry.articleCode));

  assert.equal(isLShapedClaimKitchen(slug), true);
  for (const code of ["SP50", "US40", "UPEF65", "U30", "526335", "517720", "A-EH923640E", "UHK", "9EC744100C", "PLR60-1", "PLR60-2"]) {
    assert.ok(articleCodes.has(code), `${code} should be independently claimable`);
  }
  const u30Claims = selection.selectableComponents.filter((entry) => entry.articleCode === "U30");
  assert.equal(u30Claims.length, 1);
  assert.equal(u30Claims[0].componentId, "component-base-module-2");
  assert.equal(u30Claims[0].claimPartKey, "cabinet-base-module-2");
  const us40Claims = selection.selectableComponents.filter((entry) => entry.articleCode === "US40");
  assert.equal(us40Claims.length, 1);
  assert.equal(us40Claims[0].componentId, "component-base-module-1");
  assert.equal(us40Claims[0].claimPartKey, undefined);
  assert.equal(
    PLAN_HOTSPOTS_BY_SLUG[slug].filter((hotspot) => hotspot.componentKey === "base-module-1").length,
    3,
    "the complete corner return and the US40 front must select one claim component",
  );
  const cornerFillerClaims = selection.selectableComponents.filter((entry) => entry.articleCode === "UPEF65");
  assert.equal(cornerFillerClaims.length, 1);
  assert.equal(cornerFillerClaims[0].componentId, "component-claim-blende-base-module-1");
  assert.equal(cornerFillerClaims[0].claimPartKey, "blende");
  assert.equal(cornerFillerClaims[0].isCompanionOption, true);
  assert.equal(cornerFillerClaims[0].isPlanSelectableCompanion, true);
  const regularFillerClaims = selection.selectableComponents.filter((entry) => entry.articleCode === "UPK20");
  assert.equal(regularFillerClaims.length, 2);
  assert.deepEqual(
    regularFillerClaims.map((entry) => entry.sourceComponentKey).sort(),
    ["base-module-2", "sink-base"],
  );
  const sinkFillerClaim = regularFillerClaims.find((entry) => entry.sourceComponentKey === "sink-base");
  assert.equal(sinkFillerClaim.isCompanionOption, undefined);
  assert.equal(sinkFillerClaim.isPlanSelectableCompanion, undefined);
  assert.equal(sinkFillerClaim.isStandaloneClaimOption, true);
  const u30FillerClaim = regularFillerClaims.find((entry) => entry.sourceComponentKey === "base-module-2");
  assert.equal(u30FillerClaim.isCompanionOption, true);
  assert.equal(u30FillerClaim.isPlanSelectableCompanion, true);
  assert.equal(u30FillerClaim.isStandaloneClaimOption, undefined);

  const splitCabinetHotspots = buildServiceClaimBlendeHotspots(
    PLAN_HOTSPOTS_BY_SLUG[slug].map(withBounds),
    [cornerFillerClaims[0], ...regularFillerClaims],
    items,
    slug,
  );
  assert.equal(
    splitCabinetHotspots.filter((hotspot) => hotspot.componentId === "component-claim-blende-base-module-1").length,
    2,
  );
  assert.equal(
    splitCabinetHotspots.filter((hotspot) => hotspot.componentKey === "base-module-1").length,
    1,
  );
  for (const filler of regularFillerClaims) {
    assert.ok(
      splitCabinetHotspots.some((hotspot) => hotspot.componentId === filler.componentId),
      `${filler.sourceComponentKey} must expose its UPK20 as a separate plan target`,
    );
  }

  const hotspots = buildServiceClaimPartHotspots(PLAN_HOTSPOTS_BY_SLUG[slug].map(withBounds), claimParts, slug);
  assert.deepEqual(
    hotspots.filter((hotspot) => hotspot.claimPartKey?.startsWith("worktop-"))
      .map((hotspot) => hotspot.claimPartKey),
    ["worktop-left", "worktop-right", "worktop-left", "worktop-right"],
  );
  assert.equal(hotspots.filter((hotspot) => hotspot.claimPartKey === "sink").length, 1);
  assert.equal(hotspots.filter((hotspot) => hotspot.claimPartKey === "faucet").length, 2);
  assert.equal(hotspots.filter((hotspot) => hotspot.claimPartKey === "cooktop").length, 1);
  assert.equal(hotspots.filter((hotspot) => hotspot.claimPartKey === "oven").length, 1);
  assert.equal(hotspots.filter((hotspot) => hotspot.claimPartKey === "oven-drawer").length, 1);
  assert.equal(hotspots.filter((hotspot) => hotspot.claimPartKey === "cabinet-base-module-2").length, 2);
  assert.ok(hotspots.every((hotspot) => !String(hotspot.clipPath).includes("NaN")));
});
