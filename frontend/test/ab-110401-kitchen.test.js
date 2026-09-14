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
  buildServiceClaimBlendeHotspots,
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "../lib/service-claim-kitchen-hotspots.js";
import {
  buildServiceClaimSelectableComponents,
  collapseServiceClaimLinkedComponents,
  getServiceClaimLinkedComponentIds,
} from "../lib/service-claim-kitchen-plan-selection.js";
import { serializeKitchenForLegacy } from "../lib/catalog.js";

const translate = (_key, fallback) => fallback;

test("AB 110401 uses its own vector plan and exact selectable faces", () => {
  const svg = readFileSync(new URL("../public/plans/AB 110401.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-110401"];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG["ab-110401"], "/plans/AB%20110401.svg");
  assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG["ab-110401"], { width: 842, height: 595 });
  assert.equal(hotspots.length, 35);
  assert.ok(hotspots.every((hotspot) => hotspot.preserveManualSize === true));
  assert.ok(hotspots.every((hotspot) => Array.isArray(hotspot.points) && hotspot.points.length >= 4));
  assert.equal(new Set(keys.filter((key) => key.startsWith("wall-cabinet-"))).size, 6);
  assert.equal(keys.filter((key) => key === "worktop").length, 4);
  assert.equal(keys.filter((key) => key === "sink-faucet").length, 3);
  assert.equal(keys.filter((key) => key === "base-module-1").length, 3);
  assert.equal(keys.filter((key) => key === "base-module-3").length, 3);
  assert.equal(keys.filter((key) => key === "base-module-4").length, 3);
  assert.equal(keys.includes("refrigerator"), false);
  for (const key of ["oven-module", "sink-base", "dishwasher-base", "extractor-hood"]) {
    assert.ok(keys.includes(key), `${key} should have an exact selectable polygon`);
  }
});

test("AB 110401 faucet follows all three PDF silhouettes", () => {
  const faucet = PLAN_HOTSPOTS_BY_SLUG["ab-110401"]
    .filter((hotspot) => hotspot.componentKey === "sink-faucet");

  assert.equal(faucet.length, 3);
  assert.equal(faucet[0].points.length, 38);
  assert.ok(faucet[0].points.some(([x, y]) => x === 22.546318 && y === 49.761345));
  assert.equal(faucet[1].points.length, 14);
  assert.equal(faucet[2].points.length, 13);
});

