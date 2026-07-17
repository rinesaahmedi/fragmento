import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { PLAN_HOTSPOTS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import {
  buildServiceClaimSelectableComponents,
  collapseServiceClaimLinkedComponents,
  getServiceClaimLinkedComponentIds,
} from "../lib/service-claim-kitchen-plan-selection.js";
import {
  buildServiceClaimBlendeHotspots,
  buildServiceClaimPartHotspots,
} from "../lib/service-claim-kitchen-hotspots.js";
import {
  buildServiceClaimComponentChoiceGroups,
  normalizeServiceClaimComponentChoiceSelection,
} from "../lib/service-claim-component-choices.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const component = (code, componentKey, name = code, overrides = {}) => ({
  itemType: "COMPONENT",
  code,
  componentKey,
  name,
  ...overrides,
});

test("service kitchen svg loader uses the AB 105808 plan asset", async () => {
  const markup = await loadKitchenSvgMarkup("ab-105808");

  assert.match(markup, /viewBox="0 0 842 595"/);
  assert.match(markup, /M1214 2108H6758/);
});

test("service kitchen svg loader resolves AB plan assets by slug", async () => {
  const markup = await loadKitchenSvgMarkup("ab-105826");
  const expected = fs.readFileSync(path.join(repoRoot, "public", "plans", "AB 105826.svg"), "utf8").trim();

  assert.match(markup, /viewBox="0 0 842 595"/);
  assert.equal(markup, expected);
});

test("AB 105808 service plan uses overlay bounds instead of color grouping", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-plan-utils.js"), "utf8");

  assert.match(source, /"ab-105808":\s*{/);
  assert.match(source, /"component-wall-cabinet-6":\s*boundsFromPlanPercent\(81\.23,\s*15\.89,\s*15\.07,\s*24\.09\)/);
  assert.match(source, /!\s*hasOverlayPlanBounds\(kitchenConfig\.kitchen\.slug\)/);
});

test("service claim kitchen plan keeps only defaults and confirmed components selectable", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-DEFAULT", "base-module-0", "Default base", { articleNumber: "US60", nameDe: "Standard-Unterschrank", isLocked: true }),
      component("CAB-BASE-ORDERED", "base-module-1", "Ordered base", { articleNumber: "US40", nameDe: "Bestellter Unterschrank" }),
      component("CAB-BASE-NOT-ORDERED", "base-module-2", "Not ordered base"),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105806",
    confirmedItems: [
      { itemType: "COMPONENT", code: "CAB-BASE-ORDERED", nameSnapshot: "Ordered base" },
    ],
  });

  assert.deepEqual(result.selectableComponentIds, ["component-base-module-0", "component-base-module-1"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["CAB-BASE-DEFAULT", "CAB-BASE-ORDERED"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.articleCode), ["US60", "US40"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.nameDe), ["Standard-Unterschrank", "Bestellter Unterschrank"]);
  assert.equal(result.source, "kitchen");
});

test("service claim components show a code when no catalog article number exists", () => {
  const kitchen = {
    items: [
      component("TOP-AB105806", "worktop", "Worktop", { isLocked: true }),
      component("CAB-BASE-CUSTOM", "base-module-1", "Custom base", { isLocked: true }),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105806",
  });

  assert.deepEqual(result.selectableComponents.map((entry) => entry.articleCode), ["PLR60", "CAB-BASE-CUSTOM"]);
});

test("service claims expose a cabinet blende as its own selectable component", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-WITH-BLENDE", "base-module-3", "Lower cabinet 50", {
        articleNumber: "US50",
        widthMm: 500,
        isLocked: true,
        blendeCode: "UPK20",
        blendeLabel: "UPK20 Passblende",
        catalogBlendeQuantity: 1,
        catalogBlende: {
          code: "UPK20",
          name: "UPK20 Filler Panel",
          nameDe: "UPK20 Passblende",
        },
      }),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105833",
  });

  assert.deepEqual(result.selectableComponentIds, [
    "component-base-module-3",
    "component-claim-blende-base-module-3",
  ]);
  assert.deepEqual(result.selectableComponents[1], {
    componentId: "component-claim-blende-base-module-3",
    code: "UPK20",
    articleCode: "UPK20",
    name: "UPK20 Filler Panel",
    nameDe: "UPK20 Passblende",
    componentKey: "claim-blende-base-module-3",
    sourceComponentKey: "base-module-3",
    sourceKitchenItemCode: "CAB-BASE-WITH-BLENDE",
    sourceWidthMm: 500,
    claimPartKey: "blende",
    blendeQuantity: 1,
  });
});

test("plan-only lower Blenden are exposed separately from their sink cabinets", () => {
  [
    "ab-105732", "ab-105735", "ab-105738", "ab-105741",
    "ab-105746", "ab-105749", "ab-105752", "ab-105755",
    "ab-105823", "ab-105826", "ab-105829", "ab-105832",
  ].forEach((kitchenSlug) => {
    const kitchen = {
      items: [
        component("SINKBASE-B-600", "sink-base", "Sink Lower Cabinet", {
          articleNumber: "SP60",
          widthMm: 600,
          isLocked: true,
        }),
      ],
    };
    const result = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig: { components: kitchen.items },
      kitchenSlug,
    });
    const blende = result.selectableComponents.find((entry) => entry.claimPartKey === "blende");

    assert.ok(result.selectableComponentIds.includes("component-claim-blende-sink-base"));
    assert.equal(blende.sourceComponentKey, "sink-base");
    assert.equal(blende.articleCode, "UPK20");
    assert.equal(blende.name, "UPK20 Filler Panel");
  });
});

test("AB 105822 and AB 105825 expose the left US30 Blende as a form-only option", () => {
  ["ab-105822", "ab-105825", "ab-105828"].forEach((kitchenSlug) => {
    const kitchen = {
      items: [
        component("CAB-BASE-US30", "base-module-1", "Base cabinet with drawer", {
          articleNumber: "US30",
          widthMm: 300,
          isLocked: true,
        }),
      ],
    };
    const result = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig: { components: kitchen.items },
      kitchenSlug,
    });
    const blende = result.selectableComponents.find((entry) => entry.claimPartKey === "blende");

    assert.ok(result.selectableComponentIds.includes("component-base-module-1"));
    assert.ok(result.selectableComponentIds.includes("component-claim-blende-base-module-1"));
    assert.equal(blende.articleCode, "UPK20");
    assert.equal(blende.isCompanionOption, true);
  });
});

test("AB 105831 exposes its left US30 Blende as a form-only option", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-US30", "base-module-1", "Base cabinet with drawer", {
        articleNumber: "US30",
        widthMm: 300,
        isLocked: true,
        blendeCode: "UPK20",
        blendeLabel: "UPK20 Passblende",
      }),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105831",
  });
  const blende = result.selectableComponents.find((entry) => entry.claimPartKey === "blende");

  assert.ok(result.selectableComponentIds.includes("component-base-module-1"));
  assert.ok(result.selectableComponentIds.includes("component-claim-blende-base-module-1"));
  assert.equal(blende.articleCode, "UPK20");
  assert.equal(blende.isCompanionOption, true);
});

test("AB 105834 exposes the dishwasher Blende as a form-only option", () => {
  const kitchen = {
    items: [
      component("DISH-AB105834-600", "base-module-3", "Fully integrated dishwasher", {
        articleNumber: "A-EGSPV597210 + TGV60",
        widthMm: 600,
        isLocked: true,
        blendeCode: "UPK20",
        blendeLabel: "UPK20 Passblende",
      }),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105834",
  });
  const blende = result.selectableComponents.find((entry) => entry.claimPartKey === "blende");

  assert.ok(result.selectableComponentIds.includes("component-base-module-3"));
  assert.ok(result.selectableComponentIds.includes("component-claim-blende-base-module-3"));
  assert.equal(blende.articleCode, "UPK20");
  assert.equal(blende.isCompanionOption, true);
});

test("AB 105837 perspective variants expose the plan-only upper Blende", () => {
  ["ab-105837", "ab-105840", "ab-105843"].forEach((kitchenSlug) => {
    const kitchen = {
      items: [
        component("CAB-WALL-H6002-L", "wall-cabinet-3", "Wall Cabinet", {
          articleNumber: "H6002",
          widthMm: 600,
          isLocked: true,
        }),
      ],
    };
    const result = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig: { components: kitchen.items },
      kitchenSlug,
    });
    const blende = result.selectableComponents.find((entry) => entry.claimPartKey === "blende");

    assert.ok(result.selectableComponentIds.includes("component-wall-cabinet-3"));
    assert.ok(result.selectableComponentIds.includes("component-claim-blende-wall-cabinet-3"));
    assert.equal(blende.sourceComponentKey, "wall-cabinet-3");
    assert.equal(blende.articleCode, "HPK2002");
    assert.equal(blende.name, "HPK2002 Filler Panel");
  });
});

test("AB 105805 perspective variants expose the sink-base Blende separately", () => {
  ["ab-105805", "ab-105809", "ab-105813", "ab-105817"].forEach((kitchenSlug) => {
    const kitchen = {
      items: [
        component("SINKBASE-B-300", "sink-base", "Sink Lower Cabinet", {
          articleNumber: "SP30",
          widthMm: 300,
          isLocked: true,
          blendeCode: "UPK20",
          blendeLabel: "UPK20 Passblende",
        }),
        component("CAB-BASE-WITH-BLENDE", "base-module-2", "Base Cabinet", {
          articleNumber: "US50",
          widthMm: 500,
          isLocked: true,
          blendeCode: "UPK20 x2",
          blendeLabel: "UPK20 Passblende x 2",
        }),
        component("CAB-WALL-WITH-BLENDE", "wall-cabinet-4", "Wall Cabinet", {
          articleNumber: "H6002",
          widthMm: 600,
          isLocked: true,
          blendeCode: "HPK2002",
          blendeLabel: "HPK2002 Passblende",
        }),
      ],
    };
    const result = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig: { components: kitchen.items },
      kitchenSlug,
    });

    assert.ok(result.selectableComponentIds.includes("component-sink-base"));
    assert.ok(result.selectableComponentIds.includes("component-claim-blende-sink-base"));
    const sinkBlende = result.selectableComponents.find(
      (entry) => entry.sourceComponentKey === "sink-base" && entry.claimPartKey === "blende",
    );
    assert.equal(sinkBlende.articleCode, "UPK20");
    assert.equal(sinkBlende.name, "Filler Panel up to 20 cm");
    assert.equal(sinkBlende.nameDe, "Passblende bis 20 cm");
    assert.equal(sinkBlende.isCompanionOption, true);
    assert.ok(result.selectableComponentIds.includes("component-base-module-2"));
    assert.ok(result.selectableComponentIds.includes("component-claim-blende-base-module-2"));
    const baseBlenden = result.selectableComponents.filter(
      (entry) => entry.sourceComponentKey === "base-module-2" && entry.claimPartKey === "blende",
    );
    assert.equal(baseBlenden.length, 1);
    assert.equal(baseBlenden[0].componentId, "component-claim-blende-base-module-2");
    assert.equal(baseBlenden[0].blendeQuantity, 2);
    assert.equal(baseBlenden[0].blendeIndex, undefined);
    assert.ok(result.selectableComponentIds.includes("component-wall-cabinet-4"));
    assert.ok(result.selectableComponentIds.includes("component-claim-blende-wall-cabinet-4"));
  });
});

test("AB 105805 keeps the sink-base Blende as a form-only companion option", () => {
  const sidePanel = [[70.15, 59.65], [73, 61.38], [73, 86.53], [70.15, 84.75]];
  const cabinetFront = [[73, 62.22], [83.58, 59.12], [83.58, 83.43], [73, 86.53]];
  const result = buildServiceClaimBlendeHotspots([
    { componentKey: "sink-base", points: sidePanel },
    { componentKey: "sink-base", points: cabinetFront },
  ], [{
    componentId: "component-claim-blende-sink-base",
    componentKey: "claim-blende-sink-base",
    sourceComponentKey: "sink-base",
    sourceWidthMm: 300,
    claimPartKey: "blende",
    blendeQuantity: 1,
    isCompanionOption: true,
  }], [
    { componentKey: "sink-base", widthMm: 300, blendeCode: "UPK20" },
  ], "ab-105805");

  assert.deepEqual(result.map((entry) => entry.points), [sidePanel, cabinetFront]);
});

test("AB 105758 selecting the UPK20 Blende also highlights the exposed side face", () => {
  const exposedSide = [[12.299, 56.679], [20.038, 58.272], [19.724, 88.383], [12.299, 86.266]];
  const fillerStrip = [[20.038, 58.272], [21.734, 58.030], [21.734, 88.202], [19.724, 88.383]];
  const cabinetFront = [[21.734, 58.030], [32.979, 56.397], [32.979, 86.588], [21.734, 88.202]];
  const result = buildServiceClaimBlendeHotspots([
    { componentKey: "sink-base", points: exposedSide },
    { componentKey: "sink-base", points: fillerStrip },
    { componentKey: "sink-base", points: cabinetFront },
  ], [{
    componentId: "component-claim-blende-sink-base",
    componentKey: "claim-blende-sink-base",
    sourceComponentKey: "sink-base",
    claimPartKey: "blende",
  }], [{ componentKey: "sink-base", widthMm: 600, blendeCode: "UPK20" }], "ab-105758");
  const blendeHotspots = result.filter((entry) => entry.claimPartKey === "blende");
  const outerFace = blendeHotspots.find((entry) => entry.claimBlendeOuterFace);

  assert.equal(blendeHotspots.length, 2);
  assert.deepEqual(outerFace.points, exposedSide);
  assert.ok(blendeHotspots.every(
    (entry) => entry.componentId === "component-claim-blende-sink-base",
  ));
});

test("AB 105805 splits the right Blende from the last upper cabinet", () => {
  const hotspots = [
    {
      componentKey: "wall-cabinet-4",
      points: [[50.05, 15.6], [45.66, 14.55], [56.61, 12.94], [61.02, 13.76], [61.02, 36.65], [50.05, 38.06]],
    },
  ];
  const blende = {
    componentId: "component-claim-blende-wall-cabinet-4",
    componentKey: "claim-blende-wall-cabinet-4",
    sourceComponentKey: "wall-cabinet-4",
    sourceWidthMm: 600,
    claimPartKey: "blende",
    blendeQuantity: 1,
  };
  const result = buildServiceClaimBlendeHotspots(hotspots, [blende], [
    { componentKey: "wall-cabinet-4", widthMm: 600, blendeCode: "HPK2002" },
  ], "ab-105805");
  const cabinet = result.find((entry) => entry.componentKey === "wall-cabinet-4");
  const strip = result.find((entry) => entry.claimPartKey === "blende");

  assert.ok(cabinet);
  assert.ok(strip);
  assert.equal(strip.blendeSide, "right");
  assert.notEqual(cabinet.componentId, strip.componentId);
  assert.ok(Math.abs(cabinet.left + cabinet.width - 60.15959) < 0.000001);
  assert.ok(Math.abs(strip.left - 60.15959) < 0.000001);
  assert.ok(Math.abs(strip.left + strip.width - 61.014534) < 0.000001);
});

test("AB 105805 groups both right-side Blenden into one corner-face selection", () => {
  const hotspots = [
    { componentKey: "oven-module", points: [[35.45, 57.58], [45.57, 56.13], [45.57, 83.35], [35.45, 84.84]] },
    { componentKey: "base-module-2", points: [[45.57, 56.13], [55.52, 54.98], [55.52, 82.23], [45.57, 83.35]] },
    { componentKey: "corner-base", points: [[55.55, 55.05], [64.05, 56.65], [64.05, 83.91], [55.55, 82.25]] },
  ];
  const blende = {
    componentId: "component-claim-blende-base-module-2",
    componentKey: "claim-blende-base-module-2",
    sourceComponentKey: "base-module-2",
    sourceWidthMm: 500,
    claimPartKey: "blende",
    blendeQuantity: 2,
  };
  const result = buildServiceClaimBlendeHotspots(hotspots, [blende], [
    { componentKey: "oven-module", widthMm: 600 },
    { componentKey: "base-module-2", widthMm: 500, blendeCode: "UPK20 x2" },
    { componentKey: "corner-base", widthMm: 300 },
  ], "ab-105805");
  const cabinets = result.filter((entry) => entry.componentKey === "base-module-2");
  const strips = result.filter((entry) => entry.claimPartKey === "blende");

  assert.equal(cabinets.length, 1);
  assert.equal(strips.length, 1);
  assert.deepEqual([...new Set(strips.map((entry) => entry.componentId))], [
    "component-claim-blende-base-module-2",
  ]);
  assert.ok(Math.abs(cabinets[0].left + cabinets[0].width - 54.003333) < 0.000001);
  assert.ok(Math.abs(strips[0].left - 54.003333) < 0.000001);
  assert.ok(Math.abs(strips[0].left + strips[0].width - 55.52) < 0.000001);
});

