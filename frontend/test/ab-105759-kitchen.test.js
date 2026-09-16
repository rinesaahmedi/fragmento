import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import {
  getLinkedComponentIds,
  getLocalizedItemName,
} from "../components/kitchen-selection-utils.js";
import {
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG,
} from "../lib/kitchen-plan-preview-data.js";
import { buildServiceClaimPartHotspots } from "../lib/service-claim-kitchen-hotspots.js";

const translate = (_key, fallback) => fallback;

test("AB 105759 uses the supplied vector plan and pixel-measured selection faces", () => {
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105759"];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.equal(PLAN_IMAGE_BY_SLUG["ab-105759"], "/plans/AB%20105759.svg");
  assert.ok(existsSync(new URL("../public/plans/AB 105759.svg", import.meta.url)));
  assert.equal(keys.filter((key) => key.startsWith("wall-cabinet-")).length, 6);
  assert.equal(keys.filter((key) => key === "worktop").length, 3);
  assert.ok(keys.includes("refrigerator"));
  assert.ok(keys.includes("oven-module"));
  assert.ok(keys.includes("sink-base"));
  assert.ok(keys.includes("sink-faucet"));
  assert.ok(keys.includes("base-module-3"));
  assert.ok(keys.includes("extractor-hood"));

  const finalWall = hotspots.find((hotspot) => hotspot.componentKey === "wall-cabinet-6");
  const finalBase = hotspots.find((hotspot) => hotspot.componentKey === "drawer-module");
  const dishwasher = hotspots.find((hotspot) => hotspot.componentKey === "base-module-3");
  const fixedPanel = hotspots.find((hotspot) => (
    hotspot.componentKey === "worktop" && Math.abs(hotspot.left - 76.318039) < 0.000001
  ));
  assert.ok(Math.abs(finalWall.left + finalWall.width - 99.02) < 0.00001);
  assert.ok(Math.abs(finalBase.left + finalBase.width - 99.002565) < 0.00001);
  assert.ok(fixedPanel?.separateLockedSidePanel);
  assert.ok(Math.abs(dishwasher.left + dishwasher.width - fixedPanel.left) < 0.000001);
  assert.ok(Math.abs(fixedPanel.left + fixedPanel.width - finalBase.left) < 0.000001);
});

test("AB 105759 dishwasher technical details stay light above plan fills", () => {
  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105759"];

  assert.deepEqual(details.map((detail) => detail.key), [
    "dishwasher-basket",
    "dishwasher-gs-mark",
  ]);
  assert.ok(details.every((detail) => detail.componentKey === "base-module-3"));
  assert.ok(details.every((detail) => detail.persistWhenSelected));
});

