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
  PLAN_IMAGE_SOURCE_SIZE_BY_SLUG,
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG,
} from "../lib/kitchen-plan-preview-data.js";
import {
  getTwoPartMobilePlanCrop,
  getTwoPartMobilePlanLayout,
  shiftTwoPartPlanGeometry,
} from "../lib/two-part-mobile-plan-layout.js";

const translate = (_key, fallback) => fallback;
const AB_105845_LAYOUT_CLONES = ["ab-105848", "ab-105851", "ab-105854", "ab-105857", "ab-105860"];
const AB_105847_LAYOUT_CLONES = ["ab-105850", "ab-105853", "ab-105856", "ab-105859", "ab-105862"];

test("two-part kitchen families close their center gap and grow only in the mobile layout", () => {
  const layout845 = getTwoPartMobilePlanLayout("ab-105845");
  const right845 = PLAN_HOTSPOTS_BY_SLUG["ab-105845"].find(
    (hotspot) => hotspot.componentKey === "wall-cabinet-5",
  );
  const shifted845 = shiftTwoPartPlanGeometry(right845, layout845);
  assert.equal(shifted845.left, right845.left - 12);
  assert.equal(getTwoPartMobilePlanCrop({ left: 0, right: 100, width: 100 }, layout845).width, 88);

  const layout847 = getTwoPartMobilePlanLayout("ab-105847");
  const right847 = PLAN_HOTSPOTS_BY_SLUG["ab-105847"].find(
    (hotspot) => hotspot.componentKey === "wall-cabinet-5",
  );
  const shifted847 = shiftTwoPartPlanGeometry(right847, layout847);
  assert.equal(shifted847.left, right847.left - 8.5);
  assert.ok(shifted847.left - 39.65 < right847.left - 39.65);

  for (const slug of [...AB_105845_LAYOUT_CLONES, ...AB_105847_LAYOUT_CLONES]) {
    assert.ok(getTwoPartMobilePlanLayout(slug), `${slug} should inherit compact mobile spacing`);
  }
  assert.equal(getTwoPartMobilePlanLayout("ab-105846"), null);
});

test("AB 105845 and AB 105847 layout families display Side A and Side B labels", () => {
  const stage = readFileSync(new URL("../components/kitchen-svg-stage.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../components/kitchen-configurator.module.css", import.meta.url), "utf8");
  const labelSlugBlock = stage.match(/const SPLIT_SIDE_LABEL_SLUGS = new Set\(\[([\s\S]*?)\]\);/)?.[1] || "";
  for (const slug of [
    "ab-105845",
    ...AB_105845_LAYOUT_CLONES,
    "ab-105847",
    ...AB_105847_LAYOUT_CLONES,
  ]) {
    assert.match(labelSlugBlock, new RegExp(`"${slug}"`));
  }
  assert.match(stage, /configurator\.splitKitchenSideA/);
  assert.match(stage, /configurator\.splitKitchenSideB/);
  assert.match(stage, /styles\.planSideLabelTwoPart/);
  assert.match(styles, /\.planSideLabelTwoPart\s*\{[\s\S]*?transform:\s*none/);
});

test("AB 105845 keeps the source geometry while rendering dark, legible linework", () => {
  const svg = readFileSync(
    new URL("../public/plans/AB 105845.svg", import.meta.url),
    "utf8",
  );

  assert.match(svg, /width="800" height="600" viewBox="0 0 800 600"/);
  assert.match(svg, /stroke="#303030"/);
  assert.match(svg, /stroke-width="0\.48"/);
  assert.doesNotMatch(svg, /stroke="#f0f0f0"/i);
});

test("AB 105845 uses the official two-elevation plan with every scheduled face", () => {
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105845"];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.equal(PLAN_IMAGE_BY_SLUG["ab-105845"], "/plans/AB%20105845.svg");
  assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG["ab-105845"], {
    width: 800,
    height: 600,
  });
  assert.equal(keys.filter((key) => key.startsWith("wall-cabinet-")).length, 8);
  assert.equal(keys.filter((key) => key === "worktop").length, 2);
  assert.ok(keys.includes("refrigerator"));
  assert.ok(keys.includes("oven-module"));
  assert.ok(keys.includes("sink-base"));
  assert.ok(keys.includes("sink-faucet"));
  assert.ok(keys.includes("dishwasher-base"));
  assert.ok(keys.includes("extractor-hood"));

  const narrowLeftWall = hotspots.find((hotspot) => hotspot.componentKey === "wall-cabinet-2");
  const dishwasher = hotspots.find((hotspot) => hotspot.componentKey === "dishwasher-base");
  const farRightDrawer = hotspots.find((hotspot) => hotspot.componentKey === "drawer-module");
  assert.ok(Math.abs(narrowLeftWall.width - 5.04125) < 0.00001);
  assert.ok(Math.abs(dishwasher.width - 7.56125) < 0.00001);
  assert.ok(Math.abs(farRightDrawer.left - 94.08875) < 0.00001);
  assert.ok(Math.abs(farRightDrawer.left + farRightDrawer.width - 99.7175) < 0.00001);
});