test("hood cabinet, extractor, and FWK124 filter use separate claim identities", () => {
  const cabinet = component(
    "CAB-HOOD-B-600",
    "wall-cabinet-2",
    "Flat screen extractor hood + cabinet + filter 60 cm",
    {
      articleNumber: "FH664621E + FWK124 + HD6002",
      isLocked: true,
    },
  );
  const claimParts = [{
    partKey: "filter",
    articleCode: "FWK124",
    name: "Extractor Hood Filter",
    nameDe: "Filter für Dunstabzugshaube",
    sourceKitchenItemCode: cabinet.code,
    sourceComponentKey: cabinet.componentKey,
  }];
  const result = buildServiceClaimSelectableComponents({
    kitchen: { items: [cabinet] },
    kitchenConfig: { components: [cabinet] },
    kitchenSlug: "ab-105805",
    claimParts,
  });
  const cabinetMeta = result.selectableComponents.find(
    (entry) => entry.componentId === "component-wall-cabinet-2",
  );
  const filterMeta = result.selectableComponents.find(
    (entry) => entry.componentId === "component-claim-filter",
  );
  const extractorMeta = result.selectableComponents.find(
    (entry) => entry.componentId === "component-extractor-hood",
  );

  assert.ok(result.selectableComponentIds.includes("component-wall-cabinet-2"));
  assert.ok(result.selectableComponentIds.includes("component-extractor-hood"));
  assert.ok(result.selectableComponentIds.includes("component-claim-filter"));
  assert.deepEqual(
    getServiceClaimLinkedComponentIds("ab-105805", "component-claim-filter"),
    ["component-claim-filter"],
  );
  assert.equal(cabinetMeta.name, "Cabinet");
  assert.equal(cabinetMeta.nameDe, "Schrank");
  assert.equal(cabinetMeta.articleCode, "HD6002");
  assert.equal(extractorMeta.name, "Extractor Hood");
  assert.equal(extractorMeta.articleCode, "FH 664 621 E");
  assert.deepEqual(filterMeta, {
    componentId: "component-claim-filter",
    code: "FWK124",
    articleCode: "FWK124",
    sourceKitchenItemCode: "CAB-HOOD-B-600",
    name: "Extractor Hood Filter",
    nameDe: "Filter für Dunstabzugshaube",
    componentKey: "wall-cabinet-2",
    claimPartKey: "filter",
  });
  const hoodChoiceGroup = buildServiceClaimComponentChoiceGroups(result.selectableComponents)
    .find((group) => group.options.some(
      (option) => option.componentId === "component-extractor-hood",
    ));
  assert.deepEqual(
    hoodChoiceGroup.options.map((option) => option.componentId),
    [
      "component-wall-cabinet-2",
      "component-extractor-hood",
      "component-claim-filter",
    ],
  );
});

test("legacy and future FWK124 kitchen slugs also expose the extractor separately", () => {
  const cabinet = component("CAB-HOOD-LEGACY-600", "wall-cabinet-4", "Hood bundle", {
    articleNumber: "FH664621E + FWK124 + HD6002",
    isLocked: true,
  });
  const result = buildServiceClaimSelectableComponents({
    kitchen: { items: [cabinet] },
    kitchenConfig: { components: [cabinet] },
    kitchenSlug: "legacy-kitchen-not-in-linked-map",
    claimParts: [{
      partKey: "filter",
      articleCode: "FWK124",
      name: "Extractor Hood Filter",
      nameDe: "Filter für Dunstabzugshaube",
      sourceKitchenItemCode: cabinet.code,
      sourceComponentKey: cabinet.componentKey,
    }],
  });

  assert.ok(result.selectableComponentIds.includes("component-wall-cabinet-4"));
  assert.ok(result.selectableComponentIds.includes("component-extractor-hood"));
  assert.ok(result.selectableComponentIds.includes("component-claim-filter"));
  assert.equal(
    result.selectableComponents.find((entry) => entry.componentId === "component-wall-cabinet-4").articleCode,
    "HD6002",
  );
  assert.equal(
    result.selectableComponents.find((entry) => entry.componentId === "component-extractor-hood").articleCode,
    "FH 664 621 E",
  );
});

test("manual filter claims do not replace the hood cabinet hotspot", () => {
  const sourceHotspot = {
    componentId: "component-wall-cabinet-2",
    componentKey: "wall-cabinet-2",
    left: 20,
    top: 10,
    width: 15,
    height: 25,
  };
  const result = buildServiceClaimPartHotspots([sourceHotspot], [{
    partKey: "filter",
    articleCode: "FWK124",
    sourceComponentKey: "wall-cabinet-2",
  }], "ab-105805");

  assert.deepEqual(result, [sourceHotspot]);
});

test("shared hood, dishwasher, and cabinet areas expose contextual part choices", () => {
  const groups = buildServiceClaimComponentChoiceGroups([
    { componentId: "component-wall-cabinet-2", componentKey: "wall-cabinet-2", name: "Cabinet" },
    { componentId: "component-extractor-hood", name: "Extractor Hood" },
    { componentId: "component-claim-filter", componentKey: "wall-cabinet-2", claimPartKey: "filter", name: "Extractor Hood Filter" },
    { componentId: "component-claim-dishwasher", componentKey: "base-module-3", claimPartKey: "dishwasher", name: "Dishwasher" },
    { componentId: "component-claim-furniture-front", componentKey: "base-module-3", claimPartKey: "furniture-front", name: "Furniture Front" },
    { componentId: "component-base-module-1", componentKey: "base-module-1", name: "Corner Cabinet" },
    { componentId: "component-claim-blende-base-module-1", sourceComponentKey: "base-module-1", claimPartKey: "blende", isCompanionOption: true, name: "UPK20 Filler Panel" },
    { componentId: "component-claim-sink-cabinet", componentKey: "sink-base", claimPartKey: "sink-cabinet", name: "Sink Cabinet" },
    { componentId: "component-claim-sink", componentKey: "sink-base", claimPartKey: "sink", name: "Sink" },
    { componentId: "component-claim-blende-sink-base", sourceComponentKey: "sink-base", claimPartKey: "blende", isCompanionOption: true, name: "UPK20 Filler Panel" },
  ]);

  assert.deepEqual(
    groups.map((group) => ({
      triggerComponentId: group.triggerComponentId,
      optionIds: group.options.map((option) => option.componentId),
    })),
    [
      {
        triggerComponentId: "component-wall-cabinet-2",
        optionIds: [
          "component-wall-cabinet-2",
          "component-extractor-hood",
          "component-claim-filter",
        ],
      },
      {
        triggerComponentId: "component-claim-dishwasher",
        optionIds: ["component-claim-dishwasher", "component-claim-furniture-front"],
      },
      {
        triggerComponentId: "component-base-module-1",
        optionIds: ["component-base-module-1", "component-claim-blende-base-module-1"],
      },
      {
        triggerComponentId: "component-claim-sink-cabinet",
        optionIds: ["component-claim-sink-cabinet", "component-claim-blende-sink-base"],
      },
    ],
  );
});

test("every cabinet Blende is offered as a contextual choice with its source cabinet", () => {
  const groups = buildServiceClaimComponentChoiceGroups([
    {
      componentId: "component-wall-cabinet-4",
      componentKey: "wall-cabinet-4",
      name: "Upper Cabinet 60",
    },
    {
      componentId: "component-claim-blende-wall-cabinet-4",
      sourceComponentKey: "wall-cabinet-4",
      claimPartKey: "blende",
      name: "HPK2002 Filler Panel",
    },
  ]);

  assert.deepEqual(groups.map((group) => ({
    triggerComponentId: group.triggerComponentId,
    optionIds: group.options.map((option) => option.componentId),
  })), [{
    triggerComponentId: "component-wall-cabinet-4",
    optionIds: [
      "component-wall-cabinet-4",
      "component-claim-blende-wall-cabinet-4",
    ],
  }]);
});

test("kitchens expose oven/cooktop/drawer and sink-cabinet/sink/faucet choices", () => {
  const groups = buildServiceClaimComponentChoiceGroups([
    { componentId: "component-claim-oven", claimPartKey: "oven", name: "Built-in Oven" },
    { componentId: "component-claim-oven-drawer", claimPartKey: "oven-drawer", name: "Oven Drawer" },
    { componentId: "component-claim-cooktop", claimPartKey: "cooktop", name: "Cooktop" },
    { componentId: "component-claim-sink", claimPartKey: "sink", name: "Sink" },
    { componentId: "component-claim-sink-cabinet", claimPartKey: "sink-cabinet", name: "Sink Cabinet" },
    { componentId: "component-claim-faucet", claimPartKey: "faucet", name: "Faucet" },
  ]);

  assert.deepEqual(
    groups.map((group) => ({
      triggerComponentId: group.triggerComponentId,
      optionIds: group.options.map((option) => option.componentId),
    })),
    [
      {
        triggerComponentId: "component-claim-oven",
        optionIds: [
          "component-claim-oven",
          "component-claim-cooktop",
          "component-claim-oven-drawer",
        ],
      },
      {
        triggerComponentId: "component-claim-sink-cabinet",
        optionIds: [
          "component-claim-sink-cabinet",
          "component-claim-sink",
          "component-claim-faucet",
        ],
      },
    ],
  );

  assert.deepEqual(buildServiceClaimComponentChoiceGroups([
    { componentId: "component-claim-oven", claimPartKey: "oven" },
    { componentId: "component-claim-cooktop", claimPartKey: "cooktop" },
  ]), []);
});

test("oven, cooktop, and oven-drawer selections collapse to one choice group", () => {
  const groups = buildServiceClaimComponentChoiceGroups([
    { componentId: "component-claim-oven", claimPartKey: "oven", name: "Oven" },
    { componentId: "component-claim-cooktop", claimPartKey: "cooktop", name: "Cooktop" },
    { componentId: "component-claim-oven-drawer", claimPartKey: "oven-drawer", name: "Oven Drawer" },
  ]);

  assert.deepEqual(
    normalizeServiceClaimComponentChoiceSelection([
      "component-claim-cooktop",
      "component-claim-oven-drawer",
      "component-claim-oven",
    ], groups),
    ["component-claim-oven"],
  );
});

test("hood cabinet, extractor, and filter selections collapse to one choice group", () => {
  const groups = buildServiceClaimComponentChoiceGroups([
    { componentId: "component-wall-cabinet-2", componentKey: "wall-cabinet-2", name: "Cabinet" },
    { componentId: "component-extractor-hood", name: "Extractor Hood" },
    { componentId: "component-claim-filter", componentKey: "wall-cabinet-2", claimPartKey: "filter", name: "Extractor Hood Filter" },
  ]);

  assert.deepEqual(
    normalizeServiceClaimComponentChoiceSelection([
      "component-extractor-hood",
      "component-claim-filter",
      "component-wall-cabinet-2",
    ], groups),
    ["component-wall-cabinet-2"],
  );
});

test("L-shaped kitchens share sink-cabinet, sink, and faucet choices", () => {
  const groups = buildServiceClaimComponentChoiceGroups([
    { componentId: "component-claim-sink", claimPartKey: "sink", name: "Sink" },
    { componentId: "component-claim-sink-cabinet", claimPartKey: "sink-cabinet", name: "Sink Cabinet" },
    { componentId: "component-claim-faucet", claimPartKey: "faucet", name: "Faucet" },
  ]);

  assert.deepEqual(
    groups.map((group) => ({
      triggerComponentId: group.triggerComponentId,
      optionIds: group.options.map((option) => option.componentId),
    })),
    [
      {
        triggerComponentId: "component-claim-sink-cabinet",
        optionIds: [
          "component-claim-sink-cabinet",
          "component-claim-sink",
          "component-claim-faucet",
        ],
      },
    ],
  );
});

test("sink fixture choices merge with an existing sink-cabinet companion group", () => {
  const groups = buildServiceClaimComponentChoiceGroups([
    { componentId: "component-claim-sink", componentKey: "sink-faucet", claimPartKey: "sink", name: "Sink" },
    { componentId: "component-claim-faucet", componentKey: "sink-faucet", claimPartKey: "faucet", name: "Faucet" },
    { componentId: "component-claim-sink-cabinet", componentKey: "sink-base", claimPartKey: "sink-cabinet", name: "Sink Cabinet" },
    { componentId: "component-claim-blende-sink-base", sourceComponentKey: "sink-base", claimPartKey: "blende", isCompanionOption: true, name: "UPK20 Filler Panel" },
  ]);

  assert.deepEqual(
    groups.map((group) => ({
      triggerComponentId: group.triggerComponentId,
      optionIds: group.options.map((option) => option.componentId),
    })),
    [
      {
        triggerComponentId: "component-claim-sink-cabinet",
        optionIds: [
          "component-claim-sink-cabinet",
          "component-claim-sink",
          "component-claim-faucet",
          "component-claim-blende-sink-base",
        ],
      },
    ],
  );
});

test("sink, faucet, and sink-cabinet selections collapse to one choice group", () => {
  const groups = buildServiceClaimComponentChoiceGroups([
    { componentId: "component-claim-sink", claimPartKey: "sink", name: "Sink" },
    { componentId: "component-claim-sink-cabinet", claimPartKey: "sink-cabinet", name: "Sink Cabinet" },
    { componentId: "component-claim-faucet", claimPartKey: "faucet", name: "Faucet" },
  ]);

  assert.deepEqual(
    normalizeServiceClaimComponentChoiceSelection([
      "component-claim-sink",
      "component-claim-faucet",
      "component-claim-sink-cabinet",
    ], groups),
    ["component-claim-sink-cabinet"],
  );
});


test("60 cm dishwasher bundles split into price-list dishwasher and furniture-front claims", () => {
  const dishwasherBundle = component(
    "DISH-AB105806-600",
    "base-module-3",
    "Fully integrated dishwasher incl. furniture front",
    {
      articleNumber: "A-EGSPV597210 + TGV60",
      isLocked: true,
    },
  );
  const claimParts = [
    {
      partKey: "dishwasher",
      articleCode: "A-EGSPV594400",
      name: "Fully Integrated Dishwasher",
      nameDe: "Vollintegrierter Geschirrspüler",
      sourceKitchenItemCode: dishwasherBundle.code,
      sourceComponentKey: dishwasherBundle.componentKey,
    },
    {
      partKey: "furniture-front",
      articleCode: "TGV60",
      name: "Furniture Front (Dishwasher)",
      nameDe: "Möbelfront (Geschirrspüler)",
      sourceKitchenItemCode: dishwasherBundle.code,
      sourceComponentKey: dishwasherBundle.componentKey,
    },
  ];
  const result = buildServiceClaimSelectableComponents({
    kitchen: { items: [dishwasherBundle] },
    kitchenConfig: { components: [dishwasherBundle] },
    kitchenSlug: "ab-105805",
    claimParts,
  });

  assert.ok(!result.selectableComponentIds.includes("component-base-module-3"));
  assert.deepEqual(result.selectableComponentIds, [
    "component-claim-dishwasher",
    "component-claim-furniture-front",
  ]);
  assert.deepEqual(
    result.selectableComponents.map(({ componentId, articleCode, name, nameDe }) => ({
      componentId,
      articleCode,
      name,
      nameDe,
    })),
    [
      {
        componentId: "component-claim-dishwasher",
        articleCode: "A-EGSPV594400",
        name: "Fully Integrated Dishwasher",
        nameDe: "Vollintegrierter Geschirrspüler",
      },
      {
        componentId: "component-claim-furniture-front",
        articleCode: "TGV60",
        name: "Furniture Front (Dishwasher)",
        nameDe: "Möbelfront (Geschirrspüler)",
      },
    ],
  );
  assert.deepEqual(
    getServiceClaimLinkedComponentIds("ab-105805", "component-claim-furniture-front"),
    ["component-claim-furniture-front"],
  );
});

test("optional dishwasher claim parts stay hidden until the dishwasher is ordered", () => {
  const defaultCabinet = component("CAB-BASE-DEFAULT", "base-module-1", "Default base", {
    isLocked: true,
  });
  const dishwasherBundle = component(
    "DISH-AB105806-600",
    "base-module-3",
    "Fully integrated dishwasher incl. furniture front",
    {
      articleNumber: "A-EGSPV597210 + TGV60",
    },
  );
  const claimParts = [
    {
      partKey: "dishwasher",
      articleCode: "A-EGSPV594400",
      name: "Fully Integrated Dishwasher",
      nameDe: "Vollintegrierter Geschirrspüler",
      sourceKitchenItemCode: dishwasherBundle.code,
      sourceComponentKey: dishwasherBundle.componentKey,
    },
    {
      partKey: "furniture-front",
      articleCode: "TGV60",
      name: "Furniture Front (Dishwasher)",
      nameDe: "Möbelfront (Geschirrspüler)",
      sourceKitchenItemCode: dishwasherBundle.code,
      sourceComponentKey: dishwasherBundle.componentKey,
    },
  ];

  const result = buildServiceClaimSelectableComponents({
    kitchen: { items: [defaultCabinet, dishwasherBundle] },
    kitchenConfig: { components: [defaultCabinet, dishwasherBundle] },
    kitchenSlug: "ab-105805",
    confirmedItems: [],
    claimParts,
  });

  assert.deepEqual(result.selectableComponentIds, ["component-base-module-1"]);
  assert.ok(!result.selectableComponentIds.includes("component-claim-dishwasher"));
  assert.ok(!result.selectableComponentIds.includes("component-claim-furniture-front"));
  assert.ok(!result.selectableComponents.some((entry) => entry.code === "A-EGSPV594400"));
  assert.ok(!result.selectableComponents.some((entry) => entry.code === "TGV60"));
});

test("dishwasher owns the plan hotspot while the furniture front stays manual", () => {
  const sourceHotspot = {
    componentId: "component-base-module-3",
    componentKey: "base-module-3",
    left: 60,
    top: 55,
    width: 12,
    height: 30,
  };
  const result = buildServiceClaimPartHotspots([sourceHotspot], [
    { partKey: "dishwasher", sourceComponentKey: "base-module-3" },
    { partKey: "furniture-front", sourceComponentKey: "base-module-3" },
  ], "ab-105805");

  assert.equal(result.length, 1);
  assert.equal(result[0].componentId, "component-claim-dishwasher");
  assert.equal(result[0].claimPartKey, "dishwasher");
  assert.equal(result[0].left, sourceHotspot.left);
  assert.equal(result[0].width, sourceHotspot.width);
});

test("45 cm dishwasher bundles remain unchanged without 60 cm claim parts", () => {
  const dishwasherBundle = component("DISH-AB105747-450", "base-module-3", "Dishwasher 45 cm", {
    articleNumber: "A-EGSPV587915 + TGV45",
    isLocked: true,
  });
  const result = buildServiceClaimSelectableComponents({
    kitchen: { items: [dishwasherBundle] },
    kitchenConfig: { components: [dishwasherBundle] },
    kitchenSlug: "ab-105747",
    claimParts: [],
  });

  assert.deepEqual(result.selectableComponentIds, ["component-base-module-3"]);
  assert.equal(result.selectableComponents[0].articleCode, "A-EGSPV587915 + TGV45");
});

