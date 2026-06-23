import assert from "node:assert/strict";
import test from "node:test";
import {
  applyVisibleComponentsToSvgMarkup,
  buildKitchenPreviewSvgMarkup,
  inferKitchenSlugFromSelectedAreas,
  resolveClaimPreviewComponentKeys,
} from "../lib/claim-kitchen-preview.js";

const SAMPLE_SVG = '<svg viewBox="0 0 900 600"></svg>';
const SAMPLE_KITCHEN_SVG = `
<svg viewBox="0 0 900 600">
  <g data-component-id="component-oven-base"><rect x="1" y="1" width="1" height="1"/></g>
  <g data-component-id="component-refrigerator"><rect x="2" y="2" width="1" height="1"/></g>
  <g data-component-id="component-sink-base"><rect x="3" y="3" width="1" height="1"/></g>
</svg>
`;

test("buildKitchenPreviewSvgMarkup injects one highlight for one selected component", () => {
  const markup = buildKitchenPreviewSvgMarkup({
    svgMarkup: SAMPLE_SVG,
    kitchenSlug: "kitchen-model-c",
    highlightedComponentKeys: ["dishwasher-base"],
  });

  assert.match(markup, /x="615.25"/);
  assert.match(markup, /y="339.25"/);
  assert.match(markup, /stroke="#8f3e2c"/);
});

test("buildKitchenPreviewSvgMarkup injects multiple highlights and ignores unknown keys", () => {
  const markup = buildKitchenPreviewSvgMarkup({
    svgMarkup: SAMPLE_SVG,
    kitchenSlug: "kitchen-model-c",
    highlightedComponentKeys: ["sink-base", "dishwasher-base", "unknown-component"],
  });

  assert.equal((markup.match(/stroke="#8f3e2c"/g) || []).length, 2);
  assert.match(markup, /x="543\.25"/);
  assert.match(markup, /x="615\.25"/);
});

test("buildKitchenPreviewSvgMarkup falls back to the base svg when no known highlights exist", () => {
  const markup = buildKitchenPreviewSvgMarkup({
    svgMarkup: SAMPLE_SVG,
    kitchenSlug: "unknown-kitchen",
    highlightedComponentKeys: ["dishwasher-base"],
  });

  assert.doesNotMatch(markup, /stroke="#8f3e2c"/);
  assert.match(markup, /<svg\b/);
});

test("applyVisibleComponentsToSvgMarkup hides components that are not on the contract order", () => {
  const markup = applyVisibleComponentsToSvgMarkup(SAMPLE_KITCHEN_SVG, [
    "component-oven-base",
    "component-refrigerator",
  ]);

  assert.match(markup, /data-component-id="component-oven-base"/);
  assert.doesNotMatch(markup, /data-component-id="component-oven-base"[^>]*style="display:none"/);
  assert.match(markup, /data-component-id="component-refrigerator"/);
  assert.match(markup, /data-component-id="component-sink-base"[^>]*style="display:none"/);
});

test("buildKitchenPreviewSvgMarkup applies visible component filtering before highlights", () => {
  const markup = buildKitchenPreviewSvgMarkup({
    svgMarkup: SAMPLE_KITCHEN_SVG,
    kitchenSlug: "kitchen-model-c",
    highlightedComponentKeys: ["oven-base"],
    visibleComponentIds: ["component-oven-base", "component-refrigerator"],
  });

  assert.match(markup, /data-component-id="component-sink-base"[^>]*style="display:none"/);
  assert.match(markup, /stroke="#8f3e2c"/);
});

test("resolveClaimPreviewComponentKeys resolves explicit keys, component ids, and item codes", () => {
  const keys = resolveClaimPreviewComponentKeys({
    selectedAreas: [
      { componentKey: "refrigerator" },
      { componentId: "component-dishwasher-base" },
      { code: "sinkbase-c-600" },
    ],
    kitchenConfig: {
      components: [
        { componentKey: "dishwasher-base", code: "DISH-C-600-STD" },
        { componentKey: "sink-base", code: "SINKBASE-C-600" },
      ],
    },
  });

  assert.deepEqual(keys, ["refrigerator", "dishwasher-base", "sink-base"]);
});

test("inferKitchenSlugFromSelectedAreas resolves model b from stored claim area codes", () => {
  const slug = inferKitchenSlugFromSelectedAreas([
    { componentId: "component-oven-module", code: "OVEN-B-600-HOB" },
    { componentId: "component-refrigerator", code: "REF-B-545-1800-700" },
  ]);

  assert.equal(slug, "kitchen-model-b");
});

test("inferKitchenSlugFromSelectedAreas does not guess when areas conflict", () => {
  const slug = inferKitchenSlugFromSelectedAreas([
    { code: "OVEN-B-600-HOB" },
    { code: "DISH-C-600-STD" },
  ]);

  assert.equal(slug, "");
});