test("AB 110401 maps every active schedule item", () => {
  const expectedByCode = {
    "SINK-BASE-AB110401-DEFAULT": "3",
    "CAB-BASE-AB110401-DEFAULT-UPK20-1": "4",
    "DISH-AB110401-600": "6",
    "CAB-BASE-AB110401-DEFAULT-3": "7",
    "CAB-BASE-AB110401-DEFAULT-UPK20-2": "8",
    "CAB-WALL-AB110401-H4502-1": "9",
    "CAB-WALL-AB110401-H4502-2": "10",
    "CAB-WALL-AB110401-H6002-1": "12",
    "CAB-HOOD-AB110401-600": "13",
    "HOOD-AB110401-FH664621E": "13",
    "CAB-WALL-AB110401-H6002-HPK2002": "14",
  };

  for (const [code, expected] of Object.entries(expectedByCode)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${expected}. `), `${code} should use callout ${expected}`);
  }
});

test("AB 110401 preserves dishwasher details and links its hood package", () => {
  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-110401"];
  assert.deepEqual(details.map((detail) => detail.key), ["dishwasher-basket", "dishwasher-gs-mark"]);
  assert.ok(details.every((detail) => detail.componentKey === "dishwasher-base"));
  assert.ok(details.every((detail) => detail.persistWhenSelected === true));
  assert.deepEqual(
    getLinkedComponentIds("ab-110401", "component-wall-cabinet-5"),
    ["component-wall-cabinet-5", "component-extractor-hood"],
  );
  assert.deepEqual(
    getLinkedComponentIds("ab-110401", "component-sink-base"),
    ["component-sink-base", "component-base-module-2"],
  );
  assert.deepEqual(
    getLinkedComponentIds("ab-110401", "component-base-module-2"),
    ["component-sink-base", "component-base-module-2"],
  );
  assert.deepEqual(
    getLinkedComponentIds("ab-110401", "component-wall-cabinet-2"),
    ["component-wall-cabinet-2", "component-wall-cabinet-3"],
  );
});

test("AB 110401 treats both H9002 upper-cabinet faces as one ASC component", () => {
  const firstFace = "component-wall-cabinet-2";
  const secondFace = "component-wall-cabinet-3";

  assert.deepEqual(
    getServiceClaimLinkedComponentIds("ab-110401", secondFace),
    [firstFace, secondFace],
  );
  assert.deepEqual(
    collapseServiceClaimLinkedComponents("ab-110401", [
      { componentId: firstFace, articleNumber: "H9002" },
      { componentId: secondFace, articleNumber: "H9002" },
    ]),
    [{ componentId: firstFace, articleNumber: "H9002" }],
  );
});

test("AB 110401 separates the far-right US60 from its UPK20 Blende in ASC", () => {
  const cabinet = {
    id: "ab-110401-us60",
    itemType: "COMPONENT",
    code: "CAB-BASE-AB110401-DEFAULT-UPK20-2",
    articleNumber: "US60",
    name: "Lower Cabinet with Drawer 60 cm",
    componentKey: "base-module-4",
    widthMm: 600,
    isLocked: true,
    blendeCode: "UPK20",
    blendeLabel: "UPK20 20 cm",
    catalogBlendeQuantity: 1,
    catalogBlende: {
      code: "UPK20",
      name: "Filler Panel up to 20 cm",
      nameDe: "Passblende bis 20 cm",
    },
  };
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [cabinet] },
    kitchenConfig: { components: [cabinet] },
    kitchenSlug: "ab-110401",
  });
  const blende = selection.selectableComponents.find(
    (entry) => entry.componentId === "component-claim-blende-base-module-4",
  );

  assert.ok(selection.selectableComponentIds.includes("component-base-module-4"));
  assert.ok(blende);
  assert.equal(blende.articleCode, "UPK20");
  assert.equal(blende.isCompanionOption, undefined);

  const split = buildServiceClaimBlendeHotspots(
    PLAN_HOTSPOTS_BY_SLUG["ab-110401"],
    [blende],
    [cabinet],
    "ab-110401",
  );
  const cabinetFaces = split.filter((entry) => entry.componentKey === "base-module-4");
  const blendeFaces = split.filter(
    (entry) => entry.componentId === "component-claim-blende-base-module-4",
  );

  assert.equal(cabinetFaces.length, 2);
  assert.equal(blendeFaces.length, 1);
  assert.deepEqual(blendeFaces[0].points, [
    [80.622328, 59.845378],
    [83.102138, 60.34958],
    [83.102138, 90.016807],
    [80.622328, 89.512605],
  ]);
});

test("AB 110401 separates the left US45 from its UPK20 Blende in ASC", () => {
  const cabinet = {
    id: "ab-110401-us45",
    itemType: "COMPONENT",
    code: "CAB-BASE-AB110401-DEFAULT-UPK20-1",
    articleNumber: "US45",
    name: "Lower Cabinet with Drawer 45 cm",
    componentKey: "base-module-1",
    widthMm: 450,
    isLocked: true,
    blendeCode: "UPK20",
    blendeLabel: "UPK20 20 cm",
    catalogBlendeQuantity: 1,
    catalogBlende: {
      code: "UPK20",
      name: "Filler Panel up to 20 cm",
      nameDe: "Passblende bis 20 cm",
    },
  };
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [cabinet] },
    kitchenConfig: { components: [cabinet] },
    kitchenSlug: "ab-110401",
  });
  const blende = selection.selectableComponents.find(
    (entry) => entry.componentId === "component-claim-blende-base-module-1",
  );

  assert.ok(selection.selectableComponentIds.includes("component-base-module-1"));
  assert.ok(blende);
  assert.equal(blende.articleCode, "UPK20");
  assert.equal(blende.isCompanionOption, undefined);

  const split = buildServiceClaimBlendeHotspots(
    PLAN_HOTSPOTS_BY_SLUG["ab-110401"],
    [blende],
    [cabinet],
    "ab-110401",
  );
  const cabinetFaces = split.filter((entry) => entry.componentKey === "base-module-1");
  const blendeFaces = split.filter(
    (entry) => entry.componentId === "component-claim-blende-base-module-1",
  );

  assert.equal(cabinetFaces.length, 2);
  assert.equal(blendeFaces.length, 1);
  assert.deepEqual(blendeFaces[0].points, [
    [14.508314, 63.193277],
    [14.950119, 63.132773],
    [14.950119, 92.779832],
    [14.508314, 92.840336],
  ]);
});

test("AB 110401 separates the UE115 inside-corner filler from its 60 cm cabinet in ASC", () => {
  const cabinet = {
    id: "ab-110401-ue115",
    itemType: "COMPONENT",
    code: "CAB-BASE-AB110401-DEFAULT-3",
    articleNumber: "UE115",
    name: "Lower Cabinet 60 cm",
    componentKey: "base-module-3",
    widthMm: 1150,
    isLocked: true,
  };
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [cabinet] },
    kitchenConfig: { components: [cabinet] },
    kitchenSlug: "ab-110401",
  });
  const blende = selection.selectableComponents.find(
    (entry) => entry.componentId === "component-claim-blende-base-module-3",
  );

  assert.ok(selection.selectableComponentIds.includes("component-base-module-3"));
  assert.ok(blende);
  assert.equal(blende.articleCode, "UPEF65");
  assert.equal(blende.name, "Corner filler panel for Lower cabinet");
  assert.equal(blende.isCompanionOption, undefined);

  const split = buildServiceClaimBlendeHotspots(
    PLAN_HOTSPOTS_BY_SLUG["ab-110401"],
    [blende],
    [cabinet],
    "ab-110401",
  );
  const cabinetFaces = split.filter((entry) => entry.componentKey === "base-module-3");
  const blendeFaces = split.filter(
    (entry) => entry.componentId === "component-claim-blende-base-module-3",
  );

  assert.equal(cabinetFaces.length, 1);
  assert.equal(blendeFaces.length, 2);
  assert.deepEqual(blendeFaces.map((entry) => entry.points), [
    [[61.92399, 56.336134], [62.850356, 56.194958], [62.850356, 85.842017], [61.92399, 85.983193]],
    [[62.850356, 56.194958], [63.619952, 56.356303], [63.619952, 86.003361], [62.850356, 85.842017]],
  ]);
});

test("AB 110401 uses SPB90, US45, UE115, and US60 for its default base cabinets", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const claims = readFileSync(new URL("../lib/service-claim-kitchen-hotspots.js", import.meta.url), "utf8");
  const items = seed.match(/const AB_110401_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.equal(isLShapedClaimKitchen("ab-110401"), true);
  assert.match(seed, /slug: "ab-110401"[\s\S]*?kitchenCode: "110 401"[\s\S]*?items: AB_110401_ITEMS/);
  assert.match(items, /defaultOvenHob/);
  assert.match(items, /defaultWorktop/);
  assert.match(items, /defaultSinkBase\(\{ code: "SINK-BASE-AB110401-DEFAULT"[^\n]+widthMm: 900[^\n]+articleNumber: "SPB90"/);
  assert.match(items, /CAB-BASE-AB110401-DEFAULT-UPK20-1[^\n]+componentKey: "base-module-1"[^\n]+articleNumber: "US45"[^\n]+blendeCode: "UPK20"/);
  assert.match(items, /CAB-BASE-AB110401-DEFAULT-3[^\n]+name: "Lower Cabinet 60 cm"[^\n]+nameDe: "Unterschrank 60 cm"[^\n]+widthMm: 1150[^\n]+componentKey: "base-module-3"[^\n]+articleNumber: "UE115"[^\n]+preserveName: true/);
  assert.match(items, /CAB-BASE-AB110401-DEFAULT-UPK20-2[^\n]+componentKey: "base-module-4"[^\n]+articleNumber: "US60"[^\n]+blendeCode: "UPK20"/);
  assert.doesNotMatch(items, /CAB-BASE-AB110401-DEFAULT-2/);
  assert.equal((items.match(/isLocked: true/g) || []).length, 3);
  assert.match(seed, /articleNumber: "SPB90"[^\n]+name: "Sink Base Cabinet 90 cm"/);
  assert.match(seed, /articleNumber: "UE115"[^\n]+name: "Lower Cabinet 60 cm"/);
  assert.match(items, /CAB-WALL-AB110401-H4502-2[^\n]+price: articlePrice\("H9002"\)[^\n]+widthMm: 900[^\n]+componentKey: "wall-cabinet-2"[^\n]+articleNumber: "H9002"/);
  assert.doesNotMatch(items, /CAB-WALL-AB110401-H4502-3/);
  assert.match(claims, /L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[\s\S]*?"ab-110401"/);
  assert.match(claims, /COOKTOP_SOURCE_POINTS_BY_SLUG[\s\S]*?"ab-110401"/);
  assert.match(claims, /"ab-110401": \{\s*indexPartKeys: \["worktop-left", "worktop-right", "worktop-left", "worktop-right"\]/);
});

test("AB 110401 gets the UE115 display name from its database catalog article", () => {
  const serialized = serializeKitchenForLegacy({
    id: "ab-110401",
    slug: "ab-110401",
    name: "110 401",
    claimParts: [],
    items: [{
      id: "ab-110401-ue115",
      itemType: "COMPONENT",
      code: "CAB-BASE-AB110401-DEFAULT-3",
      articleNumber: "UE115",
      name: "Lower Cabinet 60 cm",
      nameDe: "Unterschrank 60 cm",
      price: 0,
      isLocked: true,
      catalogArticleId: "catalog-ue115",
      catalogArticle: {
        articleNumber: "UE115",
        name: "Database UE115 name",
        nameDe: "Datenbankname UE115",
        price: 0,
      },
    }],
  });

  assert.equal(serialized.components[0].articleNumber, "UE115");
  assert.equal(serialized.components[0].name, "Database UE115 name");
  assert.equal(serialized.components[0].nameDe, "Datenbankname UE115");
  assert.equal(serialized.components[0].price, 0);
});

test("AB 110401 UE115 name migration preserves dashboard-managed prices", () => {
  const migration = readFileSync(
    new URL("../prisma/migrations/20260914140000_correct_ab110401_ue115_display_name/migration.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /kitchen\."slug" = 'ab-110401'/);
  assert.match(migration, /item\."articleNumber" = 'UE115'/);
  assert.match(migration, /"name" = 'Lower Cabinet 60 cm'/);
  assert.match(migration, /"nameDe" = 'Unterschrank 60 cm'/);
  assert.doesNotMatch(migration, /"price"\s*=/);
});

test("AB 110401 keeps UE115 claim-only without deleting a dashboard-created program price", () => {
  const publishMigration = readFileSync(
    new URL("../prisma/migrations/20260914160000_publish_ue115_in_ip2200_catalog/migration.sql", import.meta.url),
    "utf8",
  );
  const claimOnlyMigration = readFileSync(
    new URL("../prisma/migrations/20260914170000_keep_ue115_claim_only/migration.sql", import.meta.url),
    "utf8",
  );

  assert.match(publishMigration, /UPDATE "CatalogArticle"[\s\S]*?"articleNumber" = 'UE115'/);
  assert.match(publishMigration, /"name" = 'Lower Cabinet 60 cm'/);
  assert.match(claimOnlyMigration, /DELETE FROM "CatalogArticleProgramPrice"/);
  assert.match(claimOnlyMigration, /"id" = 'catalog-article-program-price-ip2200-ue115'/);
  assert.match(claimOnlyMigration, /"articleNumber" = 'UE115'/);
  assert.doesNotMatch(claimOnlyMigration, /DELETE FROM "CatalogArticle"/);
  assert.doesNotMatch(claimOnlyMigration, /UPDATE "CatalogArticleProgramPrice"/);
});

test("AB 110401 registers UE115 as a claim product linked to its existing cabinet hotspot", () => {
  const migration = readFileSync(
    new URL("../prisma/migrations/20260914180000_add_ab110401_ue115_claim_product/migration.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /INSERT INTO "KitchenClaimPart"/);
  assert.match(migration, /'cabinet-base-module-3'/);
  assert.match(migration, /'UE115'/);
  assert.match(migration, /'CAB-BASE-AB110401-DEFAULT-3'/);
  assert.match(migration, /'base-module-3'/);
  assert.doesNotMatch(migration, /CatalogArticleProgramPrice/);
});

test("AB 110401 claim-product metadata reuses the UE115 cabinet selection instead of duplicating it", () => {
  const cabinet = {
    id: "ab-110401-ue115",
    itemType: "COMPONENT",
    code: "CAB-BASE-AB110401-DEFAULT-3",
    articleNumber: "UE115",
    name: "Lower Cabinet 60 cm",
    componentKey: "base-module-3",
    isLocked: true,
  };
  const selection = buildServiceClaimSelectableComponents({
    kitchen: { items: [cabinet] },
    kitchenConfig: { components: [cabinet] },
    kitchenSlug: "ab-110401",
    claimParts: [{
      partKey: "cabinet-base-module-3",
      articleCode: "UE115",
      name: "Lower Cabinet 60 cm",
      nameDe: "Unterschrank 60 cm",
      sourceKitchenItemCode: cabinet.code,
      sourceComponentKey: cabinet.componentKey,
      isActive: true,
    }],
  });
  const ue115Rows = selection.selectableComponents.filter(
    (entry) => entry.componentId === "component-base-module-3",
  );

  assert.equal(ue115Rows.length, 1);
  assert.equal(ue115Rows[0].articleCode, "UE115");
  assert.equal(ue115Rows[0].claimPartKey, "cabinet-base-module-3");
});

test("AB 110401 claims keep sink, faucet, cooktop, oven, drawer and both worktop legs separate", () => {
  const source = PLAN_HOTSPOTS_BY_SLUG["ab-110401"].map((hotspot) => {
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
    { partKey: "sink-cabinet", articleCode: "SPB90", sourceComponentKey: "sink-base" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", sourceComponentKey: "oven-module" },
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ], "ab-110401");

  assert.equal(result.filter((entry) => entry.claimPartKey === "sink").length, 1);
  const sinkCabinetFaces = result.filter((entry) => entry.claimPartKey === "sink-cabinet");
  assert.equal(sinkCabinetFaces.length, 2);
  assert.deepEqual(
    sinkCabinetFaces.map((entry) => entry.componentId),
    ["component-claim-sink-cabinet", "component-claim-sink-cabinet"],
  );
  assert.equal(result.filter((entry) => entry.claimPartKey === "faucet").length, 3);
  assert.equal(result.filter((entry) => entry.claimPartKey === "cooktop").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "oven").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "oven-drawer").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "worktop-left").length, 2);
  assert.equal(result.filter((entry) => entry.claimPartKey === "worktop-right").length, 2);
  assert.ok(result.every((entry) => !String(entry.clipPath || "").includes("NaN")));
});
