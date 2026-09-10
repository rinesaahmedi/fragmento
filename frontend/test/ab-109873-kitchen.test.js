import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getAutoLinkedAccessoryCodes,
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
  buildServiceClaimSelectableComponents,
  collapseServiceClaimLinkedComponents,
  getServiceClaimLinkedComponentIds,
  normalizeServiceClaimLinkedComponentSelection,
} from "../lib/service-claim-kitchen-plan-selection.js";
import {
  buildServiceClaimBlendeHotspots,
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "../lib/service-claim-kitchen-hotspots.js";
import {
  buildServiceClaimComponentChoiceGroups,
  resolveServiceClaimPlanDisplayComponentIds,
} from "../lib/service-claim-component-choices.js";

const translate = (_key, fallback) => fallback;

test("AB 109873 uses its final vector plan and complete selection geometry", () => {
  const svg = readFileSync(new URL("../public/plans/AB 109873.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-109873"];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(
    createHash("sha256").update(svg.replace(/\r\n/g, "\n")).digest("hex"),
    "a3f63c28339688d1032456e1d42be6b63c144c09c56ebc3249abaa7a870fabb3",
    "the displayed SVG should be rendered from AB 109873 fin.pdf",
  );
  assert.equal(PLAN_IMAGE_BY_SLUG["ab-109873"], "/plans/AB%20109873.svg");
  assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG["ab-109873"], { width: 842, height: 595 });
  assert.equal(new Set(keys.filter((key) => key.startsWith("wall-cabinet-"))).size, 6);
  assert.equal(keys.filter((key) => key === "sink-faucet").length, 3);
  assert.equal(keys.filter((key) => key === "under-cabinet-light").length, 2);
  for (const key of ["worktop", "sink-base", "dishwasher-base", "oven-module", "base-module-1", "base-module-2", "base-module-3", "extractor-hood"]) {
    assert.ok(keys.includes(key), `${key} should have an exact selectable area`);
  }

  const firstWall = hotspots.find((hotspot) => hotspot.componentKey === "wall-cabinet-1");
  const lastWall = hotspots.find((hotspot) => hotspot.componentKey === "wall-cabinet-6");
  const sinkBase = hotspots.find((hotspot) => hotspot.componentKey === "sink-base");
  const lastBase = hotspots.find((hotspot) => hotspot.componentKey === "base-module-3");
  assert.equal(firstWall.left, 4.275534);
  assert.ok(Math.abs(lastWall.left + lastWall.width - 95.159145) < 1e-9);
  assert.equal(sinkBase.left, 4.275534);
  assert.ok(Math.abs(lastBase.left + lastBase.width - 95.159145) < 1e-9);
  for (const hotspot of hotspots.filter((entry) => [
    "sink-base",
    "base-module-1",
    "dishwasher-base",
    "oven-module",
    "base-module-2",
    "base-module-3",
  ].includes(entry.componentKey))) {
    assert.ok(
      Math.abs(hotspot.top + hotspot.height - 97.842017) < 1e-9,
      `${hotspot.componentKey} should include its complete plinth section`,
    );
  }
});

test("AB 109873 maps all schedule rows and preserves dishwasher details", () => {
  const expectedByCode = {
    "SINK-BASE-AB109873-SP120": "3",
    "DISH-AB109873-600": "5",
    "CAB-BASE-AB109873-US90": "6",
    "CAB-WALL-AB109873-H6002-HPK2002-L": "8",
    "CAB-WALL-AB109873-H6002-2": "9",
    "CAB-WALL-AB109873-H6002-3": "10",
    "CAB-HOOD-AB109873-600": "11",
    "HOOD-AB109873-FH664621E": "11",
    "CAB-WALL-AB109873-H9002-HPK2002-R": "12",
  };

  for (const [code, expected] of Object.entries(expectedByCode)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${expected}. `), `${code} should use callout ${expected}`);
  }

  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-109873"];
  assert.deepEqual(details.map((detail) => detail.key), ["dishwasher-basket", "dishwasher-gs-mark"]);
  assert.ok(details.every((detail) => detail.componentKey === "dishwasher-base"));
  assert.ok(details.every((detail) => detail.persistWhenSelected === true));
});

test("AB 109873 links its SP120, US90 and H9002 faces and hood package", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const configurator = readFileSync(new URL("../components/kitchen-configurator.js", import.meta.url), "utf8");
  const catalogPanel = readFileSync(new URL("../components/kitchen-catalog-panel.jsx", import.meta.url), "utf8");
  const picker = readFileSync(new URL("../components/service-claim-kitchen-picker.jsx", import.meta.url), "utf8");
  const items = seed.match(/const AB_109873_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.equal(isLShapedClaimKitchen("ab-109873"), false);
  assert.match(seed, /slug: "ab-109873"[\s\S]*?kitchenCode: "109 873"[\s\S]*?items: AB_109873_ITEMS/);
  assert.match(items, /defaultOvenHob/);
  assert.match(items, /defaultWorktop/);
  assert.match(items, /defaultSinkBase\(\{ code: "SINK-BASE-AB109873-SP120"[^\n]+widthMm: 1200[^\n]+articleNumber: "SP120"/);
  assert.match(seed, /articleNumber: "SP120", name: "Sink Base Cabinet 120 cm"/);
  assert.match(items, /code: "CAB-BASE-AB109873-US90"[^\n]+widthMm: 900[^\n]+componentKey: "base-module-2"[^\n]+articleNumber: "US90"/);
  assert.match(seed, /articleNumber: "US90", name: "Lower Cabinet with drawer 90 cm"/i);
  assert.match(items, /code: "CAB-WALL-AB109873-H9002-HPK2002-R"[^\n]+price: articlePriceWithBlende\("H9002", "HPK2002", 1\)[^\n]+widthMm: 900[^\n]+heightMm: 723[^\n]+componentKey: "wall-cabinet-5"[^\n]+articleNumber: "H9002"/);
  assert.match(seed, /H9002: 203/);
  assert.match(seed, /articleNumber: "H9002"[^\n]+price: "203\.00"/);
  assert.match(
    catalogPanel,
    /viewBox="0 0 90 72\.3"[\s\S]*?x1="45"[\s\S]*?x1="40"[\s\S]*?x1="50"/,
    "the H9002 catalog icon should show its two real cabinet fronts and handles",
  );
  assert.match(
    catalogPanel,
    /articleNumber === "H9002" && iconKey\.startsWith\("wall_cabinet"\)/,
  );
  assert.doesNotMatch(items, /CAB-BASE-AB109873-DEFAULT-1/);
  assert.doesNotMatch(items, /CAB-BASE-AB109873-DEFAULT-2/);
  assert.doesNotMatch(items, /CAB-BASE-AB109873-DEFAULT-UPK20-R/);
  assert.doesNotMatch(items, /CAB-WALL-AB109873-H4502-1/);
  assert.doesNotMatch(items, /CAB-WALL-AB109873-H4502-HPK2002-R/);
  assert.equal((items.match(/isLocked: true/g) || []).length, 1);
  assert.deepEqual(
    getLinkedComponentIds("ab-109873", "component-sink-base"),
    ["component-sink-base", "component-base-module-1"],
  );
  assert.deepEqual(
    getLinkedComponentIds("ab-109873", "component-base-module-2"),
    ["component-base-module-2", "component-base-module-3"],
  );
  assert.deepEqual(
    getServiceClaimLinkedComponentIds("ab-109873", "component-base-module-3"),
    ["component-base-module-2", "component-base-module-3"],
  );
  assert.deepEqual(
    getLinkedComponentIds("ab-109873", "component-wall-cabinet-6"),
    ["component-wall-cabinet-5", "component-wall-cabinet-6"],
  );
  assert.deepEqual(
    getServiceClaimLinkedComponentIds("ab-109873", "component-wall-cabinet-5"),
    ["component-wall-cabinet-5", "component-wall-cabinet-6"],
  );
  assert.deepEqual(collapseServiceClaimLinkedComponents("ab-109873", [
    { componentId: "component-claim-sink-cabinet", articleCode: "SP120" },
  ]), [{ componentId: "component-claim-sink-cabinet", articleCode: "SP120" }]);
  assert.match(
    picker,
    /\(visualValue \|\| \[\]\)\.flatMap\(\(componentId\) => \([\s\S]*?getServiceClaimLinkedComponentIds\(kitchenSlug, componentId\)/,
  );
  assert.match(
    configurator,
    /const lockedComponentIds = useMemo\([\s\S]*?return expandLinkedComponentIds\(kitchenSlug, lockedIds\)/,
  );
  assert.deepEqual(
    getLinkedComponentIds("ab-109873", "component-wall-cabinet-4"),
    ["component-wall-cabinet-4", "component-extractor-hood", "component-under-cabinet-light"],
  );
  assert.deepEqual(
    getAutoLinkedAccessoryCodes("ab-109873", ["component-extractor-hood"]),
    ["ACC-LIGHT-003"],
  );
});

test("AB 109873 ASC represents both H9002 fronts as one linked claim item", () => {
  const h9002Cabinet = {
    id: "h9002-item",
    itemType: "COMPONENT",
    code: "CAB-WALL-AB109873-H9002-HPK2002-R",
    articleNumber: "H9002",
    name: "Upper Cabinet 90 cm",
    nameDe: "Oberschrank 90 cm",
    componentKey: "wall-cabinet-5",
    blendeCode: "HPK2002",
    blendeLabel: "HPK2002 35 cm",
    widthMm: 900,
    isLocked: false,
  };
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [h9002Cabinet] },
    kitchenConfig: { components: [h9002Cabinet] },
    kitchenSlug: "ab-109873",
    claimParts: [],
    confirmedItems: [{
      itemType: "COMPONENT",
      code: h9002Cabinet.code,
      kitchenItemId: h9002Cabinet.id,
    }],
  });

  assert.ok(selection.selectableComponentIds.includes("component-wall-cabinet-5"));
  assert.ok(selection.selectableComponentIds.includes("component-wall-cabinet-6"));
  assert.deepEqual(
    collapseServiceClaimLinkedComponents("ab-109873", [
      { componentId: "component-wall-cabinet-5", articleCode: "H9002" },
      { componentId: "component-wall-cabinet-6", articleCode: "H9002" },
    ]),
    [{ componentId: "component-wall-cabinet-5", articleCode: "H9002" }],
  );
});

test("AB 109873 ASC maps both filler panels to the complete right end faces", () => {
  const us90Cabinet = {
    id: "us90-item",
    itemType: "COMPONENT",
    code: "CAB-BASE-AB109873-US90",
    articleNumber: "US90",
    name: "Lower Cabinet with Drawer 90 cm",
    componentKey: "base-module-2",
    blendeCode: "UPK20",
    widthMm: 900,
    isLocked: true,
  };
  const h9002Cabinet = {
    id: "h9002-item",
    itemType: "COMPONENT",
    code: "CAB-WALL-AB109873-H9002-HPK2002-R",
    articleNumber: "H9002",
    name: "Upper Cabinet 90 cm",
    componentKey: "wall-cabinet-5",
    blendeCode: "HPK2002",
    widthMm: 900,
    isLocked: false,
  };
  const components = [us90Cabinet, h9002Cabinet];
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: components },
    kitchenConfig: { components },
    kitchenSlug: "ab-109873",
    confirmedItems: [{
      itemType: "COMPONENT",
      code: h9002Cabinet.code,
      kitchenItemId: h9002Cabinet.id,
    }],
    claimParts: [],
  });
  const hotspots = buildServiceClaimBlendeHotspots(
    PLAN_HOTSPOTS_BY_SLUG["ab-109873"],
    selection.selectableComponents,
    components,
    "ab-109873",
  );
  const lowerBlende = hotspots.find(
    (hotspot) => hotspot.componentId === "component-claim-blende-base-module-2",
  );
  const upperBlende = hotspots.find(
    (hotspot) => hotspot.componentId === "component-claim-blende-wall-cabinet-5",
  );

  for (const blende of [lowerBlende, upperBlende]) {
    assert.ok(blende, "the outer filler face should be selectable");
    assert.ok(Math.abs(blende.left - 92.764846) < 1e-9);
    assert.ok(Math.abs(blende.left + blende.width - 95.159145) < 1e-9);
    assert.ok(blende.width > 2, "the filler must be the full end panel, not a thin seam");
  }
  assert.equal(lowerBlende.sourceComponentKey, "base-module-2");
  assert.equal(upperBlende.sourceComponentKey, "wall-cabinet-5");

  const choiceGroups = buildServiceClaimComponentChoiceGroups(selection.selectableComponents);
  const lowerChoiceGroup = choiceGroups.find(
    (group) => group.triggerComponentId === "component-base-module-2",
  );
  const normalizedSelection = normalizeServiceClaimLinkedComponentSelection(
    "ab-109873",
    ["component-base-module-2", "component-base-module-3"],
  );
  assert.deepEqual(normalizedSelection, ["component-base-module-2"]);
  assert.deepEqual(
    resolveServiceClaimPlanDisplayComponentIds(
      normalizedSelection,
      choiceGroups,
      {
        [lowerChoiceGroup.sourceComponentKey]: [
          "component-claim-blende-base-module-2",
        ],
      },
    ),
    ["component-claim-blende-base-module-2"],
  );
});

test("AB 109873 ASC represents both US90 fronts as one linked claim item", () => {
  const us90Cabinet = {
    id: "us90-item",
    itemType: "COMPONENT",
    code: "CAB-BASE-AB109873-US90",
    articleNumber: "US90",
    name: "Lower Cabinet with Drawer 90 cm",
    nameDe: "Unterschrank mit Schublade 90 cm",
    componentKey: "base-module-2",
    blendeCode: "UPK20",
    blendeLabel: "UPK20 20 cm",
    widthMm: 900,
    isLocked: true,
  };
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [us90Cabinet] },
    kitchenConfig: { components: [us90Cabinet] },
    kitchenSlug: "ab-109873",
    claimParts: [],
  });

  assert.ok(selection.selectableComponentIds.includes("component-base-module-2"));
  assert.ok(selection.selectableComponentIds.includes("component-base-module-3"));
  assert.deepEqual(
    collapseServiceClaimLinkedComponents("ab-109873", [
      { componentId: "component-base-module-2", articleCode: "US90" },
      { componentId: "component-base-module-3", articleCode: "US90" },
    ]),
    [{ componentId: "component-base-module-2", articleCode: "US90" }],
  );
});

test("AB 109873 ASC starts with the complete SP120 sink set and narrows to individual parts", () => {
  const sinkCabinet = {
    id: "sp120-item",
    itemType: "COMPONENT",
    code: "SINK-BASE-AB109873-SP120",
    articleNumber: "SP120",
    name: "Sink Base Cabinet 120 cm",
    nameDe: "Spülenschrank 120 cm",
    componentKey: "sink-base",
    blendeCode: "UPK20",
    blendeLabel: "UPK20 20 cm",
    isLocked: true,
  };
  const sinkFixture = {
    id: "sink-fixture-item",
    itemType: "COMPONENT",
    code: "SINK-WORKTOP",
    name: "Worktop",
    componentKey: "sink-faucet",
    isLocked: true,
  };
  const claimParts = [
    { partKey: "sink", articleCode: "526335", name: "Built-in Sink BLANCO TIPO 45 S", sourceKitchenItemCode: "SINK-WORKTOP", sourceComponentKey: "sink-faucet", isActive: true },
    { partKey: "sink-cabinet", articleCode: "SP120", name: "Sink Base Cabinet 120 cm", sourceKitchenItemCode: "SINK-BASE-AB109873-SP120", sourceComponentKey: "sink-base", isActive: true },
    { partKey: "faucet", articleCode: "517720", name: "Kitchen Faucet BLANCO DARAS HD", sourceKitchenItemCode: "SINK-WORKTOP", sourceComponentKey: "sink-faucet", isActive: true },
  ];
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [sinkCabinet, sinkFixture] },
    kitchenConfig: { components: [sinkCabinet, sinkFixture] },
    kitchenSlug: "ab-109873",
    claimParts,
  });
  const group = buildServiceClaimComponentChoiceGroups(selection.selectableComponents)
    .find((entry) => entry.triggerComponentId === "component-claim-sink-cabinet");
  const optionIds = group.options.map((option) => option.componentId);

  assert.deepEqual(optionIds, [
    "component-claim-sink-cabinet",
    "component-claim-sink",
    "component-claim-faucet",
    "component-claim-blende-sink-base",
  ]);
  assert.ok(!selection.selectableComponentIds.includes("component-base-module-1"));
  assert.deepEqual(
    resolveServiceClaimPlanDisplayComponentIds([group.triggerComponentId], [group], {}),
    optionIds,
  );
  assert.deepEqual(
    resolveServiceClaimPlanDisplayComponentIds(
      [group.triggerComponentId],
      [group],
      { [group.sourceComponentKey]: ["component-claim-sink"] },
    ),
    ["component-claim-sink"],
  );

  const claimHotspots = buildServiceClaimPartHotspots(
    PLAN_HOTSPOTS_BY_SLUG["ab-109873"],
    claimParts,
    "ab-109873",
  );
  assert.equal(
    claimHotspots.filter((hotspot) => hotspot.componentId === "component-claim-sink-cabinet").length,
    2,
  );
});
