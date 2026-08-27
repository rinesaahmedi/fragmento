import assert from "node:assert/strict";
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
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "../lib/service-claim-kitchen-hotspots.js";
import { getServiceClaimLinkedComponentIds } from "../lib/service-claim-kitchen-plan-selection.js";
import { serializeKitchenForLegacy } from "../lib/catalog.js";

const translate = (_key, fallback) => fallback;

test("Burger 103898 uses its supplied vector plan and exact L-shaped faces", () => {
  const svg = readFileSync(new URL("../public/plans/670 103898.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["burger-103898"];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG["burger-103898"], "/plans/670%20103898.svg");
  assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG["burger-103898"], { width: 842, height: 595 });
  assert.ok(hotspots.every((hotspot) => Array.isArray(hotspot.points) && hotspot.points.length >= 4));
  assert.equal(keys.filter((key) => key.startsWith("wall-cabinet-")).length, 10);
  assert.equal(keys.filter((key) => key === "worktop").length, 2);
  assert.equal(keys.filter((key) => key === "sink-faucet").length, 3);
  assert.equal(keys.filter((key) => key === "under-cabinet-light").length, 2);
  assert.equal(keys.filter((key) => key === "refrigerator").length, 3);
  assert.equal(keys.filter((key) => key === "base-module-2").length, 3);
  assert.equal(keys.filter((key) => key === "drawer-module").length, 2);
  const refrigeratorTopRight = hotspots.find((hotspot) => hotspot.componentKey === "refrigerator").points[2];
  const clippedWallCabinetSide = hotspots.filter((hotspot) => hotspot.componentKey === "wall-cabinet-1")[2];
  assert.ok(
    clippedWallCabinetSide.points.some((point) => point[0] === refrigeratorTopRight[0] && point[1] === refrigeratorTopRight[1]),
    "wall cabinet side should be clipped to the refrigerator top-right seam",
  );
  const rightWorktop = hotspots.filter((hotspot) => hotspot.componentKey === "worktop")[1];
  const leftWorktop = hotspots.filter((hotspot) => hotspot.componentKey === "worktop")[0];
  assert.ok(
    leftWorktop.points.some((point) => point[0] === 48.655582 && point[1] === 57.021849),
    "left worktop should include the raised inside-corner vertex",
  );
  assert.ok(
    leftWorktop.points.some((point) => point[0] === 59.2019 && point[1] === 58.554622),
    "left worktop should include the wall-intersection vertex without a triangular gap",
  );
  assert.ok(
    rightWorktop.points.every((point) => point[0] !== 48.655582 || point[1] !== 57.021849),
    "right worktop should stop at the inside-corner seam without overlapping the left worktop",
  );
  assert.ok(
    rightWorktop.points.some((point) => point[0] === 90.228029 && point[1] === 63.011765),
    "right worktop selection should include its exposed front-right lower edge",
  );
  for (const key of ["oven-module", "sink-base", "sink-faucet", "dishwasher-base", "extractor-hood"]) {
    assert.ok(keys.includes(key), `${key} should have a measured selection face`);
  }
});

test("Burger 103898 dishwasher technical details stay light above selection fills", () => {
  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["burger-103898"];
  assert.deepEqual(details.map((detail) => detail.key), ["dishwasher-basket", "dishwasher-gs-mark"]);
  assert.ok(details.every((detail) => detail.componentKey === "dishwasher-base"));
});

test("Burger 103898 maps all twelve plan callouts and links the hood package", () => {
  const expectedByCode = {
    "OVEN-B-600-HOB": "1",
    "TOP-AB105806": "2",
    "SINK-BASE-BURGER103898-600": "3",
    "REF-BURGER103898-KGCN388140E": "4",
    "CAB-BASE-BURGER103898-US50": "5",
    "CAB-BASE-BURGER103898-US60-UPE65": "6",
    "DISH-BURGER103898-600": "7",
    "CAB-BASE-BURGER103898-US30": "8",
    "CAB-WALL-BURGER103898-H5072": "9",
    "CAB-HOOD-BURGER103898-HFLH6072": "10",
    "CAB-WALL-BURGER103898-H6072": "11",
    "CAB-WALL-BURGER103898-H3072": "12",
  };

  for (const [code, expected] of Object.entries(expectedByCode)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${expected}. `), `${code} should use callout ${expected}`);
  }
  assert.deepEqual(
    getLinkedComponentIds("burger-103898", "component-wall-cabinet-2"),
    ["component-wall-cabinet-2", "component-extractor-hood", "component-under-cabinet-light"],
  );
  assert.deepEqual(
    getAutoLinkedAccessoryCodes(
      "burger-103898",
      getLinkedComponentIds("burger-103898", "component-extractor-hood"),
    ),
    ["ACC-LIGHT-003"],
  );
  for (const componentId of [
    "component-wall-cabinet-2",
    "component-extractor-hood",
    "component-under-cabinet-light",
  ]) {
    assert.deepEqual(
      getServiceClaimLinkedComponentIds("burger-103898", componentId),
      ["component-wall-cabinet-2", "component-extractor-hood", "component-under-cabinet-light"],
      `${componentId} should toggle the complete hood assembly in claims`,
    );
  }
});

test("Burger 103898 seeds a separate Burger program kitchen and contract", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  assert.match(seed, /slug: "burger-103898"[\s\S]*?kitchenCode: "103 898"[\s\S]*?programmId: "BURGER CINDY"[\s\S]*?items: BURGER_103898_ITEMS/);
  assert.match(seed, /contractNumber: "670103898", kitchenSlug: "burger-103898"/);
  assert.match(seed, /contractNumber: "111103898", kitchenSlug: "burger-103898"/);
  assert.match(seed, /programmId: kitchen\.programmId \|\| DEFAULT_KITCHEN_PROGRAMM_ID/);
  assert.match(seed, /CAB-BASE-BURGER103898-US50[\s\S]*?price: "247\.00"/);
  assert.match(seed, /CAB-BASE-BURGER103898-US60-UPE65[\s\S]*?price: "349\.00"[\s\S]*?blendeCode: "UPE65"[\s\S]*?blendePrice: "79\.00"/);
  assert.match(seed, /code: "UPE65"[\s\S]*?price: "79\.00"/);
  assert.match(seed, /DISH-BURGER103898-600[\s\S]*?price: "586\.00"/);
  assert.match(seed, /CAB-HOOD-BURGER103898-HFLH6072[\s\S]*?price: "346\.00"[\s\S]*?catalogArticleNumber: "FH664621E \+ FWK124 \+ HFLH6072"/);
  assert.match(seed, /displayArticleNumber: "H5072", catalogArticleNumber: "H5002"/);
});

test("Burger 103898 registers the independent L-shaped claim geometry", () => {
  const source = readFileSync(new URL("../lib/service-claim-kitchen-hotspots.js", import.meta.url), "utf8");
  assert.equal(isLShapedClaimKitchen("burger-103898"), true);
  assert.match(source, /L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[\s\S]*?"burger-103898"/);
  assert.match(source, /COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[\s\S]*?"burger-103898"/);
  assert.match(source, /"burger-103898":\s*\{\s*indexPartKeys:\s*\["worktop-left",\s*"worktop-right"\]/);
});

test("Burger claim worktops preserve both exact configurator polygons", () => {
  const worktops = PLAN_HOTSPOTS_BY_SLUG["burger-103898"]
    .filter((hotspot) => hotspot.componentKey === "worktop");
  const claims = buildServiceClaimPartHotspots(worktops, [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ], "burger-103898");

  assert.deepEqual(claims.map((hotspot) => hotspot.claimPartKey), ["worktop-left", "worktop-right"]);
  for (let index = 0; index < worktops.length; index += 1) {
    assert.deepEqual(claims[index].points, worktops[index].points);
  }
});

test("public kitchen serialization uses Burger program prices and supplier-facing codes", () => {
  const serialized = serializeKitchenForLegacy({
    id: "kitchen-1",
    slug: "burger-103898",
    name: "103898",
    items: [
      {
        id: "item-1",
        itemType: "COMPONENT",
        code: "CAB-BASE-BURGER103898-US60-UPE65",
        articleNumber: "US60 + UPE65",
        name: "Base cabinet",
        price: 355,
        isLocked: false,
        catalogArticleId: "article-1",
        catalogArticle: {
          articleNumber: "US60",
          name: "Base cabinet 60 cm",
          price: 287,
          programPrices: [{ price: 270 }],
        },
        catalogBlendeId: "blende-1",
        catalogBlendeQuantity: 1,
        catalogBlende: {
          code: "UPE65",
          name: "Corner filler panel",
          price: 68,
          programPrices: [{ price: 79 }],
        },
      },
      {
        id: "item-2",
        itemType: "COMPONENT",
        code: "CAB-HOOD-BURGER103898-HFLH6072",
        articleNumber: "FH664621E + FWK124 + HFLH6072",
        name: "Extractor hood package",
        price: 349,
        isLocked: false,
        catalogArticleId: "article-2",
        catalogArticle: {
          articleNumber: "FH664621E + FWK124 + HFLH6072",
          name: "Flat screen extractor hood + cabinet + filter 60 cm",
          price: 349,
          programPrices: [{ price: 346 }],
        },
      },
    ],
    claimParts: [],
  });

  assert.equal(serialized.components[0].articleNumber, "US60 + UPE65");
  assert.equal(serialized.components[0].price, 349);
  assert.equal(serialized.components[0].blendePrice, 79);
  const hood = serialized.components.find(
    (item) => item.code === "CAB-HOOD-BURGER103898-HFLH6072",
  );
  assert.equal(hood.articleNumber, "FH664621E + FWK124 + HFLH6072");
  assert.equal(hood.price, 346);
});

test("order validation accepts Burger supplier-facing article numbers", () => {
  const orders = readFileSync(new URL("../lib/orders.js", import.meta.url), "utf8");

  assert.match(orders, /const allowKitchenArticleNumberAlias = kitchen\.slug === "burger-103898"/);
  assert.match(orders, /options\.allowKitchenArticleNumberAlias === true[\s\S]*?submittedArticleNumber === matchedKitchenArticleNumber/);
  assert.match(orders, /mapCatalogItem\(kitchen\.items, item, ItemType\.COMPONENT, \{[\s\S]*?allowKitchenArticleNumberAlias/);
  assert.match(orders, /kitchen\.slug === "burger-103898"[\s\S]*?findUnique\(\{[\s\S]*?code: "UPE65"/);
  assert.match(orders, /articleNumber: "FH664621E \+ FWK124 \+ HFLH6072"/);
  assert.match(orders, /const useProgramPrices = kitchen\.slug === "burger-103898"/);
});
