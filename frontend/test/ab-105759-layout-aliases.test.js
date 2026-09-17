import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AB_105759_LAYOUT_ALIAS_SLUGS,
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG,
} from "../lib/kitchen-plan-preview-data.js";
import { getLinkedComponentIds } from "../components/kitchen-selection-utils.js";
import { buildServiceClaimPartHotspots } from "../lib/service-claim-kitchen-hotspots.js";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";

const expectedSlugs = ["ab-105763", "ab-105767", "ab-105771"];

test("105763, 105767 and 105771 reuse the complete 105759 plan configuration", () => {
  assert.deepEqual(AB_105759_LAYOUT_ALIAS_SLUGS, expectedSlugs);
  for (const slug of expectedSlugs) {
    assert.equal(PLAN_IMAGE_BY_SLUG[slug], PLAN_IMAGE_BY_SLUG["ab-105759"]);
    assert.strictEqual(PLAN_HOTSPOTS_BY_SLUG[slug], PLAN_HOTSPOTS_BY_SLUG["ab-105759"]);
    assert.strictEqual(
      PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug],
      PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105759"],
    );
    assert.deepEqual(
      getLinkedComponentIds(slug, "component-wall-cabinet-2"),
      ["component-wall-cabinet-2", "component-extractor-hood"],
    );
  }
});

test("105759 layout aliases load the exact 105759 SVG instead of the legacy fallback", async () => {
  const sourceMarkup = await loadKitchenSvgMarkup("ab-105759");

  for (const slug of expectedSlugs) {
    assert.equal(await loadKitchenSvgMarkup(slug), sourceMarkup);
  }
});

test("interactive configurator aliases use the 105759 image renderer and calibrated hotspots", () => {
  const stage = readFileSync(
    new URL("../components/kitchen-svg-stage.jsx", import.meta.url),
    "utf8",
  );

  assert.match(
    stage,
    /AB_105759_LAYOUT_ALIAS_SLUGS\.forEach\(\(slug\) => \{\s*IMAGE_VIEW_BY_SLUG\[slug\] = IMAGE_VIEW_BY_SLUG\["ab-105759"\]/,
  );
  assert.match(
    stage,
    /AB_105759_LAYOUT_ALIAS_SLUGS\.forEach\(\(slug\) => \{\s*IMAGE_HOTSPOTS_BY_SLUG\[slug\] = IMAGE_HOTSPOTS_BY_SLUG\["ab-105759"\]/,
  );
});

test("105759 layout aliases preserve the measured UHK drawer seam", () => {
  const oven = PLAN_HOTSPOTS_BY_SLUG["ab-105759"]
    .find((hotspot) => hotspot.componentKey === "oven-module");
  const claimParts = [
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
  ];
  const expectedRatio = (2040 - 1554) / (2160 - 1554);

  for (const slug of expectedSlugs) {
    const drawer = buildServiceClaimPartHotspots([oven], claimParts, slug)
      .find((hotspot) => hotspot.claimPartKey === "oven-drawer");
    assert.ok(drawer);
    assert.ok(Math.abs(drawer.top - (oven.top + oven.height * expectedRatio)) < 0.00001);
  }
});

test("105759 layout aliases seed both required contract prefixes with catalog-linked items", () => {
  const seed = readFileSync(new URL("../prisma/seed.js", import.meta.url), "utf8");
  for (const code of ["105763", "105767", "105771"]) {
    const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
    assert.match(
      seed,
      new RegExp(`slug: "ab-${code}"[\\s\\S]*?kitchenCode: "${formattedCode}"[\\s\\S]*?items: AB_105759_ITEMS`),
    );
  }
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "111"\)/);
  assert.match(seed, /contractNumber: buildKitchenContractNumber\(kitchen, "670"\)/);
});