test("AB 105845 dishwasher internals remain light grey above selection fills", () => {
  const styles = readFileSync(
    new URL("../components/kitchen-configurator.module.css", import.meta.url),
    "utf8",
  );
  const stage = readFileSync(
    new URL("../components/kitchen-svg-stage.jsx", import.meta.url),
    "utf8",
  );

  assert.deepEqual(
    PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105845"].map((detail) => detail.key),
    ["dishwasher-basket", "dishwasher-gs-mark"],
  );
  assert.ok(
    PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105845"].every(
      (detail) => detail.componentKey === "dishwasher-base",
    ),
  );
  assert.match(styles, /\.planPersistentLightDetail\s*\{[^}]*invert\(92%\)/s);
  assert.doesNotMatch(styles, /\.planPersistentLightDetail\s*\{[^}]*mix-blend-mode/s);
  assert.match(stage, /if \(isDetailComponentSelected && !detail\.persistWhenSelected\) return null/);
});

test("AB 105845 30 cm lower cabinet has a visible width-scaled catalog icon", () => {
  const catalogPanel = readFileSync(
    new URL("../components/kitchen-catalog-panel.jsx", import.meta.url),
    "utf8",
  );

  assert.match(catalogPanel, /ICON_MARKUP\.base_cabinet_30 = ICON_MARKUP\.drawer_base_two/);
  assert.match(catalogPanel, /WIDTH_SCALED_CABINET_ICON_KEYS = new Set\(\[\s*"base_cabinet_30"/);
});

test("AB 105845 schedule codes expose callouts 3 through 18", () => {
  const expectedByCode = {
    "SINK-BASE-AB105845-600": "3",
    "REF-AB105845-KGCN388140E": "4",
    "CAB-BASE-AB105845-US60-1": "5",
    "CAB-BASE-AB105845-US30-1": "6",
    "CAB-BASE-AB105845-US60-2": "7",
    "CAB-BASE-AB105845-US60-3": "8",
    "DISH-AB105845-450": "9",
    "CAB-BASE-AB105845-US30-2": "10",
    "CAB-WALL-AB105845-H6002-1": "11",
    "CAB-WALL-AB105845-H3002-1": "12",
    "CAB-HOOD-AB105845-600": "13",
    "CAB-WALL-AB105845-H6002-2": "14",
    "CAB-WALL-AB105845-H6002-3": "15",
    "CAB-WALL-AB105845-H6002-4": "16",
    "CAB-WALL-AB105845-H4502": "17",
    "CAB-WALL-AB105845-H3002-2": "18",
  };

  for (const [code, expected] of Object.entries(expectedByCode)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${expected}. `), `${code} should use callout ${expected}`);
  }
});

test("AB 105845 callout 16 upper cabinet has no filler panel", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const itemLine = seed
    .split(/\r?\n/)
    .find((line) => line.includes('code: "CAB-WALL-AB105845-H6002-4"'));

  assert.ok(itemLine);
  assert.match(itemLine, /price: articlePrice\("H6002"\)/);
  assert.doesNotMatch(itemLine, /blendeCode|HPK2002|articlePriceWithBlende/);
});

test("AB 105845 flat hood cabinet and extractor select as one package", () => {
  assert.deepEqual(
    getLinkedComponentIds("ab-105845", "component-wall-cabinet-3"),
    ["component-wall-cabinet-3", "component-extractor-hood"],
  );
});

test("AB 105845 layout clones reuse the complete plan and interaction model", () => {
  for (const slug of AB_105845_LAYOUT_CLONES) {
    assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20105845.svg");
    assert.strictEqual(PLAN_HOTSPOTS_BY_SLUG[slug], PLAN_HOTSPOTS_BY_SLUG["ab-105845"]);
    assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[slug], { width: 800, height: 600 });
    assert.strictEqual(
      PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug],
      PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105845"],
    );
    assert.deepEqual(
      getLinkedComponentIds(slug, "component-wall-cabinet-3"),
      ["component-wall-cabinet-3", "component-extractor-hood"],
    );
  }
});

test("AB 105845 layout clones seed distinct kitchens and automatic 670/111 contracts", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");

  for (const code of ["105848", "105851", "105854", "105857", "105860"]) {
    assert.match(seed, new RegExp(`slug: "ab-${code}"[\\s\\S]*?kitchenCode: "${code.slice(0, 3)} ${code.slice(3)}"[\\s\\S]*?items: AB_105845_ITEMS`));
  }
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "670"\)/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "111"\)/);
});

test("AB 105847 uses its supplied 800 by 600 plan and maps all 18 callouts", () => {
  const svg = readFileSync(
    new URL("../public/plans/AB 105847.svg", import.meta.url),
    "utf8",
  );
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105847"];
  assert.match(svg, /stroke-width="0\.48"/);
  assert.doesNotMatch(svg, /stroke-width="\.074"/);
  assert.equal(PLAN_IMAGE_BY_SLUG["ab-105847"], "/plans/AB%20105847.svg");
  assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG["ab-105847"], { width: 800, height: 600 });
  assert.equal(hotspots.length, 20);
  assert.equal(hotspots.filter((hotspot) => hotspot.componentKey.startsWith("wall-cabinet-")).length, 8);
  assert.equal(hotspots.filter((hotspot) => hotspot.componentKey === "worktop").length, 2);
  assert.ok(hotspots.some((hotspot) => hotspot.componentKey === "base-module-5"));
  const faucet = hotspots.find((hotspot) => hotspot.componentKey === "sink-faucet");
  assert.deepEqual(
    { left: faucet.left, top: faucet.top, width: faucet.width, height: faucet.height },
    { left: 59.25, top: 51.65, width: 0.65, height: 2.55 },
  );
  assert.ok(hotspots.filter((hotspot) => hotspot.componentKey.startsWith("wall-cabinet-") && hotspot.componentKey !== "wall-cabinet-2").every((hotspot) => hotspot.height === 8.72));
  const hood = hotspots.find((hotspot) => hotspot.componentKey === "wall-cabinet-2");
  assert.deepEqual(
    { left: hood.left, top: hood.top, width: hood.width, height: hood.height },
    { left: 20.6075, top: 38.54333, width: 5.4275, height: 10.75667 },
  );
  assert.deepEqual(
    PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105847"].map((detail) => detail.componentKey),
    ["base-module-5", "base-module-5"],
  );
});

test("AB 105847 keeps the hood package linked and seeds automatic contracts", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  assert.deepEqual(
    getLinkedComponentIds("ab-105847", "component-wall-cabinet-2"),
    ["component-wall-cabinet-2", "component-extractor-hood"],
  );
  assert.match(seed, /slug: "ab-105847"[\s\S]*?kitchenCode: "105 847"[\s\S]*?items: AB_105847_ITEMS/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "670"\)/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "111"\)/);
  assert.match(seed, /DISH-AB105847-450[\s\S]*?price: "0\.00"[\s\S]*?A-EGSPV597210 \+ TGV60/);
  for (const code of [
    "CAB-BASE-AB105847-US60-1",
    "CAB-BASE-AB105847-US30-2",
    "CAB-BASE-AB105847-US60-3",
    "CAB-WALL-AB105847-H6002-1",
    "CAB-WALL-AB105847-H3002-2",
    "CAB-WALL-AB105847-H6002-4",
  ]) {
    const line = seed.split(/\r?\n/).find((entry) => entry.includes(`code: "${code}"`));
    assert.ok(line?.includes("blendeCode"), `${code} should link its schedule filler panel`);
  }
  const noFillerLine = seed.split(/\r?\n/).find((entry) => entry.includes('code: "CAB-BASE-AB105847-US30-1"'));
  assert.ok(noFillerLine);
  assert.doesNotMatch(noFillerLine, /blendeCode|UPK20/);
  const noWallFillerLine = seed.split(/\r?\n/).find((entry) => entry.includes('code: "CAB-WALL-AB105847-H3002-1"'));
  assert.ok(noWallFillerLine);
  assert.doesNotMatch(noWallFillerLine, /blendeCode|HPK2002/);
});

test("AB 105862 basket matches the green selection tint like AB 105825", () => {
  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105862"];

  assert.deepEqual(details.map((detail) => detail.key), [
    "dishwasher-basket",
    "dishwasher-gs-mark",
  ]);
  assert.equal(details.find((detail) => detail.key === "dishwasher-basket")?.persistWhenSelected, true);
  assert.equal(details.find((detail) => detail.key === "dishwasher-gs-mark")?.persistWhenSelected, undefined);
});

test("AB 105847 layout clones reuse its complete plan, selection model, and contracts", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");

  for (const slug of AB_105847_LAYOUT_CLONES) {
    const code = slug.slice(3);
    assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20105847.svg");
    assert.strictEqual(PLAN_HOTSPOTS_BY_SLUG[slug], PLAN_HOTSPOTS_BY_SLUG["ab-105847"]);
    assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[slug], { width: 800, height: 600 });
    assert.deepEqual(
      getLinkedComponentIds(slug, "component-wall-cabinet-2"),
      ["component-wall-cabinet-2", "component-extractor-hood"],
    );
    assert.match(
      seed,
      new RegExp(`slug: "${slug}"[\\s\\S]*?kitchenCode: "${code.slice(0, 3)} ${code.slice(3)}"[\\s\\S]*?items: AB_105847_ITEMS`),
    );
  }
});
