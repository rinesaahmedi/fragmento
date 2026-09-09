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
import { isLShapedClaimKitchen } from "../lib/service-claim-kitchen-hotspots.js";

const translate = (_key, fallback) => fallback;

test("AB 109873 uses its exact vector plan and complete selection geometry", () => {
  const svg = readFileSync(new URL("../public/plans/AB 109873.svg", import.meta.url), "utf8");
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-109873"];
  const keys = hotspots.map((hotspot) => hotspot.componentKey);

  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
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
    "SINK-BASE-AB109873-DEFAULT": "3",
    "CAB-BASE-AB109873-DEFAULT-1": "4",
    "DISH-AB109873-600": "5",
    "CAB-BASE-AB109873-DEFAULT-2": "6",
    "CAB-BASE-AB109873-DEFAULT-UPK20-R": "7",
    "CAB-WALL-AB109873-H6002-HPK2002-L": "8",
    "CAB-WALL-AB109873-H6002-2": "9",
    "CAB-WALL-AB109873-H6002-3": "10",
    "CAB-HOOD-AB109873-600": "11",
    "HOOD-AB109873-FH664621E": "11",
    "CAB-WALL-AB109873-H4502-1": "12",
    "CAB-WALL-AB109873-H4502-HPK2002-R": "13",
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

test("AB 109873 links the hood package and is seeded as a linear kitchen", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const items = seed.match(/const AB_109873_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.equal(isLShapedClaimKitchen("ab-109873"), false);
  assert.match(seed, /slug: "ab-109873"[\s\S]*?kitchenCode: "109 873"[\s\S]*?items: AB_109873_ITEMS/);
  assert.match(items, /defaultOvenHob/);
  assert.match(items, /defaultWorktop/);
  assert.match(items, /defaultSinkBase/);
  assert.equal((items.match(/isLocked: true/g) || []).length, 3);
  assert.deepEqual(
    getLinkedComponentIds("ab-109873", "component-wall-cabinet-4"),
    ["component-wall-cabinet-4", "component-extractor-hood", "component-under-cabinet-light"],
  );
  assert.deepEqual(
    getAutoLinkedAccessoryCodes("ab-109873", ["component-extractor-hood"]),
    ["ACC-LIGHT-003"],
  );
});
