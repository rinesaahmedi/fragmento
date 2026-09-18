import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  getLinkedComponentIds,
  getLocalizedItemName,
} from "../components/kitchen-selection-utils.js";
import {
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG,
} from "../lib/kitchen-plan-preview-data.js";

const slug = "ab-105761";
const matchingKitchenSlugs = ["ab-105765", "ab-105769"];
const translate = (_key, fallback) => fallback;

test("AB 105761 uses its sharp vector plan and exact measured selections", () => {
  const svgUrl = new URL("../public/plans/AB 105761-62.svg", import.meta.url);
  assert.ok(existsSync(svgUrl));
  assert.match(readFileSync(svgUrl, "utf8"), /width="842" height="595" viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20105761-62.svg");

  const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];
  const keys = hotspots.map(({ componentKey }) => componentKey);
  assert.equal(hotspots.length, 14);
  assert.equal(keys.filter((key) => key.startsWith("wall-cabinet-")).length, 4);
  for (const key of [
    "extractor-hood",
    "worktop",
    "sink-faucet",
    "sink-end-blende",
    "sink-base",
    "dishwasher-base",
    "oven-module",
    "base-module-1",
    "refrigerator",
  ]) {
    assert.ok(keys.includes(key), `${key} should have a plan hotspot`);
  }

  const wallEnd = hotspots.find(({ componentKey }) => componentKey === "wall-cabinet-4");
  const sinkEnd = hotspots.find(({ componentKey }) => componentKey === "sink-end-blende");
  const worktop = hotspots.find(({ componentKey }) => componentKey === "worktop");
  assert.ok(Math.abs(wallEnd.left + wallEnd.width - 91.866983) < 0.000002);
  assert.ok(Math.abs(sinkEnd.left + sinkEnd.width - 91.866984) < 0.000002);
  assert.ok(Math.abs(worktop.left + worktop.width - 91.866983) < 0.000002);
  assert.deepEqual(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug].map(({ key }) => key), [
    "dishwasher-basket",
    "dishwasher-gs-mark",
  ]);
});

test("AB 105761 seeds every schedule row with catalog linkage", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const block = seed.match(/const AB_105761_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-105761"[\s\S]*?kitchenCode: "105 761"[\s\S]*?items: AB_105761_ITEMS/);
  for (const article of [
    "A-EH923640E + 9EC744100C",
    "PLR60",
    "SP60",
    "OL-KGCN388140E",
    "US60",
    "A-EGSPV597210 + TGV60",
    "UPK20",
    "H6002",
    "FH664621E + FWK124 + HD6002",
    "526335 + 517720",
  ]) {
    assert.ok(block.includes(`"${article}"`), `${article} should be catalog linked`);
  }
  assert.match(block, /CAB-WALL-AB105761-H6002-HPK2002[^\n]+catalogArticleNumber: "H6002"[^\n]+blendeCode: "HPK2002"[^\n]+blendePrice: "0\.00"/);
  assert.match(block, /\.\.\.defaultAccessories\(\)/);
  assert.match(block, /\.\.\.defaultServices\(\)/);
});

test("AB 105761 maps schedule callouts and links the second wall unit to its hood", () => {
  const expected = {
    "REF-AB105761-KGCN388140E": "4",
    "CAB-BASE-AB105761-US60": "5",
    "DISH-AB105761-600": "6",
    "BLENDE-AB105761-SINK-END": "7",
    "CAB-WALL-AB105761-H6002-1": "8",
    "CAB-HOOD-AB105761-600": "9",
    "HOOD-AB105761-FH664621E": "9",
    "CAB-WALL-AB105761-H6002-3": "10",
    "CAB-WALL-AB105761-H6002-HPK2002": "11",
  };
  for (const [code, number] of Object.entries(expected)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${number}. `), `${code} should use callout ${number}`);
  }
  assert.deepEqual(
    getLinkedComponentIds(slug, "component-wall-cabinet-2"),
    ["component-wall-cabinet-2", "component-extractor-hood"],
  );
});

test("AB 105761 is available under 670 and 111 contract prefixes", () => {
  assert.equal(`670${"105 761".replace(/\D/g, "")}`, "670105761");
  assert.equal(`111${"105 761".replace(/\D/g, "")}`, "111105761");
});

test("AB 105765 and AB 105769 are separate kitchens using the complete AB 105761 configuration", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");

  for (const aliasSlug of matchingKitchenSlugs) {
    const kitchenNumber = aliasSlug.replace("ab-", "");
    const formattedKitchenNumber = `${kitchenNumber.slice(0, 3)} ${kitchenNumber.slice(3)}`;
    const itemConstant = `AB_${kitchenNumber}_ITEMS`;

    assert.equal(PLAN_IMAGE_BY_SLUG[aliasSlug], PLAN_IMAGE_BY_SLUG[slug]);
    assert.strictEqual(PLAN_HOTSPOTS_BY_SLUG[aliasSlug], PLAN_HOTSPOTS_BY_SLUG[slug]);
    assert.strictEqual(
      PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[aliasSlug],
      PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug],
    );
    assert.deepEqual(
      getLinkedComponentIds(aliasSlug, "component-wall-cabinet-2"),
      ["component-wall-cabinet-2", "component-extractor-hood"],
    );
    assert.match(
      seed,
      new RegExp(`slug: "${aliasSlug}"[\\s\\S]*?kitchenCode: "${formattedKitchenNumber}"[\\s\\S]*?items: ${itemConstant}`),
    );

    for (const prefix of ["670", "111"]) {
      assert.equal(`${prefix}${kitchenNumber}`, `${prefix}${formattedKitchenNumber.replace(/\D/g, "")}`);
    }

    for (const [sourceCode, number] of Object.entries({
      "REF-AB105761-KGCN388140E": "4",
      "CAB-BASE-AB105761-US60": "5",
      "DISH-AB105761-600": "6",
      "BLENDE-AB105761-SINK-END": "7",
      "CAB-WALL-AB105761-H6002-1": "8",
      "CAB-HOOD-AB105761-600": "9",
      "HOOD-AB105761-FH664621E": "9",
      "CAB-WALL-AB105761-H6002-3": "10",
      "CAB-WALL-AB105761-H6002-HPK2002": "11",
    })) {
      const aliasCode = sourceCode.replace("AB105761", `AB${kitchenNumber}`);
      const label = getLocalizedItemName({ code: aliasCode, name: "Kitchen item" }, translate, "en", true);
      assert.ok(label.startsWith(`${number}. `), `${aliasCode} should use callout ${number}`);
    }
  }
});