test("L-kitchen quantity-two Blenden are exposed as independent claim selections", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-WITH-TWO-BLENDEN", "base-module-2", "Base Cabinet", {
        articleNumber: "US50",
        widthMm: 500,
        isLocked: true,
        blendeCode: "UPK20 x2",
        blendeLabel: "UPK20 Passblende x 2",
      }),
    ],
  };

  [
    "ab-105822", "ab-105825", "ab-105828", "ab-105831",
    "ab-105834", "ab-105837", "ab-105840", "ab-105843",
  ].forEach((kitchenSlug) => {
    const result = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig: { components: kitchen.items },
      kitchenSlug,
    });
    const blenden = result.selectableComponents.filter((entry) => entry.claimPartKey === "blende");

    assert.equal(blenden.length, 2, `${kitchenSlug} exposes both Blenden`);
    assert.deepEqual(blenden.map((entry) => entry.blendeIndex), [1, 2]);
    assert.deepEqual(blenden.map((entry) => entry.componentId), [
      "component-claim-blende-base-module-2",
      "component-claim-blende-base-module-2-2",
    ]);
  });
});

test("L-kitchen double Blenden follow the two adjacent PDF corner seams", () => {
  const families = [
    {
      slugs: ["ab-105822", "ab-105825", "ab-105828"],
      outer: 42.661727,
      divider: 43.54517,
      inner: 44.286121,
      right: 53.44,
    },
    {
      slugs: ["ab-105831"],
      outer: 42.376746,
      divider: 43.288686,
      inner: 44.029638,
      right: 53.25,
    },
    {
      slugs: ["ab-105834"],
      outer: 51.809632,
      divider: 52.807068,
      inner: 53.918495,
      right: 62.3,
    },
    {
      slugs: ["ab-105837", "ab-105840", "ab-105843"],
      outer: 52.037618,
      divider: 52.949558,
      inner: 53.975492,
      right: 61.64,
    },
  ];
  const firstBlende = {
    componentId: "component-claim-blende-base-module-2",
    componentKey: "claim-blende-base-module-2",
    sourceComponentKey: "base-module-2",
    claimPartKey: "blende",
    blendeQuantity: 2,
    blendeIndex: 1,
  };
  const secondBlende = {
    ...firstBlende,
    componentId: "component-claim-blende-base-module-2-2",
    componentKey: "claim-blende-base-module-2-2",
    blendeIndex: 2,
  };

  families.forEach(({ slugs, outer, divider, inner, right }) => {
    slugs.forEach((kitchenSlug) => {
      const result = buildServiceClaimBlendeHotspots([
        { componentKey: "base-module-2", left: outer, top: 55, width: right - outer, height: 30 },
      ], [firstBlende, secondBlende], [], kitchenSlug);
      const cabinet = result.find((entry) => entry.componentKey === "base-module-2");
      const strips = result.filter((entry) => entry.claimPartKey === "blende");

      assert.equal(strips.length, 2);
      assert.ok(Math.abs(cabinet.left - inner) < 0.000001);
      assert.ok(Math.abs(strips[0].left - outer) < 0.000001);
      assert.ok(Math.abs(strips[0].left + strips[0].width - divider) < 0.000001);
      assert.ok(Math.abs(strips[1].left - divider) < 0.000001);
      assert.ok(Math.abs(strips[1].left + strips[1].width - inner) < 0.000001);
      assert.deepEqual(strips.map((entry) => entry.blendeSide), ["left", "left"]);
    });
  });
});

test("L-kitchen single Blenden use their complete PDF-drawn end faces", () => {
  const cases = [
    ["ab-105825", "wall-cabinet-1", 48.161869, 48.902821, "left"],
    ["ab-105831", "wall-cabinet-1", 47.990881, 48.760331, "left"],
    ["ab-105831", "base-module-1", 14.55, 20.45, "right"],
    ["ab-105834", "wall-cabinet-3", 59.447136, 60.444571, "right"],
    ["ab-105834", "base-module-3", 82.67, 94.54, "right"],
    ["ab-105837", "wall-cabinet-3", 58.991166, 59.931604, "right"],
    ["ab-105840", "wall-cabinet-3", 58.991166, 59.931604, "right"],
    ["ab-105843", "wall-cabinet-3", 58.991166, 59.931604, "right"],
  ];

  cases.forEach(([kitchenSlug, sourceComponentKey, outer, inner, side]) => {
    const left = Math.min(outer, inner);
    const right = Math.max(outer, inner);
    const sourceLeft = side === "left" ? left : Math.max(0, left - 10);
    const sourceRight = side === "right" ? right : Math.min(100, right + 10);
    const result = buildServiceClaimBlendeHotspots([
      { componentKey: sourceComponentKey, left: sourceLeft, top: 10, width: sourceRight - sourceLeft, height: 30 },
    ], [{
      componentId: `component-claim-blende-${sourceComponentKey}`,
      componentKey: `claim-blende-${sourceComponentKey}`,
      sourceComponentKey,
      claimPartKey: "blende",
      blendeQuantity: 1,
    }], [], kitchenSlug);
    const blende = result.find((entry) => entry.claimPartKey === "blende");

    assert.ok(blende, `${kitchenSlug} ${sourceComponentKey} exposes its Blende`);
    assert.ok(Math.abs(blende.left - left) < 0.000001);
    assert.ok(Math.abs(blende.width - (right - left)) < 0.000001);
    assert.equal(blende.blendeSide, side);
  });
});

test("service claim blende hotspot is split from the cabinet outer edge", () => {
  const hotspots = [
    { componentKey: "base-module-2", left: 37.09, top: 55.6, width: 11.8, height: 22.57 },
    { componentKey: "base-module-3", left: 64.21, top: 55.6, width: 10.44, height: 22.57 },
    { componentKey: "sink-base", left: 74.65, top: 55.6, width: 10.89, height: 22.57 },
  ];
  const result = buildServiceClaimBlendeHotspots(hotspots, [{
    componentId: "component-claim-blende-base-module-3",
    componentKey: "claim-blende-base-module-3",
    sourceComponentKey: "base-module-3",
    claimPartKey: "blende",
    blendeQuantity: 1,
  }]);
  const cabinet = result.find((hotspot) => hotspot.componentKey === "base-module-3");
  const blende = result.find((hotspot) => hotspot.claimPartKey === "blende");

  assert.ok(Math.abs(cabinet.left - 64.65) < 0.000001);
  assert.ok(Math.abs(cabinet.width - 10) < 0.000001);
  assert.equal(cabinet.claimBlendeSplit, true);
  assert.equal(blende.left, 64.21);
  assert.ok(Math.abs(blende.width - 0.44) < 0.000001);
  assert.equal(blende.componentId, "component-claim-blende-base-module-3");
  assert.equal(blende.blendeSide, "left");
  assert.equal(blende.claimBlendeSplit, true);
});

test("service claim blende split follows the measured cabinet scale", () => {
  const hotspots = [
    { componentKey: "base-module-1", left: 18.24, top: 64.25, width: 9.94, height: 30.91 },
    { componentKey: "base-module-2", left: 43.12, top: 64.25, width: 9.94, height: 30.91 },
    { componentKey: "base-module-3", left: 53.06, top: 64.25, width: 14.92, height: 30.91 },
    { componentKey: "sink-base", left: 67.98, top: 64.25, width: 14.94, height: 30.91 },
    { componentKey: "drawer-module", left: 82.92, top: 64.25, width: 15.67, height: 30.91 },
  ];
  const components = [
    { componentKey: "base-module-1", widthMm: 400 },
    { componentKey: "base-module-2", widthMm: 400 },
    { componentKey: "drawer-module", widthMm: 600, blendeCode: "UPK20" },
  ];
  const result = buildServiceClaimBlendeHotspots(hotspots, [{
    componentId: "component-claim-blende-drawer-module",
    componentKey: "claim-blende-drawer-module",
    sourceComponentKey: "drawer-module",
    sourceWidthMm: 600,
    claimPartKey: "blende",
    blendeQuantity: 1,
  }], components, "ab-105806");
  const cabinet = result.find((hotspot) => hotspot.componentKey === "drawer-module");
  const blende = result.find((hotspot) => hotspot.claimPartKey === "blende");

  assert.ok(Math.abs(blende.width - (98.575093 - 97.834141)) < 0.000001);
  assert.ok(Math.abs(cabinet.left + cabinet.width - blende.left) < 0.000001);
  assert.ok(Math.abs(blende.left - 97.834141) < 0.000001);
  assert.ok(Math.abs(blende.left + blende.width - 98.575093) < 0.000001);
});

test("AB 105808 claim Blenden use the exact PDF divider pixels", () => {
  const hotspots = [
    { componentKey: "wall-cabinet-6", left: 81.23, top: 15.89, width: 15.07, height: 24.09 },
    { componentKey: "drawer-module", left: 81.23, top: 58.81, width: 15.07, height: 29.25 },
  ];
  const blenden = [
    {
      componentId: "component-claim-blende-wall-cabinet-6",
      componentKey: "claim-blende-wall-cabinet-6",
      sourceComponentKey: "wall-cabinet-6",
      claimPartKey: "blende",
      blendeQuantity: 1,
    },
    {
      componentId: "component-claim-blende-drawer-module",
      componentKey: "claim-blende-drawer-module",
      sourceComponentKey: "drawer-module",
      claimPartKey: "blende",
      blendeQuantity: 1,
    },
  ];
  const result = buildServiceClaimBlendeHotspots(hotspots, blenden, [], "ab-105808");
  const calibrated = result.filter((hotspot) => hotspot.claimPartKey === "blende");

  assert.equal(calibrated.length, 2);
  calibrated.forEach((hotspot) => {
    assert.ok(Math.abs(hotspot.left - 95.354802) < 0.000001);
    assert.ok(Math.abs(hotspot.width - (96.295241 - 95.354802)) < 0.000001);
  });
});

test("AB 105810 claim Blenden use the exact PDF divider pixels", () => {
  const hotspots = [
    { componentKey: "wall-cabinet-6", left: 80.01, top: 15.77, width: 14.85, height: 23.91 },
    { componentKey: "drawer-module", left: 80.01, top: 58.37, width: 14.85, height: 28.99 },
  ];
  const blenden = ["wall-cabinet-6", "drawer-module"].map((sourceComponentKey) => ({
    componentId: `component-claim-blende-${sourceComponentKey}`,
    componentKey: `claim-blende-${sourceComponentKey}`,
    sourceComponentKey,
    claimPartKey: "blende",
    blendeQuantity: 1,
  }));
  const result = buildServiceClaimBlendeHotspots(hotspots, blenden, [], "ab-105810");
  const calibrated = result.filter((hotspot) => hotspot.claimPartKey === "blende");

  assert.equal(calibrated.length, 2);
  calibrated.forEach((hotspot) => {
    assert.ok(Math.abs(hotspot.left - 94.015389) < 0.000001);
    assert.ok(Math.abs(hotspot.width - (94.727843 - 94.015389)) < 0.000001);
  });
});

test("additional claim Blenden use their exact source-plan divider pixels", () => {
  const kitchens = [
    {
      slug: "ab-105732",
      hotspots: [
        { componentKey: "wall-cabinet-4", left: 70.73, top: 17.18, width: 16.94, height: 26.71 },
        { componentKey: "sink-base", left: 70.73, top: 64.76, width: 16.94, height: 32.44 },
      ],
      expected: {
        "wall-cabinet-4": { side: "right", outer: 87.691211, inner: 86.394299 },
        "sink-base": { side: "right", outer: 87.691211, inner: 86.394299 },
      },
    },
    {
      slug: "ab-105733",
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 4.82, top: 17.18, width: 9.22, height: 26.71 },
        { componentKey: "base-module-1", left: 4.82, top: 64.76, width: 9.13, height: 32.44 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 4.831354, inner: 6.213777 },
        "base-module-1": { side: "left", outer: 4.831354, inner: 6.142518 },
      },
    },
    {
      slug: "ab-105744",
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 0.85, top: 19.8, width: 14.8, height: 24.45 },
        { componentKey: "base-module-1", left: 0.85, top: 63.35, width: 14.8, height: 29.71 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 0.855107, inner: 1.325416 },
        "base-module-1": { side: "left", outer: 0.855107, inner: 1.325416 },
      },
    },
    {
      slug: "ab-105746",
      hotspots: [
        { componentKey: "wall-cabinet-4", left: 73.84, top: 17.18, width: 16.99, height: 26.71 },
        { componentKey: "sink-base", left: 73.84, top: 64.76, width: 16.99, height: 32.44 },
      ],
      expected: {
        "wall-cabinet-4": { side: "right", outer: 90.826603, inner: 89.501188 },
        "sink-base": { side: "right", outer: 90.826603, inner: 89.515439 },
      },
    },
    {
      slug: "ab-105807",
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 4.49, top: 16.01, width: 16.46, height: 26.73 },
        { componentKey: "drawer-module", left: 4.49, top: 63.63, width: 16.46, height: 32.5 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 4.502707, inner: 5.272157 },
        "drawer-module": { side: "left", outer: 4.502707, inner: 5.272157 },
      },
    },
    {
      slug: "ab-105811",
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 2.8, top: 17.34, width: 16.54, height: 26.73 },
        { componentKey: "base-module-1", left: 2.8, top: 64.92, width: 16.54, height: 32.52 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 2.878313, inner: 3.676261 },
        "base-module-1": { side: "left", outer: 2.878313, inner: 3.676261 },
      },
    },
    {
      slug: "ab-105812",
      hotspots: [
        { componentKey: "wall-cabinet-6", left: 81.23, top: 16.85, width: 15.17, height: 24.32 },
        { componentKey: "drawer-module", left: 81.23, top: 60.16, width: 15.17, height: 29.54 },
      ],
      expected: {
        "wall-cabinet-6": { side: "right", outer: 96.46623, inner: 95.497293 },
        "drawer-module": { side: "right", outer: 96.46623, inner: 95.497293 },
      },
    },
    {
      slug: "ab-105815",
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 3, top: 17.34, width: 16.51, height: 26.73 },
        { componentKey: "base-module-1", left: 3, top: 64.82, width: 16.51, height: 32.62 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 2.878313, inner: 3.676261 },
        "base-module-1": { side: "left", outer: 2.878313, inner: 3.676261 },
      },
    },
    {
      slug: "ab-105814",
      hotspots: [
        { componentKey: "wall-cabinet-6", left: 80.01, top: 15.77, width: 14.85, height: 23.91 },
        { componentKey: "drawer-module", left: 80.02, top: 58.37, width: 14.71, height: 29 },
      ],
      expected: {
        "wall-cabinet-6": { side: "right", outer: 94.727843, inner: 94.015389 },
        "drawer-module": { side: "right", outer: 94.727843, inner: 94.015389 },
      },
    },
    {
      slug: "ab-105820",
      hotspots: [
        { componentKey: "wall-cabinet-6", left: 81.26, top: 17.5, width: 15.04, height: 24.27 },
        { componentKey: "drawer-module", left: 81.26, top: 60.88, width: 15.04, height: 29.42 },
      ],
      expected: {
        "wall-cabinet-6": { side: "right", outer: 96.46623, inner: 95.497293 },
        "drawer-module": { side: "right", outer: 96.46623, inner: 95.497293 },
      },
    },
    {
      slug: "ab-105816",
      hotspots: [
        { componentKey: "wall-cabinet-6", left: 81.23, top: 15.97, width: 15.21, height: 24.27 },
        { componentKey: "drawer-module", left: 81.23, top: 59.25, width: 15.21, height: 29.5 },
      ],
      expected: {
        "wall-cabinet-6": { side: "right", outer: 96.46623, inner: 95.497293 },
        "drawer-module": { side: "right", outer: 96.46623, inner: 95.497293 },
      },
    },
    {
      slug: "ab-105818",
      hotspots: [
        { componentKey: "wall-cabinet-6", left: 80.01, top: 15.77, width: 14.85, height: 23.91 },
        { componentKey: "drawer-module", left: 80.01, top: 58.37, width: 14.85, height: 28.99 },
      ],
      expected: {
        "wall-cabinet-6": { side: "right", outer: 94.727843, inner: 94.015389 },
        "drawer-module": { side: "right", outer: 94.727843, inner: 94.015389 },
      },
    },
    {
      slug: "ab-105819",
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 3, top: 17.34, width: 16.51, height: 26.73 },
        { componentKey: "base-module-1", left: 3, top: 64.82, width: 16.51, height: 32.62 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 2.878313, inner: 3.676261 },
        "base-module-1": { side: "left", outer: 2.878313, inner: 3.676261 },
      },
    },
    {
      slug: "ab-105827",
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 12.11, top: 15.85, width: 12.28, height: 22.88 },
        { componentKey: "base-module-1", left: 12.11, top: 56.61, width: 12.28, height: 22.87 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 12.111713, inner: 13.22314 },
        "base-module-1": { side: "left", outer: 12.111713, inner: 13.22314 },
      },
    },
    {
      slug: "ab-105830",
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 12.11, top: 15.85, width: 12.28, height: 22.88 },
        { componentKey: "base-module-1", left: 12.11, top: 56.61, width: 12.28, height: 22.87 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 12.111713, inner: 13.22314 },
        "base-module-1": { side: "left", outer: 12.111713, inner: 13.22314 },
      },
    },
    {
      slug: "ab-105836",
      hotspots: [
        { componentKey: "wall-cabinet-3", left: 35.79, top: 22.3, width: 14, height: 18.71 },
        { componentKey: "base-module-2", left: 35.79, top: 55.83, width: 14, height: 22.89 },
        { componentKey: "wall-cabinet-4", left: 63.66, top: 22.94, width: 10.55, height: 18.71 },
        { componentKey: "base-module-3", left: 63.66, top: 55.83, width: 10.55, height: 22.89 },
        { componentKey: "wall-cabinet-6", left: 85.27, top: 22.94, width: 11.75, height: 18.71 },
        { componentKey: "drawer-module", left: 85.27, top: 55.83, width: 11.76, height: 22.89 },
      ],
      expected: {
        "wall-cabinet-3": { side: "right", outer: 49.615275, inner: 46.822457 },
        "base-module-2": { side: "right", outer: 49.615275, inner: 46.822457 },
        "wall-cabinet-4": { side: "left", outer: 63.721858, inner: 65.004275 },
        "base-module-3": { side: "left", outer: 63.721858, inner: 65.004275 },
        "wall-cabinet-6": { side: "right", outer: 97.007694, inner: 96.323739 },
        "drawer-module": { side: "right", outer: 97.007694, inner: 96.323739 },
      },
    },
    {
      slug: "ab-105835",
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 0.9, top: 18.87, width: 14.46, height: 22.8 },
        { componentKey: "base-module-1", left: 0.9, top: 59.48, width: 14.46, height: 22.82 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.99487 },
        "base-module-1": { side: "left", outer: 0.883443, inner: 1.99487 },
      },
    },
    ...["ab-105838", "ab-105841", "ab-105844"].map((slug) => ({
      slug,
      hotspots: [
        { componentKey: "wall-cabinet-1", left: 0.9, top: 19.23, width: 13.98, height: 22.73 },
        { componentKey: "base-module-1", left: 0.9, top: 59.9, width: 13.98, height: 27.44 },
      ],
      expected: {
        "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.5389 },
        "base-module-1": { side: "left", outer: 0.883443, inner: 1.5389 },
      },
    })),
    {
      slug: "ab-105823",
      hotspots: [
        { componentKey: "wall-cabinet-5", left: 77.93, top: 16.41, width: 15.81, height: 24.19 },
        { componentKey: "sink-base", left: 77.94, top: 59.5, width: 15.8, height: 24.16 },
      ],
      expected: {
        "wall-cabinet-5": { side: "right", outer: 93.986891, inner: 92.077515 },
        "sink-base": { side: "right", outer: 93.986891, inner: 92.077515 },
      },
    },
    {
      slug: "ab-105829",
      hotspots: [
        { componentKey: "wall-cabinet-5", left: 77.93, top: 16.41, width: 15.81, height: 24.19 },
        { componentKey: "sink-base", left: 77.94, top: 59.5, width: 15.8, height: 24.16 },
      ],
      expected: {
        "wall-cabinet-5": { side: "right", outer: 93.986891, inner: 92.077515 },
        "sink-base": { side: "right", outer: 93.986891, inner: 92.077515 },
      },
    },
    {
      slug: "ab-105832",
      hotspots: [
        { componentKey: "wall-cabinet-5", left: 77.93, top: 16.41, width: 15.81, height: 24.19 },
        { componentKey: "sink-base", left: 77.94, top: 59.5, width: 15.8, height: 24.16 },
      ],
      expected: {
        "wall-cabinet-5": { side: "right", outer: 93.986891, inner: 92.077515 },
        "sink-base": { side: "right", outer: 93.986891, inner: 92.077515 },
      },
    },
    {
      slug: "ab-105826",
      hotspots: [
        { componentKey: "base-module-1", left: 20.8, top: 59.15, width: 14.05, height: 24.04 },
        { componentKey: "sink-base", left: 77.09, top: 59.15, width: 15.73, height: 24.04 },
        { componentKey: "wall-cabinet-5", left: 77.09, top: 16.45, width: 15.73, height: 23.99 },
      ],
      expected: {
        "base-module-1": { side: "left", outer: 20.404674, inner: 20.789399 },
        "sink-base": { side: "right", outer: 92.818467, inner: 91.165574 },
        "wall-cabinet-5": { side: "right", outer: 92.818467, inner: 91.165574 },
      },
    },
  ];

  kitchens.forEach(({ slug, hotspots, expected }) => {
    const blenden = Object.keys(expected).map((sourceComponentKey) => ({
      componentId: `component-claim-blende-${sourceComponentKey}`,
      componentKey: `claim-blende-${sourceComponentKey}`,
      sourceComponentKey,
      claimPartKey: "blende",
      blendeQuantity: 1,
    }));
    const result = buildServiceClaimBlendeHotspots(hotspots, blenden, [], slug);

    Object.entries(expected).forEach(([sourceComponentKey, bounds]) => {
      const cabinet = result.find((hotspot) => hotspot.componentKey === sourceComponentKey);
      const blende = result.find((hotspot) =>
        hotspot.claimPartKey === "blende" && hotspot.sourceComponentKey === sourceComponentKey,
      );
      const left = Math.min(bounds.inner, bounds.outer);
      const right = Math.max(bounds.inner, bounds.outer);

      assert.ok(blende, `${slug} ${sourceComponentKey} exposes a Blende hotspot`);
      assert.ok(Math.abs(blende.left - left) < 0.000001);
      assert.ok(Math.abs(blende.width - (right - left)) < 0.000001);
      if (bounds.side === "left") {
        assert.ok(Math.abs(cabinet.left - right) < 0.000001);
      } else {
        assert.ok(Math.abs(cabinet.left + cabinet.width - left) < 0.000001);
      }
    });
  });
});

