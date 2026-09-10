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
import { getCabinetWidthDisplayName } from "../lib/cabinet-name-utils.js";

const translate = (_key, fallback) => fallback;

test("AB 109874 uses its exact vector plan and polygon-only selection geometry", () => {
  const svg = readFileSync(new URL("../public/plans/AB 109874.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-109874"];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG["ab-109874"], "/plans/AB%20109874.svg");
  assert.deepEqual(PLAN_IMAGE_SOURCE_SIZE_BY_SLUG["ab-109874"], { width: 842, height: 595 });
  assert.ok(hotspots.length >= 35);
  assert.ok(hotspots.every((hotspot) => hotspot.preserveManualSize === true));
  assert.ok(hotspots.every((hotspot) => Array.isArray(hotspot.points) && hotspot.points.length >= 4));
  assert.equal(new Set(keys.filter((key) => key.startsWith("wall-cabinet-"))).size, 5);
  assert.equal(keys.filter((key) => key === "worktop").length, 4);
  assert.equal(keys.filter((key) => key === "refrigerator").length, 3);
  assert.equal(keys.filter((key) => key === "sink-faucet").length, 3);
  assert.equal(keys.filter((key) => key === "under-cabinet-light").length, 2);
  assert.equal(keys.filter((key) => key === "base-module-3").length, 4);
  for (const key of ["oven-module", "sink-base", "dishwasher-base", "extractor-hood"]) {
    assert.ok(keys.includes(key), `${key} should have an exact selectable polygon`);
  }
});

test("AB 109874 faucet tint follows the complete PDF spout instead of crossing its arc", () => {
  const faucet = PLAN_HOTSPOTS_BY_SLUG["ab-109874"]
    .filter((hotspot) => hotspot.componentKey === "sink-faucet");
  const spout = faucet[1];

  assert.equal(faucet.length, 3);
  assert.equal(spout.points.length, 36);
  assert.deepEqual(spout.points[0], [47.786223, 45.94958]);
  assert.ok(spout.points.some(([x, y]) => x === 51.263658 && y === 47.92605));
  assert.ok(spout.points.some(([x, y]) => x === 50.821853 && y === 48.188235));
  assert.deepEqual(spout.points.at(-1), [47.84323, 46.816807]);
});

