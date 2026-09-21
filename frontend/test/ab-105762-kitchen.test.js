import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getLinkedComponentIds,
  getLocalizedItemName,
} from "../components/kitchen-selection-utils.js";
import {
  AB_105762_LAYOUT_ALIAS_SLUGS,
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG,
} from "../lib/kitchen-plan-preview-data.js";
import {
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "../lib/service-claim-kitchen-hotspots.js";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { applyArticleVariantSelectionForDisplay } from "../lib/auszug-variants.js";

const translate = (_key, fallback) => fallback;
const aliasSlugs = ["ab-105766", "ab-105770", "ab-105774"];

test("AB 105762 uses the new sharp vector plan and exact geometry", () => {
  const svg = readFileSync(new URL("../public/plans/AB 105762-63.svg", import.meta.url), "utf8");
  const stage = readFileSync(new URL("../components/kitchen-svg-stage.jsx", import.meta.url), "utf8");
  assert.match(svg, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.match(svg, /stroke="#00ffff" d="M6033 2035V3611L4970 3765V2189"/);
  assert.match(svg, /stroke="#00ffff" d="M4917 2197V3855L6087 3685V2027"/);
  assert.match(stage, /"ab-105762": "\/plans\/AB%20105762-63\.svg\?v=4"/);
  assert.match(stage, /IMAGE_HOTSPOTS_BY_SLUG\["ab-105762"\] = PLAN_HOTSPOTS_BY_SLUG\["ab-105762"\]/);

  assert.equal(PLAN_IMAGE_BY_SLUG["ab-105762"], "/plans/AB%20105762-63.svg?v=4");

  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105762"];
  const keys = hotspots.map(({ componentKey }) => componentKey);
  for (const key of [
    "refrigerator",
    "wall-cabinet-1",
    "wall-cabinet-2",
    "extractor-hood",
    "wall-cabinet-3",
    "wall-cabinet-4",
    "worktop",
    "sink-faucet",
    "base-module-1",
    "oven-module",
    "base-module-2",
    "sink-base",
    "dishwasher-base",
    "drawer-module",
  ]) {
    assert.ok(keys.includes(key), `${key} should have a PDF-matched hotspot`);
  }
  assert.ok(hotspots.every(({ points }) => Array.isArray(points) && points.length >= 4));
  const worktopHotspots = hotspots.filter(({ componentKey }) => componentKey === "worktop");
  assert.equal(worktopHotspots.length, 6);
  assert.deepEqual(
    worktopHotspots.at(-1)?.points,
    [[28.489311,62.164706],[28.774347,62.12437],[28.774347,91.186555],[28.489311,91.226891]],
    "the left vertical return should remain selected with the locked worktop",
  );
  assert.deepEqual(
    hotspots
      .filter(({ componentKey }) => componentKey === "sink-faucet")
      .map(({ claimFixturePartKey }) => claimFixturePartKey),
    ["sink", "faucet", "faucet", "faucet", "faucet"],
  );
  assert.deepEqual(
    hotspots
      .filter(({ componentKey, claimFixturePartKey }) =>
        componentKey === "sink-faucet" && claimFixturePartKey === "faucet"
      )
      .map(({ points }) => points),
    [
      [[65.244656,47.018487],[66.099762,47.018487],[66.099762,50.568067],[65.244656,50.568067]],
      [[65.914489,47.159664],[68.465558,47.159664],[68.465558,48.894118],[65.914489,48.894118]],
      [[68.437055,47.92605],[68.945368,48.087395],[69.434679,48.954622],[69.805226,50.245378],[69.805226,53.068908],[69.434679,53.068908],[69.434679,50.568067],[69.078385,49.297479],[68.693587,48.591597],[68.437055,48.853782]],
      [[68.992874,52.927731],[70.118765,52.927731],[70.118765,57.082353],[68.992874,57.082353]],
    ],
    "the faucet selection should cover its control, neck, curved spout, and stem",
  );
  assert.deepEqual(
    hotspots
      .filter(({ componentKey }) => componentKey === "oven-module")
      .map(({ claimApplianceSurface }) => claimApplianceSurface),
    ["oven", "cooktop"],
  );
  assert.deepEqual(
    hotspots
      .filter(({ componentKey }) => componentKey === "extractor-hood")
      .map(({ points }) => points),
    [
      [[32.052257,42.884034],[42.88361,41.331092],[42.88361,42.984874],[32.052257,44.537815]],
      [[28.446556,43.408403],[32.052257,42.884034],[32.052257,44.537815],[28.489311,43.811765]],
      [[33.91924,45.223529],[36.014252,45.223529],[36.014252,48.208403],[33.91924,48.208403]],
      [[39.406176,44.416807],[41.5,44.416807],[41.5,47.421849],[39.406176,47.421849]],
    ],
    "the hood front, exposed side, and both LED symbols should select together",
  );
  const cornerBlende = [[55.852732,58.211765],[57.52019,58.231933],[57.52019,87.294118],[55.852732,87.27395]];
  assert.ok(
    hotspots.some(({ componentKey, points }) =>
      componentKey === "base-module-2" && JSON.stringify(points) === JSON.stringify(cornerBlende)
    ),
    "the corner Blende should select with the US50 cabinet on its left",
  );
  assert.ok(
    !hotspots.some(({ componentKey, points }) =>
      componentKey === "sink-base" && JSON.stringify(points) === JSON.stringify(cornerBlende)
    ),
    "the locked sink base must not tint the corner Blende by default",
  );
});

test("AB 105762 keeps dishwasher technical linework light", () => {
  assert.deepEqual(
    PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105762"].map(({ key, componentKey }) => [key, componentKey]),
    [
      ["dishwasher-basket", "dishwasher-base"],
      ["dishwasher-gs-mark", "dishwasher-base"],
    ],
  );
});

test("AB 105762 ASC stops the oven selection at the UHK drawer seam", () => {
  const source = PLAN_HOTSPOTS_BY_SLUG["ab-105762"]
    .filter(({ componentKey, claimApplianceSurface }) => (
      componentKey === "oven-module" && claimApplianceSurface === "oven"
    ))
    .map((hotspot) => {
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
  const claims = buildServiceClaimPartHotspots(source, [
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
  ], "ab-105762");
  const oven = claims.find(({ claimPartKey }) => claimPartKey === "oven");
  const drawer = claims.find(({ claimPartKey }) => claimPartKey === "oven-drawer");

  assert.ok(Math.abs(oven.top + oven.height - 80.295798) < 0.000001);
  assert.ok(Math.abs(drawer.top - 78.722689) < 0.000001);
  assert.ok(Math.abs(drawer.top + drawer.height - 90.137815) < 0.000001);
  assert.ok(oven.top + oven.height < drawer.top + drawer.height);
});

test("AB 105762 ASC splits both worktops on one straight PDF seam", () => {
  const source = PLAN_HOTSPOTS_BY_SLUG["ab-105762"]
    .filter(({ componentKey }) => componentKey === "worktop")
    .map((hotspot) => {
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
  const claims = buildServiceClaimPartHotspots(source, [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ], "ab-105762");
  const rightWedge = claims.find(({ claimPartKey, left }) => (
    claimPartKey === "worktop-right" && Math.abs(left - 47.672209) < 0.000001
  ));
  const toDisplayPoints = (hotspot) => String(hotspot.clipPath)
    .match(/^polygon\((.*)\)$/)?.[1]
    .split(", ")
    .map((point) => point.split(" ").map((value) => Number.parseFloat(value)))
    .map(([x, y]) => [
      hotspot.left + (x / 100) * hotspot.width,
      hotspot.top + (y / 100) * hotspot.height,
    ]);

  assert.ok(rightWedge, "the right worktop should own the corner wedge");
  const points = toDisplayPoints(rightWedge);
  assert.ok(Math.abs(points[0][0] - 47.672209) < 0.000001);
  assert.ok(Math.abs(points[0][1] - 54.884034) < 0.000001);
  assert.ok(Math.abs(points[2][0] - 56.764846) < 0.000001);
  assert.ok(Math.abs(points[2][1] - 56.739496) < 0.000001);
  assert.equal(claims.filter(({ claimPartKey }) => claimPartKey === "worktop-left").length, 3);
  assert.equal(claims.filter(({ claimPartKey }) => claimPartKey === "worktop-right").length, 4);
});

test("AB 105762 keeps the required UPEF65 on stale and current US50 client data", () => {
  const staleItem = {
    code: "CAB-BASE-AB105762-US50",
    articleNumber: "US50",
    price: 198,
  };
  assert.deepEqual(
    applyArticleVariantSelectionForDisplay(staleItem, ""),
    {
      ...staleItem,
      price: 266,
      blendeCode: "UPEF65",
      blendeLabel: "UPEF65 Corner filler panel",
      blendeName: "Corner filler panel for Lower cabinet",
      blendeNameDe: "Eckpassblende Unterschrank",
      blendePrice: 68,
      catalogBlendeQuantity: 1,
    },
  );

  const currentItem = { ...staleItem, price: 266, blendeCode: "UPEF65", blendePrice: 68 };
  assert.strictEqual(applyArticleVariantSelectionForDisplay(currentItem, ""), currentItem);
});

test("AB 105762 schedule rows are complete and catalog linked", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  const block = seed.match(/const AB_105762_ITEMS = \[([\s\S]*?)\n\];/)?.[1] || "";

  assert.match(seed, /slug: "ab-105762"[\s\S]*?kitchenCode: "105 762"[\s\S]*?items: AB_105762_ITEMS/);

  for (const article of [
    "A-EH923640E + 9EC744100C",
    "PLR60-1 + PLR60-2",
    "SP60",
    "526335 + 517720",
    "OL-KGCN388140E",
    "US40",
    "US50",
    "A-EGSPV597210 + TGV60",
    "US30",
    "UPK20",
    "H4002",
    "FH664621E + FWK124",
    "H5002",
    "H6002",
    "HPK2002",
  ]) {
    assert.ok(block.includes(`"${article}"`), `${article} should be represented in the schedule`);
  }
  assert.match(block, /CAB-BASE-AB105762-US30-UPK20[^\n]+catalogArticleNumber: "US30"[^\n]+blendeCode: "UPK20"[^\n]+blendePrice: "0\.00"/);
  assert.match(block, /CAB-BASE-AB105762-US50[^\n]+articlePriceWithBlende\("US50", "UPEF65", 1\)[^\n]+blendeCode: "UPEF65"[^\n]+blendePrice: blendePrice\("UPEF65", 1\)/);
  assert.match(block, /CAB-WALL-AB105762-H6002-HPK2002[^\n]+catalogArticleNumber: "H6002"[^\n]+blendeCode: "HPK2002"[^\n]+blendePrice: "0\.00"/);
  assert.match(block, /CAB-HOOD-AB105762-600[^\n]+articleNumber: "FH664621E \+ FWK124"[^\n]+catalogArticleNumber: "FH664621E \+ FWK124 \+ HD6002"/);
  assert.match(block, /\.\.\.defaultAccessories\(\)/);
  assert.match(block, /\.\.\.defaultServices\(\)/);
});

test("AB 105762 maps callouts 5-13 and links the hood package", () => {
  const expected = {
    "REF-AB105762-KGCN388140E": "5",
    "CAB-BASE-AB105762-US40": "6",
    "CAB-BASE-AB105762-US50": "7",
    "DISH-AB105762-600": "8",
    "CAB-BASE-AB105762-US30-UPK20": "9",
    "CAB-WALL-AB105762-H4002": "10",
    "CAB-HOOD-AB105762-600": "11",
    "HOOD-AB105762-FH664621E": "11",
    "CAB-WALL-AB105762-H5002": "12",
    "CAB-WALL-AB105762-H6002-HPK2002": "13",
  };
  for (const [code, number] of Object.entries(expected)) {
    const label = getLocalizedItemName({ code, name: "Kitchen item" }, translate, "en", true);
    assert.ok(label.startsWith(`${number}. `), `${code} should use callout ${number}`);
  }
  assert.deepEqual(
    getLinkedComponentIds("ab-105762", "component-wall-cabinet-2"),
    ["component-wall-cabinet-2", "component-extractor-hood"],
  );
  assert.equal(isLShapedClaimKitchen("ab-105762"), true);
});

test("AB 105762 uses the standard 670 and 111 contract prefixes", () => {
  assert.equal("670105762", "670105762");
  assert.equal("111105762", "111105762");
});

test("AB 105762 loads its SVG for server-rendered previews", async () => {
  const source = await loadKitchenSvgMarkup("ab-105762");
  assert.match(source, /viewBox="0 0 842 595"/);
});

test("AB 105766, 105770 and 105774 reuse every AB 105762 plan surface", async () => {
  assert.deepEqual(AB_105762_LAYOUT_ALIAS_SLUGS, aliasSlugs);
  const sourceSvg = await loadKitchenSvgMarkup("ab-105762");

  for (const slug of aliasSlugs) {
    assert.equal(PLAN_IMAGE_BY_SLUG[slug], PLAN_IMAGE_BY_SLUG["ab-105762"]);
    assert.strictEqual(PLAN_HOTSPOTS_BY_SLUG[slug], PLAN_HOTSPOTS_BY_SLUG["ab-105762"]);
    assert.strictEqual(
      PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug],
      PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105762"],
    );
    assert.equal(await loadKitchenSvgMarkup(slug), sourceSvg);
    assert.deepEqual(
      getLinkedComponentIds(slug, "component-wall-cabinet-2"),
      ["component-wall-cabinet-2", "component-extractor-hood"],
    );
    assert.equal(isLShapedClaimKitchen(slug), true);
  }
});

test("AB 105762 aliases retain the exact sink, oven and split-worktop ASC geometry", () => {
  const claimParts = [
    { partKey: "sink", sourceComponentKey: "sink-faucet" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", sourceComponentKey: "oven-module" },
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ];
  const sourceClaims = buildServiceClaimPartHotspots(
    PLAN_HOTSPOTS_BY_SLUG["ab-105762"],
    claimParts,
    "ab-105762",
  );

  for (const slug of aliasSlugs) {
    assert.deepEqual(
      buildServiceClaimPartHotspots(PLAN_HOTSPOTS_BY_SLUG[slug], claimParts, slug),
      sourceClaims,
    );
  }
});

test("AB 105762 aliases seed as independent kitchens with identical catalog-linked items", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");

  assert.match(seed, /const AB_105762_LAYOUT_ALIAS_CODES = \["105766", "105770", "105774"\]/);
  assert.match(seed, /slug: `ab-\$\{code\}`[\s\S]*?items: AB_105762_ITEMS[\s\S]*?reconcileExisting: true/);
  assert.match(seed, /\.flatMap\(\(kitchen\) => \[[\s\S]*?buildKitchenContractNumber\(kitchen, "670"\)[\s\S]*?buildKitchenContractNumber\(kitchen, "111"\)/);
});