test("claims-only blende hit areas do not render artificial plan seams", () => {
  const pickerSource = fs.readFileSync(path.join(repoRoot, "components", "service-claim-kitchen-picker.jsx"), "utf8");
  const styleSource = fs.readFileSync(path.join(repoRoot, "components", "kitchen-configurator.module.css"), "utf8");

  assert.match(pickerSource, /if \(hotspot\.claimBlendeSplit\) \{\s*return null;/);
  assert.match(pickerSource, /hotspot\.claimBlendeSplit \? styles\.planHotspotBlendeSplit/);
  assert.match(styleSource, /\.planHotspotBlendeSplit[\s\S]*border:\s*0;[\s\S]*border-radius:\s*0;[\s\S]*background-clip:\s*border-box;[\s\S]*box-shadow:\s*none;/);
});

test("a two-quantity cabinet blende exposes both outer strips under one claim area", () => {
  const result = buildServiceClaimBlendeHotspots([
    { componentKey: "base-module-2", left: 40, top: 50, width: 10, height: 25 },
  ], [{
    componentId: "component-claim-blende-base-module-2",
    componentKey: "claim-blende-base-module-2",
    sourceComponentKey: "base-module-2",
    claimPartKey: "blende",
    blendeQuantity: 2,
  }]);

  assert.deepEqual(
    result.filter((hotspot) => hotspot.claimPartKey === "blende").map((hotspot) => hotspot.blendeSide),
    ["left", "right"],
  );
});

test("service claim kitchen plan falls back to default components before any confirmed order", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-A", "base-module-1", "Base A", { isLocked: true }),
      component("CAB-BASE-B", "base-module-2", "Base B"),
      { itemType: "ACCESSORY", code: "ACC-1", componentKey: "ignored", name: "Accessory" },
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105806",
    confirmedItems: [],
  });

  assert.deepEqual(result.selectableComponentIds, ["component-base-module-1"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["CAB-BASE-A"]);
  assert.equal(result.source, "kitchen");
});

test("AB 105805 service claim plan keeps the extractor hood separate from the LED set", () => {
  const kitchen = {
    items: [
      component("CAB-HOOD-AB105806-600", "wall-cabinet-2", "Upper Cabinet with Extractor Hood 60 cm"),
      component("HOOD-AB105806-FH664621E", "extractor-hood", "FH664621E Extractor Hood"),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105805",
    confirmedItems: [
      { itemType: "COMPONENT", code: "CAB-HOOD-AB105806-600", nameSnapshot: "Upper Cabinet with Extractor Hood 60 cm" },
    ],
  });

  assert.ok(result.selectableComponentIds.includes("component-extractor-hood"));
  assert.ok(!result.selectableComponentIds.includes("component-under-cabinet-light"));
  assert.ok(!result.selectableComponents.some((entry) => entry.code === "ACC-LIGHT-003"));
  assert.deepEqual(
    getServiceClaimLinkedComponentIds("ab-105805", "component-extractor-hood"),
    ["component-extractor-hood"],
  );
});

test("all seeded FH664621E hoods use a supported catalog article number", () => {
  const seedSource = fs.readFileSync(path.join(repoRoot, "prisma", "seed.js"), "utf8");
  const flatHoodRows = seedSource
    .split("\n")
    .filter((line) => line.includes('componentKey: "extractor-hood"') && line.includes("FH664621E"));

  assert.ok(flatHoodRows.length > 0);
  flatHoodRows.forEach((line) => {
    assert.match(line, /articleNumber:\s*"(?:FH 664 621 E|FH664621E \+ FWK124 \+ HD6002)"/);
  });
});

test("service claim picker toggles the selected claim component", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "service-claim-kitchen-picker.jsx"), "utf8");
  const flowSource = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(source, /getServiceClaimLinkedComponentIds/);
  assert.match(source, /IMAGE_HOTSPOTS_BY_SLUG/);
  assert.match(source, /IMAGE_VIEW_BY_SLUG/);
  assert.match(source, /withBasePlinthExtension/);
  assert.match(source, /withCornerBlendeExtensions/);
  assert.match(source, /withDerivedSinkFaucet/);
  assert.match(source, /getPlanDisplayCrop/);
  assert.match(source, /cropPlanHotspot/);
  assert.match(source, /croppedPlanAspectRatio/);
  assert.match(source, /clipPath id=\{imageClipPathId\}/);
  assert.match(source, /className=\{styles\.planImageUnavailable\}[\s\S]*href=\{imageViewHref\}[\s\S]*preserveAspectRatio="none"/);
  assert.match(source, /className=\{styles\.planImagePurchased\}[\s\S]*clipPath=\{`url\(#\$\{imageClipPathId\}\)`\}/);
  assert.match(source, /getHotspotSvgPolygonPoints/);
  assert.match(source, /getServiceClaimLinkedComponentIds\(kitchenSlug,\s*hotspot\.componentId\)[\s\S]*\.includes\(hoveredComponentId\)/);
  assert.match(source, /styles\.planHotspotHover/);
  assert.match(source, /const isSelected = displaySelectedIds\.has\(hotspot\.componentId\);/);
  assert.match(source, /getServiceClaimLinkedComponentIds\(kitchenSlug,\s*componentId\)\.filter\(\(id\) => selectable\.has\(id\)\)/);
  assert.match(source, /const shouldRemove = ids\.some\(\(id\) => current\.has\(id\)\);/);
  assert.match(source, /!isLShapedClaimKitchen\(kitchenSlug\)/);
  assert.match(source, /service-claim-kitchen__manual-option/);
  assert.match(source, /togglePlanComponent\(sinkComponentId\)/);
  assert.match(source, /showManualCooktopOption/);
  assert.match(source, /buildServiceClaimComponentChoiceGroups/);
  assert.match(source, /togglePlanComponent\(hotspot\.componentId\)/);
  assert.doesNotMatch(source, /service-claim-kitchen__part-choices--floating/);
  assert.match(flowSource, /service-field__problem-area-part-select/);
  assert.match(flowSource, /PROBLEM_AREA_PART_SELECT_SELECTOR/);
  assert.match(flowSource, /document\.addEventListener\("pointerdown", handlePartSelectPointerDown\)/);
  assert.match(flowSource, /!partSelect\.contains\(event\.target\)[\s\S]*partSelect\.removeAttribute\("open"\)/);
  assert.match(flowSource, /event\.key !== "Escape"[\s\S]*partSelect\.querySelector\("summary"\)\?\.focus\(\)/);
  assert.match(flowSource, /handleProblemAreaPartChoice/);
  assert.match(flowSource, /area\.choiceGroup\.options\.map\(\(option\)/);
  assert.match(flowSource, /<ServiceClaimPartIcon[\s\S]*option=\{option\}[\s\S]*choiceGroup=\{area\.choiceGroup\}/);
  assert.match(flowSource, /service-field__problem-area-part-option-label/);
  assert.match(flowSource, /area\.selectedPartComponentIds\.includes\(option\.componentId\)/);
  assert.match(flowSource, /type="checkbox"/);
  assert.match(flowSource, /data-problem-area-part-choice-required/);
  assert.match(flowSource, /service-field--problem-area-row-has-part-choice/);
  assert.match(flowSource, /Array\.isArray\(storedPartChoices\)/);
  assert.match(flowSource, /area\.resolvedAreas\.map\(\(resolvedArea\)/);
  assert.match(flowSource, /\{area\.resolvedLabel\}/);
  assert.match(flowSource, /\{area\.resolvedArticleCode\}/);
  assert.match(flowSource, /resolvedArticleCode: displayedParts[\s\S]*\.join\(" \/ "\)/);
  assert.match(flowSource, /return rowParts\.map\(\(selectedPart, rowIndex\)/);
  assert.match(flowSource, /rowKey: `\$\{area\.componentId\}:\$\{rowComponentId\}`/);
  assert.match(flowSource, /kitchenPlanPartChoiceSelectedCount/);
  assert.match(flowSource, /singleSelectedPart[\s\S]*formatClaimAreaName\(singleSelectedPart, singleSelectedPart\.name, language\)/);
  assert.match(flowSource, /keptEntries\.length === entries\.length \? current : Object\.fromEntries\(keptEntries\)/);
  assert.match(flowSource, /visualValue=\{problemPlanDisplayComponentIds\}/);
  assert.match(flowSource, /onComponentToggle=\{handleProblemPlanComponentToggle\}/);
  assert.match(flowSource, /const nextChoiceIds = \[\];/);
  assert.match(flowSource, /return groupIsSelected[\s\S]*withoutGroup[\s\S]*choiceGroup\.triggerComponentId/);
  assert.match(flowSource, /confirmedProblemAreaChoiceByGroupKey/);
  assert.match(flowSource, /return selectedChoiceIds\.length[\s\S]*choiceGroup\.options\.map\(\(option\) => option\.componentId\)/);
  assert.doesNotMatch(flowSource, /confirmProblemAreaPartChoice/);
  assert.doesNotMatch(flowSource, /kitchenPlanPartChoiceConfirm/);
  assert.match(flowSource, /nextSelectedIds\.length[\s\S]*\[choiceGroup\.sourceComponentKey\]: true/);
  assert.match(flowSource, /!area\.selectedPartComponentIds\.length \|\| !area\.isPartChoiceConfirmed/);
  assert.match(flowSource, /confirmedChoiceGroupsJson/);
  assert.match(source, /if \(hotspotIds\.has\(componentId\)\) return componentId/);
  assert.match(source, /componentChoiceGroupByOptionId\.get\(componentId\)\?\.triggerComponentId/);
  assert.match(flowSource, /problemComponentIds[\s\S]*\.map\(\(componentId\) => componentById\.get\(componentId\)\)/);
  assert.match(flowSource, /collapseServiceClaimLinkedComponents\([\s\S]*selectedComponentsInSelectionOrder/);
  assert.doesNotMatch(source, /hasManualWorktopEndPanelOption/);
  assert.doesNotMatch(source, /togglePlanComponent\(worktopEndPanelComponentId\)/);
  assert.doesNotMatch(source, /worktopEndPanelOption/);
  assert.match(source, /togglePlanComponent\(cooktopComponentId\)/);
  assert.match(source, /labels\?\.sinkOption\s*\|\|\s*"Sink"/);
  assert.match(source, /labels\?\.cooktopOption\s*\|\|\s*"Cooktop"/);
});

test("service claim kitchen plan uses test order state for 111 contracts", () => {
  const source = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-plan.js"), "utf8");

  assert.match(source, /getOrderKindForContractNumber\(contract\.contractNumber\)/);
  assert.match(source, /getContractOrderState\(contract\.id,\s*prisma,\s*orderKind\)/);
});

test("AB 105834 claim hotspots keep sink and sink cabinet separate", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");

  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"corner-base"[\s\S]*\[\[62\.31,\s*59\.71\]/);
  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"sink-faucet"[\s\S]*\[\[69\.95,\s*45\.98\]/);
});

test("AB 105747 keeps the 45 cm dishwasher and US30 cabinet independently selectable", () => {
  const stageSource = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");
  const selectionSource = fs.readFileSync(path.join(repoRoot, "components", "kitchen-selection-utils.js"), "utf8");
  const seedSource = fs.readFileSync(path.join(repoRoot, "prisma", "seed.js"), "utf8");

  assert.match(stageSource, /"ab-105747":\s*\[[\s\S]*componentKey:\s*"base-module-3"[\s\S]*\[\[65\.957,\s*59\.886\],\s*\[71\.635,\s*61\.06\]/);
  assert.match(stageSource, /"ab-105747":\s*\[[\s\S]*componentKey:\s*"drawer-module"[\s\S]*\[\[71\.635,\s*61\.06\]/);
  assert.match(stageSource, /"ab-105747":\s*\[[\s\S]*componentKey:\s*"drawer-module"[\s\S]*\[\[76\.233,\s*61\.903\]/);
  assert.match(selectionSource, /"DISH-AB105747-450":\s*"7"/);
  assert.match(selectionSource, /"CAB-BASE-AB105747-US30":\s*"8"/);
  assert.match(seedSource, /articleNumber:\s*"A-EGSPV587915 \+ TGV45"[\s\S]*isFixedPricePackage:\s*true/);
  assert.match(seedSource, /code:\s*"DISH-AB105747-450"[\s\S]*price:\s*articlePrice\("A-EGSPV587915 \+ TGV45"\)/);
  assert.match(seedSource, /code:\s*"CAB-BASE-AB105747-US30"[\s\S]*componentKey:\s*"drawer-module"/);
});

test("AB 105750, AB 105753, and AB 105756 reuse the AB 105747 kitchen setup", () => {
  const stageSource = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");
  const selectionSource = fs.readFileSync(path.join(repoRoot, "components", "kitchen-selection-utils.js"), "utf8");
  const claimSource = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-hotspots.js"), "utf8");
  const seedSource = fs.readFileSync(path.join(repoRoot, "prisma", "seed.js"), "utf8");

  for (const planNumber of ["105750", "105753", "105756"]) {
    const slug = `ab-${planNumber}`;
    assert.match(seedSource, new RegExp(`slug:\\s*"${slug}"[\\s\\S]*items:\\s*AB_${planNumber}_ITEMS`));
    assert.match(stageSource, new RegExp(`"${slug}":\\s*"/plans/AB%20105747\\.svg"`));
    assert.match(stageSource, new RegExp(`IMAGE_HOTSPOTS_BY_SLUG\\["${slug}"\\]\\s*=\\s*IMAGE_HOTSPOTS_BY_SLUG\\["ab-105747"\\]`));
    assert.match(selectionSource, new RegExp(`"${slug}":\\s*\\[\\["component-wall-cabinet-2",\\s*"component-extractor-hood"\\]\\]`));
    assert.match(claimSource, new RegExp(`"${slug}"`));
  }
});

test("AB 105837 claim hotspot maps the hood LED strip to extractor hood", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");

  assert.match(source, /"ab-105837":\s*\[[\s\S]*componentKey:\s*"wall-cabinet-2"[\s\S]*\[\[37\.08,\s*15\.17\],\s*\[48\.02,\s*13\.59\],\s*\[48\.02,\s*37\.69\],\s*\[37\.08,\s*39\.38\]\]/);
  assert.match(source, /"ab-105837":\s*\[[\s\S]*componentKey:\s*"extractor-hood"[\s\S]*\[\[37\.08,\s*39\.38\],\s*\[48\.02,\s*37\.69\],\s*\[48\.02,\s*39\.38\],\s*\[37\.08,\s*41\.0\]\]/);
});

test("AB 105834 claim hotspot maps the hood LED strip to extractor hood", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");

  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"wall-cabinet-2"[\s\S]*\[\[35\.48,\s*11\.13\],\s*\[47\.48,\s*9\.4\],\s*\[47\.48,\s*35\.86\],\s*\[35\.48,\s*37\.6\]\]/);
  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"extractor-hood"[\s\S]*\[\[35\.49,\s*39\.62\],\s*\[35\.48,\s*37\.8\],\s*\[30\.0,\s*38\.62\]\]/);
  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"extractor-hood"[\s\S]*\[\[35\.48,\s*37\.9\],\s*\[47\.48,\s*36\.16\],\s*\[47\.48,\s*37\.9\],\s*\[35\.48,\s*39\.57\]\]/);
  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"extractor-hood"[\s\S]*\[\[36\.58,\s*44\.08\],\s*\[46\.38,\s*42\.75\],\s*\[46\.38,\s*38\.11\],\s*\[36\.58,\s*39\.57\]\]/);
});

test("service claim plan labels sink separately from worktop", () => {
  const planSource = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-plan-selection.js"), "utf8");
  const flowSource = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(planSource, /"component-sink-faucet":\s*"Sink"/);
  assert.match(planSource, /resolveServiceClaimComponentName\(componentId,\s*item\)/);
  assert.match(flowSource, /"SINK-WORKTOP":\s*"Sp\\u00fcle"/);
});

test("service claim kitchen plan replaces sink sources with three independent claim parts", () => {
  const kitchen = {
    items: [
      component("SINKBASE-B-600", "sink-base", "Sink Lower Cabinet", { isLocked: true }),
      component("SINK-WORKTOP", "sink-faucet", "Worktop", { isLocked: true }),
    ],
  };
  const claimParts = [
    { partKey: "sink", articleCode: "526335", name: "Built-in Sink BLANCO TIPO 45 S", nameDe: "Einbau-Spüle BLANCO TIPO 45 S", sourceKitchenItemCode: "SINK-WORKTOP", sourceComponentKey: "sink-faucet" },
    { partKey: "sink-cabinet", articleCode: "SP60", name: "Sink Lower Cabinet", nameDe: "Spülen-Unterschrank", sourceKitchenItemCode: "SINKBASE-B-600", sourceComponentKey: "sink-base" },
    { partKey: "faucet", articleCode: "517720", name: "Kitchen Faucet BLANCO DARAS HD", nameDe: "Küchenarmatur BLANCO DARAS HD", sourceKitchenItemCode: "SINK-WORKTOP", sourceComponentKey: "sink-faucet" },
  ];
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105806",
    claimParts,
  });

  assert.deepEqual(result.selectableComponentIds, [
    "component-claim-sink",
    "component-claim-sink-cabinet",
    "component-claim-faucet",
  ]);
  assert.deepEqual(result.visibleComponentIds, ["component-sink-base", "component-sink-faucet"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["526335", "SP60", "517720"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.articleCode), ["526335", "SP60", "517720"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.sourceKitchenItemCode), ["SINK-WORKTOP", "SINKBASE-B-600", "SINK-WORKTOP"]);
});

test("service claim kitchen plan replaces the oven bundle with oven, drawer, and cooktop parts", () => {
  const kitchen = {
    items: [
      component("OVEN-B-600-HOB", "oven-module", "Built-in oven and induction hob", { isLocked: true }),
    ],
  };
  const claimParts = [
    { partKey: "oven", articleCode: "EH92364E-A", name: "Built-in Oven", nameDe: "Einbauherd", sourceKitchenItemCode: "OVEN-B-600-HOB", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", articleCode: "UHK", name: "Lower Cabinet for Built-in Oven", nameDe: "Unterschrank für Einbauherde", sourceKitchenItemCode: "OVEN-B-600-HOB", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", articleCode: "9EC744100C", name: "Ceramic Cooktop 60cm", nameDe: "Glaskeramikkochfeld 60 cm", sourceKitchenItemCode: "OVEN-B-600-HOB", sourceComponentKey: "oven-module" },
  ];
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105834",
    claimParts,
  });

  assert.deepEqual(result.selectableComponentIds, [
    "component-claim-oven",
    "component-claim-oven-drawer",
    "component-claim-cooktop",
  ]);
  assert.deepEqual(result.visibleComponentIds, ["component-oven-module"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.name), ["Built-in Oven", "Lower Cabinet for Built-in Oven", "Ceramic Cooktop 60cm"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["EH92364E-A", "UHK", "9EC744100C"]);
});

test("L kitchen claim plan replaces one worktop item with independent left and right parts", () => {
  const kitchen = {
    items: [
      component("TOP-AB105806", "worktop", "Worktop", { isLocked: true }),
    ],
  };
  const claimParts = [
    { partKey: "worktop-left", articleCode: "PLR60-1", name: "Left Worktop", nameDe: "Arbeitsplatte links", sourceKitchenItemCode: "TOP-AB105806", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", articleCode: "PLR60-2", name: "Right Worktop", nameDe: "Arbeitsplatte rechts", sourceKitchenItemCode: "TOP-AB105806", sourceComponentKey: "worktop" },
  ];
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105834",
    claimParts,
  });

  assert.deepEqual(result.selectableComponentIds, [
    "component-claim-worktop-left",
    "component-claim-worktop-right",
  ]);
  assert.deepEqual(result.visibleComponentIds, ["component-worktop"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.name), ["Left Worktop", "Right Worktop"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["PLR60-1", "PLR60-2"]);
});

test("cabinet side panels share a choice with the adjacent worktop leg", () => {
  const kitchen = {
    items: [component("TOP-L", "worktop", "Worktop", { isLocked: true })],
  };
  const claimParts = [
    { partKey: "worktop-left", sourceKitchenItemCode: "TOP-L", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceKitchenItemCode: "TOP-L", sourceComponentKey: "worktop" },
    { partKey: "worktop-end-panel", sourceKitchenItemCode: "TOP-L", sourceComponentKey: "worktop" },
  ];

  for (const [kitchenSlug, expectedWorktopPartKey] of [
    ["ab-105805", "worktop-left"],
    ["ab-105834", "worktop-right"],
    ["ab-105833", "worktop-left"],
    ["ab-105836", "worktop-left"],
    ["ab-105839", "worktop-left"],
    ["ab-105842", "worktop-left"],
  ]) {
    const result = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig: { components: kitchen.items },
      kitchenSlug,
      claimParts,
    });
    const groups = buildServiceClaimComponentChoiceGroups(result.selectableComponents);
    const panelGroup = groups.find((group) => (
      group.options.some((option) => option.claimPartKey === "worktop-end-panel")
    ));

    assert.deepEqual(
      panelGroup.options.map((option) => option.claimPartKey),
      [expectedWorktopPartKey, "worktop-end-panel"],
      kitchenSlug,
    );
  }
});