test("AB 109874 maps every schedule callout from 3 through 14", () => {
  const expectedByCode = {
    "SINK-BASE-AB109874-DEFAULT": "3",
    "CAB-BASE-AB109874-DEFAULT-UPK20": "4",
    "CAB-BASE-AB109874-DEFAULT-2": "5",
    "CAB-BASE-AB109874-US60-UPEF65": "6",
    "DISH-AB109874-600": "7",
    "CAB-BASE-AB109874-DEFAULT-3": "8",
    "REF-AB109874-KGCN388140E": "9",
    "CAB-WALL-AB109874-H4002-HPK2002": "10",
    "CAB-WALL-AB109874-H6002-1": "11",
    "CAB-WALL-AB109874-H6002-2": "12",
    "CAB-HOOD-AB109874-600": "13",
    "HOOD-AB109874-FH664621E": "13",
    "CAB-WALL-AB109874-H6002-3": "14",
  };

  for (const [code, expected] of Object.entries(expectedByCode)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${expected}. `), `${code} should use callout ${expected}`);
  }
});

test("AB 109874 preserves dishwasher details and links its hood package", () => {
  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-109874"];
  assert.deepEqual(details.map((detail) => detail.key), ["dishwasher-basket", "dishwasher-gs-mark"]);
  assert.ok(details.every((detail) => detail.componentKey === "dishwasher-base"));
  assert.ok(details.every((detail) => detail.persistWhenSelected === true));
  assert.deepEqual(
    getLinkedComponentIds("ab-109874", "component-wall-cabinet-4"),
    ["component-wall-cabinet-4", "component-extractor-hood", "component-under-cabinet-light"],
  );
  assert.deepEqual(
    getAutoLinkedAccessoryCodes("ab-109874", ["component-extractor-hood"]),
    ["ACC-LIGHT-003"],
  );
});

test("AB 109874 is seeded as an L-shaped kitchen with six locked schedule defaults", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const claims = readFileSync(new URL("../lib/service-claim-kitchen-hotspots.js", import.meta.url), "utf8");
  const items = seed.match(/const AB_109874_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.equal(isLShapedClaimKitchen("ab-109874"), true);
  assert.match(seed, /slug: "ab-109874"[\s\S]*?kitchenCode: "109 874"[\s\S]*?items: AB_109874_ITEMS/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "670"\)/);
  assert.match(items, /defaultOvenHob/);
  assert.match(items, /defaultWorktop/);
  assert.match(items, /defaultSinkBase\(\{ code: "SINK-BASE-AB109874-DEFAULT"[^\n]+widthMm: 1250[^\n]+articleNumber: "SPEB125"/);
  assert.match(items, /code: "CAB-BASE-AB109874-DEFAULT-UPK20"[^\n]+name: "Lower Cabinet 50 cm"[^\n]+widthMm: 500[^\n]+componentKey: "base-module-1"[^\n]+articleNumber: "U50"/);
  assert.match(items, /code: "CAB-BASE-AB109874-DEFAULT-2"[^\n]+name: "Lower Cabinet 60 cm"[^\n]+widthMm: 600[^\n]+componentKey: "base-module-2"[^\n]+articleNumber: "U60"/);
  assert.equal(
    getCabinetWidthDisplayName({ code: "CAB-BASE-AB109874-DEFAULT-UPK20", articleNumber: "U50", widthMm: 500 }),
    "Lower Cabinet 50 cm",
  );
  assert.equal(
    getCabinetWidthDisplayName({ code: "CAB-BASE-AB109874-DEFAULT-2", articleNumber: "U60", widthMm: 600 }),
    "Lower Cabinet 60 cm",
  );
  assert.equal((items.match(/isLocked: true/g) || []).length, 3);
  assert.match(claims, /L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[\s\S]*?"ab-109874"/);
  assert.match(claims, /COOKTOP_SOURCE_POINTS_BY_SLUG[\s\S]*?"ab-109874"/);
  assert.match(claims, /"ab-109874": splitWorktopDefinition\([\s\S]*?\[31\.795724466, 52\.645378151\]/);
});

test("AB 109874 claims keep sink, faucet, cooktop, oven, drawer, and both worktop legs separate", () => {
  const source = PLAN_HOTSPOTS_BY_SLUG["ab-109874"].map((hotspot) => {
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
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", sourceComponentKey: "oven-module" },
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ], "ab-109874");

  assert.equal(result.filter((entry) => entry.claimPartKey === "sink").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "faucet").length, 3);
  assert.equal(result.filter((entry) => entry.claimPartKey === "cooktop").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "oven").length, 1);
  assert.equal(result.filter((entry) => entry.claimPartKey === "oven-drawer").length, 1);
  const leftWorktop = result.filter((entry) => entry.claimPartKey === "worktop-left");
  const rightWorktop = result.filter((entry) => entry.claimPartKey === "worktop-right");
  const rightCornerWedge = rightWorktop.find((entry) => entry.width < 10 && entry.top < 53);

  assert.equal(leftWorktop.length, 2);
  assert.equal(rightWorktop.length, 3);
  assert.ok(rightCornerWedge, "the return beyond the depth seam should belong to the right worktop");
  assert.ok(Math.abs(rightCornerWedge.left - 31.795724466) < 0.000001);
  assert.ok(Math.abs((rightCornerWedge.left + rightCornerWedge.width) - 40.346793) < 0.000001);
  assert.ok(result.every((entry) => !String(entry.clipPath || "").includes("NaN")));
});