test("AB 105759 schedule codes expose callouts 1 through 14", () => {
  const expectedByCode = {
    "OVEN-B-600-HOB": "1",
    "TOP-AB105759": "2",
    "SINK-BASE-AB105759-SP60": "3",
    "REF-AB105759-KGCN388140E": "4",
    "CAB-BASE-AB105759-US40": "5",
    "CAB-BASE-AB105759-US30": "6",
    "DISH-AB105759-600": "7",
    "CAB-BASE-AB105759-US90-UPK20": "8",
    "CAB-WALL-AB105759-H4002": "9",
    "CAB-HOOD-AB105759-600": "10",
    "CAB-WALL-AB105759-H3002": "11",
    "CAB-WALL-AB105759-H6002-1": "12",
    "CAB-WALL-AB105759-H6002-2": "13",
    "CAB-WALL-AB105759-H9002-HPK2002": "14",
  };

  for (const [code, expected] of Object.entries(expectedByCode)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${expected}. `), `${code} should use callout ${expected}`);
  }
});

test("AB 105759 hood cabinet and extractor select as one catalog package", () => {
  assert.deepEqual(
    getLinkedComponentIds("ab-105759", "component-wall-cabinet-2"),
    ["component-wall-cabinet-2", "component-extractor-hood"],
  );
});

test("AB 105759 uses the concise oven package name even when catalog linked", () => {
  const item = {
    code: "OVEN-B-600-HOB",
    articleNumber: "EH92364E-A + 9EC744100C + UHK",
    catalogArticleId: "catalog-oven-105759",
    name: "Built-in Oven / Ceramic Cooktop 60 cm / Lower Cabinet for Built-in Oven",
  };

  assert.equal(
    getLocalizedItemName(item, translate, "en", false),
    "Built-in oven and ceramic cooktop",
  );
  assert.equal(
    getLocalizedItemName(item, translate, "de", false),
    "Einbauherd und Glaskeramikkochfeld",
  );
  assert.equal(
    getLocalizedItemName(item, translate, "en", true),
    "1. Built-in oven and ceramic cooktop",
  );
  const english = JSON.parse(readFileSync(new URL("../locales/public.en.json", import.meta.url), "utf8"));
  const german = JSON.parse(readFileSync(new URL("../locales/public.de.json", import.meta.url), "utf8"));
  assert.equal(english.configurator.itemNameOvenCeramicHob, "Built-in oven and ceramic cooktop");
  assert.equal(german.configurator.itemNameOvenCeramicHob, "Einbauherd und Glaskeramikkochfeld");
});

test("AB 105759 US90 catalog icon shows both 45 cm cabinet fronts", () => {
  const catalogPanel = readFileSync(
    new URL("../components/kitchen-catalog-panel.jsx", import.meta.url),
    "utf8",
  );

  assert.match(
    catalogPanel,
    /LOWER_CABINET_DOUBLE_FRONT_MARKUP[\s\S]*?viewBox="0 0 90 82"[\s\S]*?x1="45" y1="2\.5"[\s\S]*?x1="39"[\s\S]*?x1="51"/,
  );
  assert.match(catalogPanel, /DOUBLE_FRONT_LOWER_CABINET_ARTICLES = new Set\(\["US90"\]\)/);
  assert.match(
    catalogPanel,
    /DOUBLE_FRONT_LOWER_CABINET_ARTICLES\.has\(articleNumber\)[\s\S]*?iconKey\.startsWith\("drawer_base"\)/,
  );
});

test("US2A90 uses two three-drawer columns in the card and variant options", () => {
  const source = readFileSync(new URL("../components/kitchen-catalog-panel.jsx", import.meta.url), "utf8");
  const artwork = source.slice(source.indexOf("const DISHWASHER_BASE_MARKUP"), source.indexOf("const TOOLTIP_PREVIEW_BY_CODE"));
  const renderer = source.slice(source.indexOf("function getCatalogIconMarkup("), source.indexOf("function localizeProductInfoDocumentLabel("));
  const render = runInNewContext(`${artwork}\n${renderer}\ngetCatalogIconMarkup;`);
  const upgraded = render({ articleNumber: "US2A90", iconKey: "drawer_base_three" }, true);
  assert.match(upgraded, /preserveAspectRatio="none"/);
  assert.match(upgraded, /x1="45" y1="2\.5" x2="45" y2="71\.5"/);
  for (const y of [9, 30, 58]) {
    assert.ok(upgraded.includes(`x1="14" y1="${y}" x2="31"`));
    assert.ok(upgraded.includes(`x1="59" y1="${y}" x2="76"`));
  }
  assert.doesNotMatch(render({ articleNumber: "US2A60", iconKey: "drawer_base_three" }, false), /x1="45"/);
  assert.match(render({ articleNumber: "US90", iconKey: "drawer_base_two" }, false), /x1="45"/);
  assert.match(source, /getCatalogIconMarkup\(\{ \.\.\.item, articleNumber: noAuszugOption\.articleNumber/);
  assert.match(source, /getCatalogIconMarkup\(\{ \.\.\.item, articleNumber: yesAuszugOption\.articleNumber/);
});

test("AB 105759 UHK highlight starts at the measured drawer seam", () => {
  const oven = PLAN_HOTSPOTS_BY_SLUG["ab-105759"]
    .find((hotspot) => hotspot.componentKey === "oven-module");
  const claimParts = [
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
  ];
  const hotspots = buildServiceClaimPartHotspots([oven], claimParts, "ab-105759");
  const drawer = hotspots.find((hotspot) => hotspot.claimPartKey === "oven-drawer");
  const expectedRatio = (2040 - 1554) / (2160 - 1554);

  assert.ok(drawer);
  assert.ok(Math.abs(drawer.top - (oven.top + oven.height * expectedRatio)) < 0.00001);
  assert.ok(Math.abs(drawer.height - oven.height * (1 - expectedRatio)) < 0.00001);
});

test("AB 105759 seeds dual contracts and catalog links for every schedule row", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const catalog = readFileSync(new URL("../lib/catalog.js", import.meta.url), "utf8");
  const items = seed.match(/const AB_105759_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-105759"[\s\S]*?kitchenCode: "105 759"[\s\S]*?items: AB_105759_ITEMS/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "670"\)/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "111"\)/);
  assert.match(seed, /articleNumber: "SP60"/);
  assert.match(seed, /articleNumber: "PLR60"/);
  assert.match(seed, /const AB_105759_OVEN_HOB_CATALOG_ARTICLE = "EH92364E-A \+ 9EC744100C \+ UHK"/);
  assert.match(items, /articleNumber: AB_105759_OVEN_HOB_CATALOG_ARTICLE/);
  assert.match(items, /catalogArticleNumber: AB_105759_OVEN_HOB_CATALOG_ARTICLE/);
  assert.match(seed, /articleNumber: "526335 \+ 517720"/);

  for (const article of [
    "SP60",
    "OL-KGCN388140E",
    "US40",
    "US30",
    "A-EGSPV597210 + TGV60",
    "US90",
    "H4002",
    "FH664621E + FWK124 + HD6002",
    "H3002",
    "H6002",
    "H9002",
  ]) {
    assert.ok(items.includes(`articleNumber: "${article}"`), `${article} should be linked in the kitchen seed`);
  }
  assert.match(items, /US90[\s\S]*?blendeCode: "UPK20"/);
  assert.match(items, /H9002[\s\S]*?blendeCode: "HPK2002"/);
  assert.match(catalog, /widthMm: catalogArticle \? catalogArticle\.widthMm \?\? null : item\.widthMm \?\? null/);
  assert.match(catalog, /heightMm: catalogArticle \? catalogArticle\.heightMm \?\? null : item\.heightMm \?\? null/);
  assert.match(catalog, /depthMm: catalogArticle \? catalogArticle\.depthMm \?\? null : item\.depthMm \?\? null/);
});