test("AB 105734 keeps the upper hood cabinet and extractor independently selectable", () => {
  assert.deepEqual(
    getServiceClaimLinkedComponentIds("ab-105734", "component-wall-cabinet-2"),
    ["component-wall-cabinet-2"],
  );
  assert.deepEqual(
    getServiceClaimLinkedComponentIds("ab-105734", "component-extractor-hood"),
    ["component-extractor-hood"],
  );
});

test("specified L kitchens select both adjacent corner Blenden together", () => {
  const firstBlende = "component-claim-blende-base-module-2";
  const secondBlende = "component-claim-blende-base-module-2-2";

  [
    "ab-105822",
    "ab-105825",
    "ab-105828",
    "ab-105831",
    "ab-105834",
    "ab-105837",
    "ab-105840",
    "ab-105843",
  ].forEach((kitchenSlug) => {
    assert.deepEqual(
      getServiceClaimLinkedComponentIds(kitchenSlug, firstBlende),
      [firstBlende, secondBlende],
    );
    assert.deepEqual(
      getServiceClaimLinkedComponentIds(kitchenSlug.toUpperCase(), secondBlende),
      [firstBlende, secondBlende],
    );
    assert.deepEqual(
      collapseServiceClaimLinkedComponents(kitchenSlug, [
        { componentId: firstBlende, name: "UPK20 Filler Panel" },
        { componentId: secondBlende, name: "UPK20 Filler Panel" },
      ]),
      [{ componentId: firstBlende, name: "UPK20 Filler Panel" }],
    );
  });
});

test("unlinked claim components keep separate problem-area rows", () => {
  const components = [
    { componentId: "component-claim-blende-base-module-2" },
    { componentId: "component-claim-blende-base-module-2-2" },
  ];

  assert.deepEqual(collapseServiceClaimLinkedComponents("ab-105805", components), components);
});

test("AB 104968 perspective variants expose both lower corner Blenden independently", () => {
  ["ab-104968", "ab-105734", "ab-105737", "ab-105740"].forEach((kitchenSlug) => {
    const item = component("CAB-BASE-AB104968-US40", "base-module-2", "Base Cabinet", {
      articleNumber: "US40",
      widthMm: 400,
      isLocked: true,
      blendeCode: "UPK20 x2",
      blendeLabel: "UPK20 Passblende x 2",
    });
    const result = buildServiceClaimSelectableComponents({
      kitchen: { items: [item] },
      kitchenConfig: { components: [item] },
      kitchenSlug,
    });
    const blenden = result.selectableComponents.filter((entry) => (
      entry.sourceComponentKey === "base-module-2" && entry.claimPartKey === "blende"
    ));

    assert.equal(blenden.length, 2, `${kitchenSlug} exposes both corner Blenden`);
    assert.deepEqual(blenden.map((entry) => entry.blendeIndex), [1, 2]);
    assert.notEqual(blenden[0].componentId, blenden[1].componentId);
  });
});

test("AB 105747 variants expose both corner Blenden independently", () => {
  ["ab-105747", "ab-105750", "ab-105753", "ab-105756"].forEach((kitchenSlug) => {
    const kitchen = {
      items: [
        component("CAB-BASE-AB105747-US60-L", "base-module-2", "Base Cabinet", {
          articleNumber: "US60",
          widthMm: 600,
          isLocked: true,
          blendeCode: "UPK20 x2",
          blendeLabel: "UPK20 Passblende x 2",
        }),
      ],
    };
    const result = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig: { components: kitchen.items },
      kitchenSlug,
    });
    const blenden = result.selectableComponents.filter(
      (entry) => entry.sourceComponentKey === "base-module-2" && entry.claimPartKey === "blende",
    );

    assert.equal(blenden.length, 2);
    assert.deepEqual(blenden.map((entry) => entry.blendeIndex), [1, 2]);
  });
});

test("AB 105807 adds the worktop end panel without replacing the horizontal worktop", () => {
  const kitchen = {
    items: [
      component("TOP-AB105806", "worktop", "Worktop", {
        articleNumber: "PLR60",
        isLocked: true,
      }),
    ],
  };
  const claimParts = [{
    partKey: "worktop-end-panel",
    articleCode: "PLR60-3",
    name: "Worktop End Panel",
    nameDe: "Arbeitsplatten-Seitenwange",
    sourceKitchenItemCode: "TOP-AB105806",
    sourceComponentKey: "worktop",
  }];
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105807",
    claimParts,
  });

  assert.deepEqual(result.selectableComponentIds, [
    "component-worktop",
    "component-claim-worktop-end-panel",
  ]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.articleCode), [
    "PLR60",
    "PLR60-3",
  ]);
  assert.deepEqual(result.visibleComponentIds, ["component-worktop"]);
  assert.equal(
    result.selectableComponents.find(
      (entry) => entry.claimPartKey === "worktop-end-panel",
    ).contextualChoiceTriggerPartKey,
    "worktop",
  );
});

test("AB 105807 worktop and end panel use independent PDF-matched hotspots", () => {
  const result = buildServiceClaimPartHotspots([
    { componentId: "component-worktop", componentKey: "worktop", left: 4.49, top: 62.14, width: 63.92, height: 1.49 },
  ], [{
    partKey: "worktop-end-panel",
    sourceComponentKey: "worktop",
  }], "ab-105807");
  const worktop = result.find((entry) => entry.componentId === "component-worktop");
  const endPanel = result.find((entry) => entry.claimPartKey === "worktop-end-panel");

  assert.equal(result.length, 2);
  assert.ok(Math.abs(worktop.left + worktop.width - 67.99658) < 0.000001);
  assert.equal(endPanel.componentId, "component-claim-worktop-end-panel");
  assert.ok(Math.abs(endPanel.left - 67.99658) < 0.000001);
  assert.ok(Math.abs(endPanel.width - (68.395554 - 67.99658)) < 0.000001);
  assert.ok(Math.abs(endPanel.top - 62.14) < 0.000001);
  assert.ok(Math.abs(endPanel.height - (96.13 - 62.14)) < 0.000001);
  assert.equal(endPanel.claimWorktopEndPanelSplit, true);
});

