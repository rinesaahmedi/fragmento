import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKitchenPreviewSvgMarkup,
  resolveClaimPreviewComponentKeys,
} from "../lib/claim-kitchen-preview.js";

const SAMPLE_SVG = '<svg viewBox="0 0 900 600"></svg>';

test("buildKitchenPreviewSvgMarkup injects one highlight for one selected component", () => {
  const markup = buildKitchenPreviewSvgMarkup({
    svgMarkup: SAMPLE_SVG,
    kitchenSlug: "kitchen-model-c",
    highlightedComponentKeys: ["dishwasher-base"],
  });

  assert.match(markup, /x="611"/);
  assert.match(markup, /y="335"/);
  assert.match(markup, /stroke="#8f3e2c"/);
});

test("buildKitchenPreviewSvgMarkup injects multiple highlights and ignores unknown keys", () => {
  const markup = buildKitchenPreviewSvgMarkup({
    svgMarkup: SAMPLE_SVG,
    kitchenSlug: "kitchen-model-c",
    highlightedComponentKeys: ["sink-base", "dishwasher-base", "unknown-component"],
  });

  assert.equal((markup.match(/stroke="#8f3e2c"/g) || []).length, 2);
  assert.match(markup, /x="539"/);
  assert.match(markup, /x="611"/);
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
