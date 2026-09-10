import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLinkedComponentIds, getLocalizedItemName, getProductInfoDocuments } from "../components/kitchen-selection-utils.js";
import {
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
  PLAN_IMAGE_SOURCE_SIZE_BY_SLUG,
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG,
} from "../lib/kitchen-plan-preview-data.js";
import { buildServiceClaimPartHotspots } from "../lib/service-claim-kitchen-hotspots.js";
import { buildServiceClaimComponentChoiceGroups } from "../lib/service-claim-component-choices.js";
import { buildServiceClaimSelectableComponents } from "../lib/service-claim-kitchen-plan-selection.js";
import { prepareKitchenPlanPreview } from "../lib/kitchen-plan-preview.js";

const slug = "ab-109955";
const translate = (_key, fallback) => fallback;

test("AB 109955 uses its sharp vector plan and shared FRG/ASC geometry", () => {
  const svg = readFileSync(new URL("../public/plans/AB 109955.svg", import.meta.url), "utf8");
  const stage = readFileSync(new URL("../components/kitchen-svg-stage.jsx", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20109955.svg");
  assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[slug], { width: 842, height: 595 });
  assert.match(stage, /IMAGE_HOTSPOTS_BY_SLUG\["ab-109955"\] = AB_109955_FRG_ORDER_HOTSPOTS/);
  assert.equal(hotspots.length, 16);
  assert.ok(hotspots.every((hotspot) => hotspot.preserveManualSize === true));
  assert.ok(hotspots.every((hotspot) => Array.isArray(hotspot.points)));
  assert.equal(hotspots.filter((hotspot) => hotspot.componentKey === "sink-faucet").length, 5);
  assert.deepEqual(hotspots[0].points[0], [0.39905, 23.280672]);
  assert.deepEqual(hotspots[10].points[2], [66.513064, 86.648739]);
  for (const componentKey of ["sink-base", "dishwasher-base", "base-module-1", "oven-module"]) {
    const lower = hotspots.find((hotspot) => hotspot.componentKey === componentKey);
    assert.deepEqual(lower.points.slice(2), [
      [lower.points[1][0], 87.092437],
      [lower.points[0][0], 87.092437],
    ]);
  }
});

test("AB 109955 crops the unused sheet area after the refrigerator", () => {
  const preview = prepareKitchenPlanPreview(slug);

  assert.equal(preview.crop.right, 70.5);
  assert.ok(preview.crop.right - 66.513064 > 3.9);
  assert.ok(preview.crop.right - 66.513064 < 4.1);
});

test("AB 109955 preserves all ten schedule rows, prices, and four defaults", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const items = seed.match(/const AB_109955_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-109955"[\s\S]*?kitchenCode: "109 955"[\s\S]*?items: AB_109955_ITEMS/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "670"\)/);
  assert.match(items, /defaultOvenHob\(\{[\s\S]*?catalogArticleNumber: "A-EH923640E \+ 9EC744100C"/);
  assert.match(items, /defaultWorktop/);
  assert.match(items, /SINK-BASE-AB109955-DEFAULT-UPK20[^;]+articleNumber: "SP60"[^;]+blendeCode: "UPK20"/);
  assert.match(items, /CAB-BASE-AB109955-DEFAULT[^;]+name: "Lower Cabinet with Drawer 60 cm"[^;]+price: "0\.00"[^;]+isLocked: true[^;]+articleNumber: "US60"/);
  assert.equal((items.match(/isLocked: true/g) || []).length, 2);
  for (const [code, price] of [
    ["DISH-AB109955-600", "579.00"],
    ["REF-AB109955-KGCN388140E", "579.00"],
    ["CAB-WALL-AB109955-H6002-HPK2002", "149.00"],
    ["CAB-WALL-AB109955-H6002-2", "149.00"],
    ["CAB-WALL-AB109955-H6002-3", "149.00"],
    ["CAB-HOOD-AB109955-600", "349.00"],
  ]) {
    assert.match(items, new RegExp(`${code}[^;]+price: "${price}"`));
  }
  assert.match(items, /CAB-WALL-AB109955-H6002-HPK2002[^;]+catalogArticleNumber: "H6002"/);
  assert.match(items, /CAB-WALL-AB109955-H6002-HPK2002[^;]+displayArticleNumber: "H6002 \+ HPK2002"/);
  assert.doesNotMatch(items, /CAB-WALL-AB109955-H6002-HPK2002[^;]+HPK2002\s*\(35E\)/);
});

test("AB 109955 uses its kitchen-specific A-EH923640E oven document", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const migration = readFileSync(
    new URL("../prisma/migrations/20260910130000_set_ab109955_oven_product_information/migration.sql", import.meta.url),
    "utf8",
  );

  assert.match(seed, /ovenArticleCode = String\(ovenBundle\.articleNumber[\s\S]*?PRODUCT_INFO_BY_ARTICLE_NUMBER\[ovenArticleCode\]/);
  assert.doesNotMatch(seed, /normalizedKitchenSlug === "ab-109955"/);
  assert.match(seed, /AB_109955_OVEN_CLAIM_PRODUCT_INFO[\s\S]*?a-eh923640e-product-info\.pdf/);
  assert.match(migration, /kitchen\."slug" = 'ab-109955'/);
  assert.match(migration, /"catalogArticleId" = article\."id"/);
  assert.match(migration, /article\."articleNumber" = 'A-EH923640E \+ 9EC744100C'/);
  assert.match(migration, /"articleCode" = 'A-EH923640E'/);
  assert.match(migration, /a-eh923640e-product-info\.pdf/);

  assert.deepEqual(getProductInfoDocuments({
    code: "OVEN-B-600-HOB",
    articleNumber: "A-EH923640E + 9EC744100C",
  }), [
    { label: "Backofen PDF", href: "/product-info/ovens/eh923640e/a-eh923640e-product-info.pdf" },
    { label: "Kochfeld PDF", href: "/product-info/hobs/ec744100c/ec744100c-product-info.pdf" },
  ]);
  assert.ok(!getProductInfoDocuments({
    code: "OVEN-B-600-HOB",
    articleNumber: "A-EH923640E + 9EC744100C",
  }).some((document) => /e-label/i.test(document.label)));
});

test("the additional kitchens link their default oven to the A-EH923640E catalog package", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const migration = readFileSync(
    new URL("../prisma/migrations/20260910140000_link_additional_kitchens_to_a_eh923640e/migration.sql", import.meta.url),
    "utf8",
  );

  for (const kitchenCode of ["110140", "110401", "110402", "110510"]) {
    const items = seed.match(
      new RegExp(`const AB_${kitchenCode}_ITEMS = \\[([\\s\\S]*?)\\n\\];`),
    )?.[1] || "";
    assert.match(
      items,
      /defaultOvenHob\(\{[^\n]+catalogArticleNumber: "A-EH923640E \+ 9EC744100C"/,
      `AB ${kitchenCode} should use the A-EH923640E catalog package`,
    );
    assert.match(migration, new RegExp(`'ab-${kitchenCode}'`));
  }

  assert.match(migration, /item\."code" = 'OVEN-B-600-HOB'/);
  assert.match(migration, /article\."articleNumber" = 'A-EH923640E \+ 9EC744100C'/);
  assert.match(migration, /part\."partKey" = 'oven'/);
  assert.match(migration, /"articleCode" = 'A-EH923640E'/);
  assert.doesNotMatch(migration, /e-label/i);
});

test("AB 109955 maps PDF callouts and links the complete hood package", () => {
  const expectedByCode = {
    "SINK-BASE-AB109955-DEFAULT-UPK20": "3",
    "DISH-AB109955-600": "4",
    "CAB-BASE-AB109955-DEFAULT": "5",
    "REF-AB109955-KGCN388140E": "6",
    "CAB-WALL-AB109955-H6002-HPK2002": "7",
    "CAB-WALL-AB109955-H6002-2": "8",
    "CAB-WALL-AB109955-H6002-3": "9",
    "CAB-HOOD-AB109955-600": "10",
    "HOOD-AB109955-FH664621E": "10",
  };

  for (const [code, expected] of Object.entries(expectedByCode)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${expected}. `), `${code} should use callout ${expected}`);
  }
  assert.deepEqual(
    getLinkedComponentIds(slug, "component-wall-cabinet-4"),
    ["component-wall-cabinet-4", "component-extractor-hood"],
  );
});

test("AB 109955 keeps dishwasher markings light and exposes exact ASC parts", () => {
  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug];
  assert.deepEqual(details.map((detail) => detail.key), ["dishwasher-basket", "dishwasher-gs-mark"]);
  assert.ok(details.every((detail) => detail.persistWhenSelected === true));

  const source = PLAN_HOTSPOTS_BY_SLUG[slug].map((hotspot) => {
    const xs = hotspot.points.map(([x]) => x);
    const ys = hotspot.points.map(([, y]) => y);
    return {
      ...hotspot,
      left: Math.min(...xs),
      top: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  });
  const result = buildServiceClaimPartHotspots(source, [
    { partKey: "sink", sourceComponentKey: "sink-faucet" },
    { partKey: "sink-cabinet", sourceComponentKey: "sink-base" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", sourceComponentKey: "oven-module" },
  ], slug);

  assert.equal(result.filter((entry) => entry.claimPartKey === "sink").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "sink-cabinet").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "faucet").length, 5);
  assert.equal(result.filter((entry) => entry.claimPartKey === "oven").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "oven-drawer").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "cooktop").length, 1);
  const ovenDrawer = result.find((entry) => entry.claimPartKey === "oven-drawer");
  assert.equal(ovenDrawer.top + ovenDrawer.height, 87.092437);
  assert.ok(result.every((entry) => !String(entry.clipPath || "").includes("NaN")));
});

test("AB 109955 exposes the sink Blende as its own claim row", () => {
  const sinkBase = {
    itemType: "COMPONENT",
    code: "SINK-BASE-AB109955-DEFAULT-UPK20",
    name: "Sink Lower Cabinet",
    nameDe: "Spülenunterschrank",
    componentKey: "sink-base",
    articleNumber: "SP60",
    widthMm: 600,
    isLocked: true,
    blendeCode: "UPK20",
    blendeLabel: "UPK20 20 cm",
  };
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [sinkBase] },
    kitchenConfig: { components: [sinkBase] },
    kitchenSlug: slug,
    claimParts: [
      { partKey: "sink-cabinet", articleCode: "SP60", sourceKitchenItemCode: sinkBase.code, sourceComponentKey: "sink-base" },
      { partKey: "sink", sourceKitchenItemCode: sinkBase.code, sourceComponentKey: "sink-base" },
      { partKey: "faucet", sourceKitchenItemCode: sinkBase.code, sourceComponentKey: "sink-base" },
    ],
  });
  const blende = selection.selectableComponents.find(
    (entry) => entry.componentId === "component-claim-blende-sink-base",
  );
  const sinkGroup = buildServiceClaimComponentChoiceGroups(selection.selectableComponents)
    .find((group) => group.triggerComponentId === "component-claim-sink-cabinet");

  assert.equal(blende?.isStandaloneClaimOption, true);
  assert.equal(
    selection.selectableComponents.find((entry) => entry.claimPartKey === "sink-cabinet")?.articleCode,
    "SP60",
  );
  assert.ok(selection.selectableComponentIds.includes(blende.componentId));
  assert.ok(!sinkGroup.options.some((option) => option.componentId === blende.componentId));
});

test("AB 109955 exposes the included US60 identity in ASC", () => {
  const us60 = {
    itemType: "COMPONENT",
    code: "CAB-BASE-AB109955-DEFAULT",
    name: "Lower Cabinet with Drawer 60 cm",
    nameDe: "Unterschrank mit Schublade 60 cm",
    articleNumber: "US60",
    componentKey: "base-module-1",
    widthMm: 600,
    isLocked: true,
  };
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [us60] },
    kitchenConfig: { components: [us60] },
    kitchenSlug: slug,
    claimParts: [],
  });
  const cabinet = selection.selectableComponents.find(
    (entry) => entry.componentId === "component-base-module-1",
  );

  assert.equal(cabinet?.articleCode, "US60");
  assert.equal(cabinet?.name, "Lower Cabinet with Drawer 60 cm");
});