test("non-L claim plans omit the invisible sink hotspot but keep cabinet and faucet", () => {
  const hotspots = [
    { componentKey: "sink-base", left: 10, top: 50, width: 20, height: 30 },
    { componentKey: "sink-faucet", left: 14, top: 40, width: 8, height: 10 },
  ];
  const result = buildServiceClaimPartHotspots(hotspots, [
    { partKey: "sink", sourceComponentKey: "sink-faucet" },
    { partKey: "sink-cabinet", sourceComponentKey: "sink-base" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
  ]);

  assert.deepEqual(result.map((entry) => entry.componentId), [
    "component-claim-sink-cabinet",
    "component-claim-faucet",
  ]);
  const sink = result.find((entry) => entry.claimPartKey === "sink");
  const faucet = result.find((entry) => entry.claimPartKey === "faucet");
  assert.equal(sink, undefined);
  assert.equal(faucet.top, 40);
  assert.equal(faucet.width, 8);
  assert.equal(faucet.height, 10);
});

test("oven, drawer, and cooktop use independent claim hotspots", () => {
  const claimParts = [
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", sourceComponentKey: "oven-module" },
  ];
  const source = [{ componentKey: "oven-module", left: 20, top: 40, width: 10, height: 30 }];
  const elevation = buildServiceClaimPartHotspots(source, claimParts, "ab-105814");
  const ovenHotspots = elevation.filter((entry) => entry.claimPartKey === "oven");
  const oven = ovenHotspots[0];
  const drawer = elevation.find((entry) => entry.claimPartKey === "oven-drawer");
  const cooktop = elevation.find((entry) => entry.claimPartKey === "cooktop");

  assert.equal(oven.left, 20);
  assert.equal(oven.top, 40);
  assert.equal(oven.width, 10);
  assert.ok(Math.abs(oven.height - 19.8) < 0.000001);
  assert.equal(ovenHotspots.length, 1);
  assert.equal(drawer.componentId, "component-claim-oven-drawer");
  assert.equal(drawer.left, 20);
  assert.ok(Math.abs(drawer.top - 59.8) < 0.000001);
  assert.equal(drawer.width, 10);
  assert.ok(Math.abs(drawer.height - 10.2) < 0.000001);
  assert.ok(Math.abs(oven.top + oven.height - drawer.top) < 0.000001);
  assert.ok(Math.abs(drawer.top + drawer.height - 70) < 0.000001);
  assert.ok(cooktop.top < oven.top);
  assert.ok(cooktop.height < oven.height);
  assert.match(cooktop.clipPath, /^polygon\(/);

  for (const kitchen of [
    { slug: "ab-105808", left: 24.72, top: 58.81, width: 14.14, height: 29.25, ratio: 0.681 },
    { slug: "ab-105816", left: 24.29, top: 59.25, width: 14.25, height: 29.5, ratio: 0.6813 },
    { slug: "ab-105820", left: 24.28, top: 60.88, width: 14.24, height: 29.42, ratio: 0.6806 },
    { slug: "ab-105821", left: 52.01, top: 65.12, width: 15.5, height: 32.1, ratio: 0.6808 },
    { slug: "ab-105824", left: 52.01, top: 65.12, width: 15.5, height: 32.1, ratio: 0.6808 },
    { slug: "ab-105823", left: 35.43, top: 59.5, width: 14.16, height: 24.16, ratio: 0.82765 },
    { slug: "ab-105829", left: 35.43, top: 59.5, width: 14.16, height: 24.16, ratio: 0.82765 },
    { slug: "ab-105832", left: 35.43, top: 59.5, width: 14.16, height: 24.16, ratio: 0.82765 },
    { slug: "ab-105826", left: 34.85, top: 59.15, width: 14.1, height: 24.04, ratio: 0.828 },
    { slug: "ab-105827", left: 51.24, top: 56.61, width: 13.42, height: 22.87, ratio: 0.8289 },
    { slug: "ab-105830", left: 51.24, top: 56.61, width: 13.42, height: 22.87, ratio: 0.8289 },
    { slug: "ab-105833", left: 26.18, top: 55.6, width: 10.91, height: 22.57, ratio: 0.6818 },
    { slug: "ab-105835", left: 15.36, top: 59.48, width: 13.38, height: 22.82, ratio: 0.8274 },
    { slug: "ab-105836", left: 24.73, top: 55.83, width: 11.06, height: 22.89, ratio: 0.6805 },
    { slug: "ab-105838", left: 14.88, top: 59.9, width: 13.32, height: 27.44, ratio: 0.6797 },
    { slug: "ab-105841", left: 14.88, top: 59.9, width: 13.32, height: 27.44, ratio: 0.6797 },
    { slug: "ab-105844", left: 14.88, top: 59.9, width: 13.32, height: 27.44, ratio: 0.6797 },
    { slug: "ab-105839", left: 25.51, top: 56.56, width: 10.62, height: 21.98, ratio: 0.6812 },
    { slug: "ab-105842", left: 25.51, top: 56.56, width: 10.62, height: 21.98, ratio: 0.6812 },
  ]) {
    const result = buildServiceClaimPartHotspots([
      { componentKey: "oven-module", left: kitchen.left, top: kitchen.top, width: kitchen.width, height: kitchen.height },
    ], claimParts, kitchen.slug);
    const oven = result.find((entry) => entry.claimPartKey === "oven");
    const drawer = result.find((entry) => entry.claimPartKey === "oven-drawer");
    const expectedSeam = kitchen.top + kitchen.height * kitchen.ratio;
    assert.ok(Math.abs(oven.top + oven.height - expectedSeam) < 0.001);
    assert.ok(Math.abs(drawer.top - expectedSeam) < 0.001);
    assert.ok(Math.abs(oven.top + oven.height - drawer.top) < 0.000001);
  }

  const lShaped = buildServiceClaimPartHotspots(source, claimParts, "ab-105834");
  const lShapedCooktop = lShaped.find((entry) => entry.claimPartKey === "cooktop");
  assert.ok(lShapedCooktop.left < oven.left);
  assert.ok(lShapedCooktop.width > oven.width);
  assert.ok(Math.abs(lShapedCooktop.left - 11.45) < 0.001);
  assert.ok(Math.abs(lShapedCooktop.top - 36.949) < 0.001);
  assert.ok(Math.abs(lShapedCooktop.width - 19.215) < 0.001);
  assert.ok(Math.abs(lShapedCooktop.height - 3.495) < 0.001);

  // Use the exact live AB 105805 oven bounds and verify the PDF-measured
  // cooktop outline. AB 105809/105813/105817 reuse this same plan.
  const kitchen105805Source = [
    { componentKey: "oven-module", left: 35.45, top: 56.13, width: 10.12, height: 28.71 },
  ];
  const kitchen105805 = buildServiceClaimPartHotspots(kitchen105805Source, claimParts, "ab-105805");
  const kitchen105805Cooktop = kitchen105805.find((entry) => entry.claimPartKey === "cooktop");
  assert.ok(Math.abs(kitchen105805Cooktop.left - 28.44418) < 0.001);
  assert.ok(Math.abs(kitchen105805Cooktop.top - 53.15125) < 0.001);
  assert.ok(Math.abs(kitchen105805Cooktop.width - 17.13183) < 0.001);
  assert.ok(Math.abs(kitchen105805Cooktop.height - 3.19329) < 0.001);
  assert.match(kitchen105805Cooktop.clipPath, /51\.993\d*% 0%/);

  for (const alias of ["ab-105809", "ab-105813", "ab-105817"]) {
    const aliasCooktop = buildServiceClaimPartHotspots(kitchen105805Source, claimParts, alias)
      .find((entry) => entry.claimPartKey === "cooktop");
    assert.equal(aliasCooktop.left, kitchen105805Cooktop.left);
    assert.equal(aliasCooktop.top, kitchen105805Cooktop.top);
    assert.equal(aliasCooktop.width, kitchen105805Cooktop.width);
    assert.equal(aliasCooktop.height, kitchen105805Cooktop.height);
    assert.equal(aliasCooktop.clipPath, kitchen105805Cooktop.clipPath);
  }

  // Use the exact live AB 105831 oven bounds from kitchen-svg-stage.jsx. They
  // differ from the canonical preview table and previously shifted the cooktop down.
  const kitchen105831 = buildServiceClaimPartHotspots(
    [{
      componentKey: "oven-module",
      left: 53.25,
      top: 61.55,
      width: 9.1,
      height: 31.15,
      points: [[53.25, 61.55], [62.35, 63.55], [62.35, 92.7], [53.25, 91.2]],
    }],
    claimParts,
    "ab-105831",
  );
  const kitchen105831Cooktop = kitchen105831.find((entry) => entry.claimPartKey === "cooktop");
  const kitchen105831Drawer = kitchen105831.find((entry) => entry.claimPartKey === "oven-drawer");
  assert.ok(Math.abs(kitchen105831Cooktop.left - 53.23634) < 0.001);
  assert.ok(Math.abs(kitchen105831Cooktop.top - 58.73949) < 0.001);
  assert.ok(Math.abs(kitchen105831Cooktop.width - 18.70547) < 0.001);
  assert.ok(Math.abs(kitchen105831Cooktop.height - 3.52942) < 0.001);
  assert.ok(Math.abs(kitchen105831Drawer.left - 53.25) < 0.001);
  assert.ok(Math.abs(kitchen105831Drawer.top - 81.119) < 0.001);
  assert.ok(Math.abs(kitchen105831Drawer.width - 9.1) < 0.001);
  assert.ok(Math.abs(kitchen105831Drawer.height - 11.581) < 0.001);
  assert.match(kitchen105831Drawer.clipPath, /^polygon\(0% 0%, 100% 14\.42\d*%, 100% 100%, 0% 87\.04\d*%\)$/);

  const kitchen105837 = buildServiceClaimPartHotspots(
    [{ componentKey: "oven-module", left: 41.07, top: 57.45, width: 10.98, height: 31.06 }],
    claimParts,
    "ab-105837",
  );
  const kitchen105837Cooktop = kitchen105837.find((entry) => entry.claimPartKey === "cooktop");
  assert.ok(Math.abs(kitchen105837Cooktop.left - 32.63064) < 0.001);
  assert.ok(Math.abs(kitchen105837Cooktop.top - 54.03361) < 0.001);
  assert.ok(Math.abs(kitchen105837Cooktop.width - 20.33848) < 0.001);
  assert.ok(Math.abs(kitchen105837Cooktop.height - 3.4874) < 0.001);

  const kitchen105825 = buildServiceClaimPartHotspots(
    [{ componentKey: "oven-base", left: 53.44, top: 56.8, width: 8.76, height: 30.26 }],
    claimParts.map((part) => ({ ...part, sourceComponentKey: "oven-base" })),
    "ab-105825",
  );
  const kitchen105825Cooktop = kitchen105825.find((entry) => entry.claimPartKey === "cooktop");
  assert.ok(Math.abs(kitchen105825Cooktop.left - 53.23634) < 0.001);
  assert.ok(Math.abs(kitchen105825Cooktop.top - 53.36135) < 0.001);
  assert.ok(Math.abs(kitchen105825Cooktop.width - 18.05226) < 0.001);
  assert.ok(Math.abs(kitchen105825Cooktop.height - 3.48739) < 0.001);
});

test("L worktop claim hotspots split the combined outline at the corner seam", () => {
  const claimParts = [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ];
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 29.55, top: 52.08, width: 65.27, height: 11.39 },
  ], claimParts, "ab-105834");
  const left = result.find((entry) => entry.claimPartKey === "worktop-left");
  const right = result.find((entry) => entry.claimPartKey === "worktop-right");

  assert.equal(result.length, 2);
  assert.equal(left.componentId, "component-claim-worktop-left");
  assert.equal(right.componentId, "component-claim-worktop-right");
  assert.ok(Math.abs(left.left - 29.55) < 0.001);
  assert.ok(Math.abs(left.top - 53.83) < 0.001);
  assert.ok(Math.abs(left.width - 24.26) < 0.001);
  assert.ok(Math.abs(left.height - 6.84) < 0.001);
  assert.ok(Math.abs(right.left - 42.41) < 0.001);
  assert.ok(Math.abs(right.top - 52.08) < 0.001);
  assert.ok(Math.abs(right.width - 52.41) < 0.001);
  assert.ok(Math.abs(right.height - 11.39) < 0.001);
  assert.match(left.clipPath, /^polygon\(/);
  assert.match(right.clipPath, /^polygon\(/);
});

test("L worktop split excludes floor-height end panels from the worktop selection", () => {
  const claimParts = [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ];
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 28.4, top: 50.4, width: 58.77, height: 8.87 },
    { componentKey: "worktop", left: 28.28, top: 58.5, width: 0.44, height: 27.52 },
  ], claimParts, "ab-105805");

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((entry) => entry.claimPartKey).sort(), [
    "worktop-left",
    "worktop-right",
  ]);
  assert.ok(result.every((entry) => entry.height < 10));
});

test("existing floor-height worktop end panels become their own claims item", () => {
  const claimParts = [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
    { partKey: "worktop-end-panel", sourceComponentKey: "worktop" },
  ];
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 28.4, top: 50.4, width: 58.77, height: 8.87 },
    { componentKey: "worktop", left: 28.28, top: 58.5, width: 0.44, height: 27.52 },
  ], claimParts, "ab-105805");
  const endPanel = result.find((entry) => entry.claimPartKey === "worktop-end-panel");

  assert.deepEqual(result.map((entry) => entry.claimPartKey).sort(), [
    "worktop-end-panel",
    "worktop-left",
    "worktop-right",
  ]);
  assert.equal(endPanel.componentId, "component-claim-worktop-end-panel");
  assert.equal(endPanel.left, 28.28);
  assert.equal(endPanel.top, 58.5);
  assert.equal(endPanel.width, 0.44);
  assert.equal(endPanel.height, 27.52);
  assert.equal(endPanel.claimWorktopEndPanelSplit, true);
});

test("straight kitchens keep the horizontal worktop and separate its existing end panel", () => {
  const result = buildServiceClaimPartHotspots([
    { componentId: "component-worktop", componentKey: "worktop", left: 17.86, top: 62.86, width: 80.73, height: 1.39 },
    { componentId: "component-worktop", componentKey: "worktop", left: 17.86, top: 62.86, width: 0.4, height: 32.3 },
  ], [{
    partKey: "worktop-end-panel",
    sourceComponentKey: "worktop",
  }], "ab-105806");

  assert.equal(result.length, 2);
  assert.equal(result[0].componentId, "component-worktop");
  assert.equal(result[0].width, 80.73);
  assert.equal(result[1].componentId, "component-claim-worktop-end-panel");
  assert.equal(result[1].width, 0.4);
  assert.equal(result[1].height, 32.3);
});

test("the adjacent cabinet selection stops at the worktop end-panel line", () => {
  const result = buildServiceClaimPartHotspots([
    { componentId: "component-worktop", componentKey: "worktop", left: 0.9, top: 58.47, width: 80.98, height: 1.4 },
    { componentId: "component-worktop", componentKey: "worktop", left: 81.88, top: 59.9, width: 0.45, height: 27.44 },
    { componentId: "component-drawer-module", componentKey: "drawer-module", left: 68.55, top: 59.9, width: 13.34, height: 27.44 },
  ], [{
    partKey: "worktop-end-panel",
    sourceComponentKey: "worktop",
  }], "ab-105844");
  const cabinet = result.find((entry) => entry.componentKey === "drawer-module");
  const endPanel = result.find((entry) => entry.claimPartKey === "worktop-end-panel");

  assert.ok(Math.abs(cabinet.left + cabinet.width - endPanel.left) < 0.000001);
  assert.equal(cabinet.claimWorktopEndPanelAdjacentTrim, true);
});

test("the AB 105807 adjacent cabinet stops at its PDF-derived end-panel line", () => {
  const result = buildServiceClaimPartHotspots([
    { componentId: "component-worktop", componentKey: "worktop", left: 4.49, top: 62.14, width: 63.92, height: 1.49 },
    { componentId: "component-oven-module", componentKey: "oven-module", left: 58, top: 63.63, width: 10.41, height: 32.5 },
  ], [{
    partKey: "worktop-end-panel",
    sourceComponentKey: "worktop",
  }], "ab-105807");
  const cabinet = result.find((entry) => entry.componentKey === "oven-module");
  const endPanel = result.find((entry) => entry.claimPartKey === "worktop-end-panel");

  assert.ok(Math.abs(cabinet.left + cabinet.width - endPanel.left) < 0.000001);
  assert.equal(cabinet.claimWorktopEndPanelAdjacentTrim, true);
});

test("AB 105805 uses separate PDF surface and front-edge seam points through the right end", () => {
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 28.4, top: 50.4, width: 58.77, height: 8.87 },
  ], [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ], "ab-105805");
  const left = result.find((entry) => entry.claimPartKey === "worktop-left");
  const right = result.find((entry) => entry.claimPartKey === "worktop-right");

  assert.ok(Math.abs(left.left + left.width - 54.9) < 0.001);
  assert.ok(Math.abs(right.left - 45.57) < 0.001);
  assert.ok(Math.abs(right.left + right.width - 87.17) < 0.001);
  assert.match(left.clipPath, /^polygon\(/);
  assert.match(right.clipPath, /^polygon\(/);
});

test("AB 104968 independent claim Blenden follow their PDF end faces", () => {
  const hotspots = [
    { componentKey: "base-module-2", left: 35.72, top: 55.87, width: 9.08, height: 30.24 },
    { componentKey: "wall-cabinet-4", points: [[39.092637, 12.208403], [33.904988, 11.139496], [44.807601, 9.566387], [49.995249, 10.635294], [50.893112, 10.494118], [50.893112, 34.47395], [49.995249, 34.715966], [39.092637, 36.289076]] },
  ];
  const claimBlenden = [
    { componentId: "component-claim-blende-base-module-2", componentKey: "claim-blende-base-module-2", claimPartKey: "blende", sourceComponentKey: "base-module-2", blendeQuantity: 2, blendeIndex: 1 },
    { componentId: "component-claim-blende-base-module-2-2", componentKey: "claim-blende-base-module-2-2", claimPartKey: "blende", sourceComponentKey: "base-module-2", blendeQuantity: 2, blendeIndex: 2 },
    { componentId: "component-claim-blende-wall-cabinet-4", componentKey: "claim-blende-wall-cabinet-4", claimPartKey: "blende", sourceComponentKey: "wall-cabinet-4", blendeQuantity: 1 },
  ];
  const result = buildServiceClaimBlendeHotspots(hotspots, claimBlenden, [], "ab-104968");
  const blendeFor = (sourceKey) => result.find((entry) => (
    entry.claimPartKey === "blende" && entry.sourceComponentKey === sourceKey
  ));

  const baseBlenden = result.filter((entry) => (
    entry.claimPartKey === "blende" && entry.sourceComponentKey === "base-module-2"
  ));
  assert.deepEqual(baseBlenden.map((entry) => [entry.left, entry.width]), [
    [43.054632, 43.966746 - 43.054632],
    [43.966746, 44.72209 - 43.966746],
  ]);
  assert.ok(Math.abs(blendeFor("wall-cabinet-4").left - 49.995249) < 0.000001);
  assert.ok(Math.abs(blendeFor("wall-cabinet-4").width - (50.893112 - 49.995249)) < 0.000001);
});

test("AB 105747 claim Blenden follow each vector-PDF divider", () => {
  const hotspots = [
    { componentKey: "base-module-2", points: [[47.9, 59.624], [56.936, 58.313], [58.39, 58.279], [58.39, 82.555], [56.936, 82.534], [47.9, 83.845]] },
    { componentKey: "drawer-module", points: [[71.635, 61.06], [75.42, 61.842], [76.233, 61.903], [76.233, 86.084], [75.42, 86.044], [71.635, 85.27]] },
    { componentKey: "wall-cabinet-3", points: [[44.38, 23.462], [53.401, 22.171], [54.157, 22.05], [54.157, 41.997], [53.401, 42.097], [44.38, 43.408]] },
  ];
  const claimBlenden = [
    { componentId: "component-claim-blende-base-module-2", componentKey: "claim-blende-base-module-2", claimPartKey: "blende", sourceComponentKey: "base-module-2", blendeQuantity: 2 },
    { componentId: "component-claim-blende-base-module-2-2", componentKey: "claim-blende-base-module-2-2", claimPartKey: "blende", sourceComponentKey: "base-module-2", blendeQuantity: 2 },
    { componentId: "component-claim-blende-drawer-module", componentKey: "claim-blende-drawer-module", claimPartKey: "blende", sourceComponentKey: "drawer-module", blendeQuantity: 1 },
    { componentId: "component-claim-blende-wall-cabinet-3", componentKey: "claim-blende-wall-cabinet-3", claimPartKey: "blende", sourceComponentKey: "wall-cabinet-3", blendeQuantity: 1 },
  ];
  const result = buildServiceClaimBlendeHotspots(hotspots, claimBlenden, [], "ab-105747");
  const baseBlenden = result.filter((entry) => (
    entry.claimPartKey === "blende" && entry.sourceComponentKey === "base-module-2"
  ));
  const blendeFor = (sourceKey) => result.find((entry) => (
    entry.claimPartKey === "blende" && entry.sourceComponentKey === sourceKey
  ));

  assert.deepEqual(
    baseBlenden.map((entry) => [entry.left, entry.width]),
    [
      [56.935867, 57.76247 - 56.935867],
      [57.76247, 58.389549 - 57.76247],
    ],
  );
  assert.ok(Math.abs(blendeFor("drawer-module").left - 75.420428) < 0.000001);
  assert.ok(Math.abs(blendeFor("drawer-module").width - (76.232779 - 75.420428)) < 0.000001);
  assert.ok(Math.abs(blendeFor("wall-cabinet-3").left - 53.401425) < 0.000001);
  assert.ok(Math.abs(blendeFor("wall-cabinet-3").width - (54.15677 - 53.401425)) < 0.000001);
});

test("AB 104968 worktops include each side's PDF front fascia", () => {
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 5.57, top: 50.91, width: 66.77, height: 10.64 },
  ], [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ], "ab-104968");
  const left = result.find((entry) => entry.claimPartKey === "worktop-left");
  const right = result.find((entry) => entry.claimPartKey === "worktop-right");

  assert.ok(Math.abs(left.left - 5.572447) < 0.000001);
  assert.ok(Math.abs(left.left + left.width - 43.966746) < 0.000001);
  assert.ok(Math.abs(left.top - 52.584874) < 0.000001);
  assert.ok(Math.abs(left.top + left.height - 60.026891) < 0.000001);
  assert.ok(Math.abs(right.left - 34.817102) < 0.000001);
  assert.ok(Math.abs(right.left + right.width - 72.39905) < 0.000001);
  assert.ok(Math.abs(right.top - 51.011765) < 0.000001);
  assert.ok(Math.abs(right.top + right.height - 61.640336) < 0.000001);
  assert.match(left.clipPath, /^polygon\(/);
  assert.match(right.clipPath, /^polygon\(/);
});

test("AB 104968 variants keep the US50 front and exposed side as one cabinet", () => {
  ["ab-104968", "ab-105734", "ab-105737", "ab-105740"].forEach((kitchenSlug) => {
    const kitchen = {
      items: [
        component("CAB-BASE-US40", "base-module-1", "Base Cabinet", {
          articleNumber: "US40",
          widthMm: 400,
          isLocked: true,
          blendeCode: "UPK20",
          blendeLabel: "UPK20 Passblende",
        }),
      ],
    };
    const result = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig: { components: kitchen.items },
      kitchenSlug,
    });
    const blenden = result.selectableComponents.filter((entry) => (
      entry.claimPartKey === "blende" && entry.sourceComponentKey === "base-module-1"
    ));

    assert.ok(result.selectableComponentIds.includes("component-base-module-1"));
    assert.equal(blenden.length, 0);
    assert.ok(!result.selectableComponentIds.includes("component-claim-blende-base-module-1"));
  });
});

test("AB 104968 cooktop uses the four outside vector-PDF strokes", () => {
  const result = buildServiceClaimPartHotspots([
    { componentKey: "oven-module", left: 24.84, top: 57.01, width: 10.88, height: 30.82 },
  ], [{ partKey: "cooktop", sourceComponentKey: "oven-module" }], "ab-104968");
  const cooktop = result.find((entry) => entry.claimPartKey === "cooktop");

  assert.ok(Math.abs(cooktop.left - 17.57244656) < 0.000001);
  assert.ok(Math.abs(cooktop.top - 53.63361345) < 0.000001);
  assert.ok(Math.abs(cooktop.left + cooktop.width - 36.04275534) < 0.000001);
  assert.ok(Math.abs(cooktop.top + cooktop.height - 57.00168067) < 0.000001);
  assert.match(cooktop.clipPath, /^polygon\(/);
});

test("AB 105758 ASC uses the exact sink, cooktop, oven, and drawer vector faces", () => {
  const hotspots = [
    {
      componentKey: "sink-faucet",
      points: [[16.261, 48.450], [16.318, 47.724], [20.309, 44.800]],
      left: 16.261,
      top: 44.800,
      width: 4.048,
      height: 3.650,
    },
    {
      componentKey: "sink-faucet",
      points: [[16.261, 48.450], [16.789, 48.390], [16.860, 55.106], [16.375, 55.166]],
      left: 16.261,
      top: 48.390,
      width: 0.599,
      height: 6.776,
    },
    {
      componentKey: "sink-faucet",
      points: [[20.337, 43.771], [20.993, 43.852], [20.793, 47.462], [20.109, 47.361]],
      left: 20.109,
      top: 43.771,
      width: 0.884,
      height: 3.691,
    },
    {
      componentKey: "oven-module",
      points: [[46.218527, 54.783193], [55.653207, 56.739496], [55.653207, 86.910924], [46.218527, 84.974790]],
      left: 46.218527,
      top: 54.783193,
      width: 9.434680,
      height: 32.127731,
    },
  ];
  const claimParts = [
    { partKey: "sink", sourceComponentKey: "sink-faucet" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", sourceComponentKey: "oven-module" },
  ];
  const result = buildServiceClaimPartHotspots(hotspots, claimParts, "ab-105758");
  const sink = result.filter((entry) => entry.claimPartKey === "sink");
  const oven = result.find((entry) => entry.claimPartKey === "oven");
  const drawer = result.find((entry) => entry.claimPartKey === "oven-drawer");
  const cooktop = result.find((entry) => entry.claimPartKey === "cooktop");

  assert.equal(sink.length, 1);
  assert.ok(Math.abs(sink[0].left - 15.149644) < 0.000001);
  assert.ok(Math.abs(sink[0].width - 20.693586) < 0.000001);
  assert.ok(Math.abs(oven.top + oven.height - 76.685714) < 0.000001);
  assert.ok(Math.abs(drawer.top - 74.749580) < 0.000001);
  assert.ok(Math.abs(drawer.top + drawer.height - 86.910924) < 0.000001);
  assert.ok(Math.abs(cooktop.left - 46.218527) < 0.000001);
  assert.ok(Math.abs(cooktop.top - 51.737815) < 0.000001);
  assert.ok(Math.abs(cooktop.width - 14.394300) < 0.000001);
  assert.ok(Math.abs(cooktop.top + cooktop.height - 54.984874) < 0.000001);
  assert.match(sink[0].clipPath, /^polygon\(/);
  assert.match(cooktop.clipPath, /^polygon\(/);
  assert.equal((cooktop.clipPath.match(/,/g) || []).length, 4);
});

test("selected service claim components have accessible per-row remove buttons", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(source, /function removeProblemArea\(componentId, rowComponentId = componentId, selectedPartComponentIds = \[\]\)/);
  assert.match(source, /getServiceClaimLinkedComponentIds\(activeKitchenPlan\?\.kitchenSlug,\s*componentId\)/);
  assert.match(source, /className="service-field__problem-area-remove"/);
  assert.match(source, /aria-label=\{t\("removeProblemAreaAria"\)\.replace\("\{label\}",\s*area\.resolvedLabel\)\}/);
  assert.match(source, /onClick=\{\(\) => removeProblemArea\([\s\S]*area\.rowComponentId/);
});

test("segmented L worktop surfaces and front edges stay assigned to their side", () => {
  const claimParts = [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ];
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 10, top: 10, width: 20, height: 5 },
    { componentKey: "worktop", left: 30, top: 10, width: 40, height: 5 },
    { componentKey: "worktop", left: 10, top: 15, width: 20, height: 2 },
    { componentKey: "worktop", left: 30, top: 15, width: 40, height: 2 },
  ], claimParts, "ab-105840");

  assert.deepEqual(result.map((entry) => entry.claimPartKey), [
    "worktop-left",
    "worktop-right",
    "worktop-left",
    "worktop-right",
  ]);
  assert.deepEqual(result.map((entry) => entry.componentId), [
    "component-claim-worktop-left",
    "component-claim-worktop-right",
    "component-claim-worktop-left",
    "component-claim-worktop-right",
  ]);
});

test("two-part kitchen worktop runs become independent left and right claim hotspots", () => {
  const splitClaimParts = [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ];

  for (const slug of ["ab-105833", "ab-105836", "ab-105839", "ab-105842", "ab-105845"]) {
    const claimParts = slug === "ab-105845"
      ? splitClaimParts
      : [
        ...splitClaimParts,
        { partKey: "worktop-end-panel", sourceComponentKey: "worktop" },
      ];
    const worktopHotspots = PLAN_HOTSPOTS_BY_SLUG[slug]
      .filter((hotspot) => hotspot.componentKey === "worktop");
    const result = buildServiceClaimPartHotspots(worktopHotspots, claimParts, slug);
    const left = result.filter((entry) => entry.claimPartKey === "worktop-left");
    const right = result.filter((entry) => entry.claimPartKey === "worktop-right");

    assert.equal(left.length, 1, `${slug} should expose one left worktop run`);
    assert.equal(right.length, 1, `${slug} should expose one right worktop run`);
    assert.ok(left[0].left < right[0].left, `${slug} worktop claims should retain their visual sides`);
    assert.equal(left[0].componentId, "component-claim-worktop-left");
    assert.equal(right[0].componentId, "component-claim-worktop-right");
  }
});

test("two-part worktop claim migration backfills every active split kitchen", () => {
  const migration = fs.readFileSync(
    path.join(
      repoRoot,
      "prisma",
      "migrations",
      "20260717130000_add_two_part_worktop_claim_parts",
      "migration.sql",
    ),
    "utf8",
  );

  for (const slug of ["ab-105833", "ab-105836", "ab-105839", "ab-105842", "ab-105845"]) {
    assert.match(migration, new RegExp(`'${slug}'`));
  }
  assert.match(migration, /'worktop-left', 'PLR60-1', 'Left Worktop', 'Arbeitsplatte links'/);
  assert.match(migration, /'worktop-right', 'PLR60-2', 'Right Worktop', 'Arbeitsplatte rechts'/);
});

test("service claim picker outlines worktop surfaces but not separate front-edge polygons", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "components", "service-claim-kitchen-picker.jsx"),
    "utf8",
  );

  assert.match(
    source,
    /hotspot\.claimPartKey === "worktop-left"[\s\S]*hotspot\.claimPartKey === "worktop-right"[\s\S]*hotspot\.preserveManualSize[\s\S]*return null/,
  );
  assert.match(source, /styles\.planHotspotWorktop/);

  const styles = fs.readFileSync(
    path.join(repoRoot, "components", "kitchen-configurator.module.css"),
    "utf8",
  );
  assert.match(styles, /\.planHotspotWorktop[\s\S]*border-color:\s*transparent;[\s\S]*box-shadow:\s*none;/);
});

test("service claim picker preserves unselected sink and cooktop cutouts in a selected worktop", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "components", "service-claim-kitchen-picker.jsx"),
    "utf8",
  );
  const styles = fs.readFileSync(
    path.join(repoRoot, "components", "kitchen-configurator.module.css"),
    "utf8",
  );

  assert.match(source, /hotspot\.claimPartKey === "sink"\s*\|\|\s*hotspot\.claimPartKey === "cooktop"/);
  assert.match(source, /hotspot\.componentKey === "worktop"/);
  assert.match(source, /\(hotspot\) => !displaySelectedIds\.has\(hotspot\.componentId\)/);
  assert.doesNotMatch(source, /hasSelectedWorktop\s*&&\s*hotspot\.claimPartKey === "cooktop"/);
  assert.match(source, /hasSelectedWorktop\s*&&\s*visibleApplianceImageHotspots\.length/);
  assert.match(source, /className=\{styles\.planApplianceCutouts\}/);
  assert.match(source, /className=\{styles\.planApplianceCutoutBacking\}[\s\S]*clipPath=\{`url\(#\$\{applianceClipPathId\}\)`\}/);
  assert.match(styles, /\.planApplianceCutoutBacking[\s\S]*fill:\s*#fff;/);
  assert.match(
    styles,
    /\.planApplianceCutouts[\s\S]*z-index:\s*999;[\s\S]*pointer-events:\s*none;/,
  );
});

test("AB 105837 right worktop meets the calibrated cooktop edge without a surface gap", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "components", "kitchen-svg-stage.jsx"),
    "utf8",
  );

  assert.match(
    source,
    /"ab-105837":\s*\[[\s\S]*componentKey:\s*"worktop",\s*points:\s*\[\[43\.76,\s*54\.03\],\s*\[52\.05,\s*53\.0\][\s\S]*\[52\.97,\s*55\.84\]\]/,
  );
});

test("oven and cooktop migration backfills the existing claim-parts table", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260713160000_add_oven_cooktop_claim_parts", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /\('oven',\s*'Oven',\s*'Backofen',\s*40\)/);
  assert.match(migration, /\('cooktop',\s*'Cooktop',\s*'Kochfeld',\s*50\)/);
  assert.match(migration, /lower\(coalesce\(item\."componentKey", ''\)\) IN \('oven-module', 'oven-base'\)/);
  assert.match(migration, /ON CONFLICT \("kitchenId", "partKey"\) DO UPDATE/);
});

test("oven drawer migration adds one claim-only part without changing kitchen items", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260713200000_add_oven_drawer_claim_part", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /INSERT INTO "KitchenClaimPart"/);
  assert.match(migration, /'oven-drawer'/);
  assert.match(migration, /'Drawer under oven'/);
  assert.match(migration, /'Schublade unter Backofen'/);
  assert.match(migration, /lower\(coalesce\(item\."componentKey", ''\)\) IN \('oven-module', 'oven-base'\)/);
  assert.match(migration, /ON CONFLICT \("kitchenId", "partKey"\) DO UPDATE/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+"KitchenItem"/i);
});

test("claim article-code migration stores official AB metadata without changing kitchen items", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260713210000_add_claim_part_article_codes", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /ADD COLUMN "articleCode" TEXT/);
  assert.match(migration, /'oven-drawer', 'UHK', 'Lower Cabinet for Built-in Oven', 'Unterschrank für Einbauherde'/);
  assert.match(migration, /'oven', 'EH92364E-A', 'Built-in Oven', 'Einbauherd'/);
  assert.match(migration, /'cooktop', '9EC744100C', 'Ceramic Cooktop 60cm', 'Glaskeramikkochfeld 60 cm'/);
  assert.match(migration, /'sink-cabinet', 'SP60', 'Sink Lower Cabinet', 'Spülen-Unterschrank'/);
  assert.match(migration, /'sink', '526335', 'Built-in Sink BLANCO TIPO 45 S', 'Einbau-Spüle BLANCO TIPO 45 S'/);
  assert.match(migration, /'faucet', '517720', 'Kitchen Faucet BLANCO DARAS HD', 'Küchenarmatur BLANCO DARAS HD'/);
  assert.match(migration, /'worktop-left', 'PLR60-1'/);
  assert.match(migration, /'worktop-right', 'PLR60-2'/);
  assert.match(migration, /'cabinet-side-panel'[\s\S]*'WU16'/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+"KitchenItem"/i);
});

test("L worktop migration adds two claim-only parts without changing kitchen items", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260713180000_add_l_worktop_claim_parts", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /INSERT INTO "KitchenClaimPart"/);
  assert.match(migration, /lower\(coalesce\(item\."componentKey", ''\)\) = 'worktop'/);
  assert.match(migration, /'worktop-left', 'Left Worktop', 'Arbeitsplatte links', 60/);
  assert.match(migration, /'worktop-right', 'Right Worktop', 'Arbeitsplatte rechts', 70/);
  assert.match(migration, /'ab-105840'/);
  assert.match(migration, /ON CONFLICT \("kitchenId", "partKey"\) DO UPDATE/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+"KitchenItem"/i);
});

test("worktop end-panel migration adds PLR60-3 only to the claims table", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260714140000_add_worktop_end_panel_claim_part", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /INSERT INTO "KitchenClaimPart"/);
  assert.match(migration, /'worktop-end-panel'/);
  assert.match(migration, /'PLR60-3'/);
  assert.match(migration, /'Worktop End Panel'/);
  assert.match(migration, /'Arbeitsplatten-Seitenwange'/);
  assert.match(migration, /lower\(kitchen\."slug"\) = 'ab-105807'/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+"KitchenItem"/i);
});

test("UPK20 filler panels retain their shared catalog identity in service claims", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-L-600", "base-module-1", "Base cabinet", {
        isLocked: true,
        blendeCode: "UPK20",
        blendeLabel: "UPK20 20 cm",
      }),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105805",
  });

  const fillerPanel = result.selectableComponents.find((entry) => entry.claimPartKey === "blende");
  assert.deepEqual(
    {
      code: fillerPanel?.code,
      articleCode: fillerPanel?.articleCode,
      name: fillerPanel?.name,
      nameDe: fillerPanel?.nameDe,
    },
    {
      code: "UPK20",
      articleCode: "UPK20",
      name: "Filler Panel up to 20 cm",
      nameDe: "Passblende bis 20 cm",
    },
  );
});

test("L kitchens use one UPEF65 instead of two UPK20 filler panels", () => {
  const seed = fs.readFileSync(path.join(repoRoot, "prisma", "seed.js"), "utf8");
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260714160000_replace_l_upk20_double_blenden_with_upef65", "migration.sql"),
    "utf8",
  );

  assert.doesNotMatch(seed, /blendeCode:\s*"UPK20 x2"/i);
  assert.match(seed, /CAB-BASE-AB105805-500-L[\s\S]*blendeCode:\s*"UPEF65"/);
  assert.match(seed, /CAB-BASE-AB105825-US60-R[\s\S]*blendeCode:\s*"UPEF65"/);
  assert.match(migration, /"blendeCode"\s*=\s*'UPEF65'/);
  assert.match(migration, /"catalogBlendeQuantity"\s*=\s*1/);
  assert.doesNotMatch(seed, /reconcileExisting:\s*true/);
});

test("AB 105743 uses its measured vector plan and exact Excel selection mapping", () => {
  const stageSource = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");
  const selectionSource = fs.readFileSync(path.join(repoRoot, "components", "kitchen-selection-utils.js"), "utf8");
  const claimSource = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-hotspots.js"), "utf8");
  const seedSource = fs.readFileSync(path.join(repoRoot, "prisma", "seed.js"), "utf8");

  assert.match(stageSource, /"ab-105743":\s*"\/plans\/AB%20105743\.svg"/);
  assert.match(stageSource, /"ab-105743":\s*\[[\s\S]*componentKey:\s*"base-module-1"[\s\S]*componentKey:\s*"base-module-2"[\s\S]*componentKey:\s*"sink-base"[\s\S]*componentKey:\s*"base-module-3"[\s\S]*componentKey:\s*"oven-module"[\s\S]*componentKey:\s*"drawer-module"/);
  assert.match(stageSource, /componentKey:\s*"wall-cabinet-3"[\s\S]*\[70\.56057,\s*21\.788235\][\s\S]*\[75\.648456,\s*31\.428571\]/);
  assert.match(stageSource, /componentKey:\s*"worktop"[\s\S]*\[59\.900238,\s*52\.020168\][\s\S]*\[66\.88361,\s*56\.598319\][\s\S]*\[50\.935867,\s*53\.310924\]/);
  assert.match(stageSource, /componentKey:\s*"worktop"[\s\S]*\[20\.294537,\s*57\.747899\][\s\S]*\[50\.935867,\s*54\.420168\][\s\S]*\[20\.294537,\s*58\.857143\]/);
  assert.match(seedSource, /code:\s*"DISH-AB105743-600"[\s\S]*articlePriceWithBlende\("A-EGSPV597210 \+ TGV60",\s*"UPEF65",\s*1\)/);
  assert.match(seedSource, /code:\s*"CAB-BASE-AB105743-US30-R"[\s\S]*articlePriceWithBlende\("US30",\s*"UPK20",\s*1\)/);
  assert.match(seedSource, /slug:\s*"ab-105743"[\s\S]*items:\s*AB_105743_ITEMS/);
  assert.match(selectionSource, /"ab-105743":\s*\[\["component-wall-cabinet-2",\s*"component-extractor-hood"\]\]/);
  assert.match(claimSource, /"ab-105743":\s*\{[\s\S]*"base-module-3"[\s\S]*bands:\s*\[\[50\.194774,\s*50\.935867\],\s*\[50\.935867,\s*51\.562945\]\]/);
});

test("AB 105748 uses its measured vector plan, Excel articles, and split claim geometry", () => {
  const stageSource = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");
  const selectionSource = fs.readFileSync(path.join(repoRoot, "components", "kitchen-selection-utils.js"), "utf8");
  const claimSource = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-hotspots.js"), "utf8");
  const seedSource = fs.readFileSync(path.join(repoRoot, "prisma", "seed.js"), "utf8");
  const planSvg = fs.readFileSync(path.join(repoRoot, "public", "plans", "AB 105748.svg"), "utf8");

  assert.match(stageSource, /"ab-105748":\s*"\/plans\/AB%20105748\.svg"/);
  assert.match(planSvg, /stroke="#f0f0f0"/);
  assert.match(stageSource, /"ab-105748":\s*\[[\s\S]*componentKey:\s*"refrigerator"[\s\S]*componentKey:\s*"wall-cabinet-1"[\s\S]*componentKey:\s*"worktop"[\s\S]*componentKey:\s*"sink-base"[\s\S]*componentKey:\s*"base-module-3"[\s\S]*componentKey:\s*"drawer-module"/);
  assert.match(stageSource, /componentKey:\s*"wall-cabinet-1",\s*points:\s*\[\[28\.019002,\s*16\.947899\],\s*\[23\.087886,\s*15\.919328\],\s*\[23\.087886,\s*27\.858824\],\s*\[28\.019002,\s*28\.867227\]\]/);
  assert.match(stageSource, /componentKey:\s*"wall-cabinet-2",\s*points:\s*\[\[41\.258907,\s*13\.297479\][\s\S]*\[46\.204276,\s*14\.305882\]\]/);
  assert.match(stageSource, /componentKey:\s*"extractor-hood",\s*points:\s*\[\[31\.795724,\s*39\.515966\],\s*\[35\.814727,\s*40\.342857\],\s*\[35\.814727,\s*38\.769748\]\]/);
  assert.match(stageSource, /componentKey:\s*"extractor-hood",\s*points:\s*\[\[35\.814727,\s*38\.769748\],\s*\[46\.204276,\s*37\.257143\],\s*\[46\.204276,\s*38\.85042\],\s*\[35\.814727,\s*40\.342857\]\]/);
  assert.match(stageSource, /componentKey:\s*"wall-cabinet-3",\s*points:\s*\[\[51\.648456,\s*11\.784874\][\s\S]*\[56\.579572,\s*12\.813445\]\]/);
  assert.match(stageSource, /componentKey:\s*"sink-faucet",\s*points:\s*\[\[60\.897862,\s*45\.344538\],\s*\[65\.273159,\s*45\.344538\],\s*\[65\.273159,\s*54\.763025\],\s*\[60\.897862,\s*54\.763025\]\]/);
  assert.match(stageSource, /componentKey:\s*"worktop",\s*points:\s*\[\[72\.342043,\s*60\.127731\][\s\S]*\[82\.95962,\s*86\.547899\]/);
  assert.match(seedSource, /const AB_105748_ITEMS[\s\S]*code:\s*"DISH-AB105748-450"[\s\S]*articleNumber:\s*"A-EGSPV597210 \+ TGV60"/);
  assert.match(seedSource, /code:\s*"CAB-BASE-AB105748-US30"[\s\S]*articlePriceWithBlende\("US30",\s*"UPK20",\s*1\)/);
  assert.match(seedSource, /code:\s*"CAB-WALL-AB105748-H6002"[\s\S]*articlePriceWithBlende\("H6002",\s*"HPK2002",\s*1\)/);
  assert.match(seedSource, /slug:\s*"ab-105748"[\s\S]*items:\s*AB_105748_ITEMS/);
  assert.match(selectionSource, /"ab-105748":\s*\[\["component-wall-cabinet-2",\s*"component-extractor-hood"\]\]/);
  assert.match(claimSource, /"ab-105748":\s*\[\[-2\.13834,\s*0\.978923\]/);
  assert.match(claimSource, /"ab-105748":\s*\{[\s\S]*indexPartKeys:\s*\["worktop-left",\s*"worktop-right",\s*"worktop-end-panel"\]/);
});

test("AB 105750, AB 105753 and AB 105756 retain two UPEF65 corner panels", () => {
  const seed = fs.readFileSync(path.join(repoRoot, "prisma", "seed.js"), "utf8");
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260715090000_set_double_upef65_for_l_kitchen_105750_105753_105756", "migration.sql"),
    "utf8",
  );

  assert.match(seed, /AB_105750_105753_105756_ITEMS[\s\S]*blendeCode:\s*"UPEF65 x2"/);
  assert.match(seed, /blendePrice:\s*blendePrice\("UPEF65", 2\)/);
  assert.match(migration, /'ab-105750', 'ab-105753', 'ab-105756'/);
  assert.match(migration, /"catalogBlendeQuantity"\s*=\s*2/);
  assert.match(migration, /upper\(COALESCE\(item\."blendeCode", ''\)\) LIKE 'UPK20%'/i);
});

test("two matching UPEF65 panels remain one ASC article with quantity two", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-AB105747-US30", "drawer-module", "Lower cabinet", {
        isLocked: true,
        blendeCode: "UPEF65 x2",
        blendeLabel: "Eckpassblende Unterschrank x 2",
        catalogBlendeQuantity: 2,
        catalogBlende: {
          code: "UPEF65",
          name: "Corner filler panel for Lower cabinet",
          nameDe: "Eckpassblende Unterschrank",
        },
      }),
    ],
  };

  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105750",
  });
  const blenden = result.selectableComponents.filter((entry) => entry.claimPartKey === "blende");

  assert.equal(blenden.length, 1);
  assert.equal(blenden[0].articleCode, "UPEF65");
  assert.equal(blenden[0].blendeQuantity, 2);
});

test("service claims prefer the saved corner Blende over a stale catalog link", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-L-500", "base-module-2", "Lower cabinet", {
        isLocked: true,
        blendeCode: "UPEF65",
        blendeLabel: "Eckpassblende Unterschrank",
        catalogBlendeQuantity: 2,
        catalogBlende: {
          code: "UPK20",
          name: "Filler Panel up to 20 cm",
          nameDe: "Passblende bis 20 cm",
        },
      }),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105805",
  });
  const cornerBlende = result.selectableComponents.find((entry) => entry.claimPartKey === "blende");

  assert.deepEqual(
    {
      code: cornerBlende?.code,
      articleCode: cornerBlende?.articleCode,
      name: cornerBlende?.name,
      nameDe: cornerBlende?.nameDe,
      blendeQuantity: cornerBlende?.blendeQuantity,
    },
    {
      code: "UPEF65",
      articleCode: "UPEF65",
      name: "Corner filler panel for Lower cabinet",
      nameDe: "Eckpassblende Unterschrank",
      blendeQuantity: 1,
    },
  );
});

test("catalog linking honors Blende changes saved in Admin", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "scripts", "backfill-kitchen-item-catalog-links.js"),
    "utf8",
  );

  assert.match(source, /blendeCode:\s*nullableString\(item\.blendeCode\)/);
  assert.match(source, /blendePrice:\s*formatMoney\(item\.blendePrice\)/);
  assert.match(source, /price:\s*formatMoney\(item\.price\)/);
});

test("missing worktop end-panel backfill covers AB 105837, 105840, and 105843", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260714150000_add_missing_worktop_end_panel_claim_parts", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /'ab-105837'/);
  assert.match(migration, /'ab-105840'/);
  assert.match(migration, /'ab-105843'/);
  assert.match(migration, /'worktop-end-panel'/);
  assert.match(migration, /'PLR60-3'/);
  assert.match(migration, /ON CONFLICT \("kitchenId", "partKey"\) DO UPDATE/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+"KitchenItem"/i);
});

test("worktop end-panel claims use the shared WU16 cabinet-side-panel metadata", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260714151000_correct_worktop_end_panel_claim_metadata", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /UPDATE "KitchenClaimPart"/);
  assert.match(migration, /'worktop-end-panel'/);
  assert.match(migration, /'WU16'/);
  assert.match(migration, /'Cabinet side panel'/);
  assert.match(migration, /'Unterschrank-Wange'/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
});

test("filter migration adds FWK124 only to the claims table", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260714150000_add_filter_claim_part", "migration.sql"),
    "utf8",
  );
  const seed = fs.readFileSync(path.join(repoRoot, "prisma", "seed.js"), "utf8");

  assert.match(migration, /INSERT INTO "KitchenClaimPart"/);
  assert.match(migration, /'filter'/);
  assert.match(migration, /'FWK124'/);
  assert.match(migration, /upper\(coalesce\(item\."articleNumber", ''\)\) LIKE '%FWK124%'/);
  assert.match(migration, /ON CONFLICT \("kitchenId", "partKey"\) DO UPDATE/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+"KitchenItem"/i);
  assert.match(seed, /partKey:\s*"filter"[\s\S]*articleCode:\s*"FWK124"/);
});

test("dishwasher migration stores the exact price-list claim identities", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260714160000_add_dishwasher_claim_parts", "migration.sql"),
    "utf8",
  );
  const seed = fs.readFileSync(path.join(repoRoot, "prisma", "seed.js"), "utf8");

  assert.match(migration, /INSERT INTO "KitchenClaimPart"/);
  assert.match(migration, /'dishwasher', 'Fully Integrated Dishwasher', 'Vollintegrierter Geschirrspüler', 'A-EGSPV594400'/);
  assert.match(migration, /'furniture-front', 'Furniture Front \(Dishwasher\)', 'Möbelfront \(Geschirrspüler\)', 'TGV60'/);
  assert.match(migration, /LIKE '%TGV60%'/);
  assert.doesNotMatch(migration, /TGV45|A-EGSPV587915/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.match(seed, /partKey:\s*"dishwasher"[\s\S]*articleCode:\s*"A-EGSPV594400"/);
  assert.match(seed, /partKey:\s*"furniture-front"[\s\S]*articleCode:\s*"TGV60"/);
});

test("AB 105825 claim sink follows the calibrated bowl polygon", () => {
  const result = buildServiceClaimPartHotspots(
    [{ componentKey: "sink-faucet", left: 20, top: 40, width: 8, height: 14 }],
    [
      { partKey: "sink", sourceComponentKey: "sink-faucet" },
      { partKey: "faucet", sourceComponentKey: "sink-faucet" },
    ],
    "ab-105825",
  );
  const sink = result.find((entry) => entry.claimPartKey === "sink");
  const faucet = result.find((entry) => entry.claimPartKey === "faucet");

  assert.equal(sink.left, 14);
  assert.ok(Math.abs(sink.top - 50.92) < 0.000001);
  assert.ok(Math.abs(sink.width - 22.4) < 0.000001);
  assert.ok(Math.abs(sink.height - 3.78) < 0.000001);
  assert.match(sink.clipPath, /^polygon\(/);
  assert.equal(faucet.left, 20);
  assert.equal(faucet.top, 40);
  assert.equal(faucet.width, 8);
  assert.equal(faucet.height, 14);
});

test("all L-shaped claim plans separate the complete faucet from the sink bowl", () => {
  const lShapedSlugs = [
    "ab-105743",
    "ab-104968",
    "ab-105734",
    "ab-105737",
    "ab-105740",
    "ab-105805",
    "ab-105809",
    "ab-105813",
    "ab-105817",
    "ab-105822",
    "ab-105825",
    "ab-105828",
    "ab-105831",
    "ab-105834",
    "ab-105837",
    "ab-105840",
    "ab-105843",
  ];

  for (const kitchenSlug of lShapedSlugs) {
    const result = buildServiceClaimPartHotspots(
      [{ componentKey: "sink-faucet", left: 20, top: 40, width: 8, height: 14 }],
      [
        { partKey: "sink", sourceComponentKey: "sink-faucet" },
        { partKey: "faucet", sourceComponentKey: "sink-faucet" },
      ],
      kitchenSlug,
    );
    const sink = result.find((entry) => entry.claimPartKey === "sink");
    const faucet = result.find((entry) => entry.claimPartKey === "faucet");

    assert.match(sink.clipPath, /^polygon\(/, kitchenSlug);
    assert.ok(sink.width > faucet.width, kitchenSlug);
    assert.equal(faucet.left, 20, kitchenSlug);
    assert.equal(faucet.top, 40, kitchenSlug);
    assert.equal(faucet.width, 8, kitchenSlug);
    assert.equal(faucet.height, 14, kitchenSlug);
  }
});

test("oven seams stay fixed when the picker extends a cabinet hotspot through the plinth", () => {
  const originalHeight = 24.16;
  const extendedHeight = 29.41;
  const result = buildServiceClaimPartHotspots([{
    componentKey: "oven-module",
    left: 35.43,
    top: 59.5,
    width: 14.16,
    height: extendedHeight,
    claimOriginalBodyHeightRatio: originalHeight / extendedHeight,
  }], [
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
  ], "ab-105829");
  const oven = result.find((entry) => entry.claimPartKey === "oven");
  const drawer = result.find((entry) => entry.claimPartKey === "oven-drawer");
  const pdfSeam = 59.5 + originalHeight * 0.82765;

  assert.ok(Math.abs(oven.top + oven.height - pdfSeam) < 0.000001);
  assert.ok(Math.abs(drawer.top - pdfSeam) < 0.000001);
  assert.ok(drawer.height > extendedHeight - originalHeight);
});

test("AB 105822 reuses the pixel-matched AB 105825 sink polygon", () => {
  const claimParts = [
    { partKey: "sink", sourceComponentKey: "sink-faucet" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
  ];
  const hotspot = [{ componentKey: "sink-faucet", left: 20, top: 40, width: 8, height: 14 }];
  const sinkFor = (slug) => buildServiceClaimPartHotspots(hotspot, claimParts, slug)
    .find((entry) => entry.claimPartKey === "sink");

  assert.deepEqual(sinkFor("ab-105822"), sinkFor("ab-105825"));
});

test("German service claim labels do not fall back to English catalog names", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(source, /function formatGermanClaimAreaName/);
  assert.match(source, /claimPartNameDe[\s\S]*return claimPartNameDe/);
  assert.match(source, /formatClaimAreaName\(option, option\.name, language\)/);
  assert.match(source, /service-field__problem-area-article-code[\s\S]*area\.resolvedArticleCode/);
  assert.match(source, /component-claim-oven"\) \{[\s\S]*return "Backofen"/);
  assert.match(source, /component-claim-oven-drawer"\) \{[\s\S]*return "Schublade unter Backofen"/);
  assert.match(source, /component-claim-cooktop"\) \{[\s\S]*return "Kochfeld"/);
  assert.match(source, /component-claim-worktop-left"\) \{[\s\S]*return "Arbeitsplatte links"/);
  assert.match(source, /component-claim-worktop-right"\) \{[\s\S]*return "Arbeitsplatte rechts"/);
  assert.match(source, /code\.startsWith\("REF-"\)[\s\S]*Standk\\u00fchlschrank 178 cm/);
  assert.match(source, /normalizedName\.includes\("lower cabinet with drawer"\)[\s\S]*Unterschrank mit Schublade/);
  assert.match(source, /normalizedName\.includes\("dishwasher"\)[\s\S]*Vollintegrierter Geschirrsp\\u00fcler/);
});
