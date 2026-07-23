import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  applyVisibleComponentsToSvgMarkup,
  buildKitchenPreviewSvgMarkup,
  cropClaimPlanHotspot,
  inferKitchenSlugFromSelectedAreas,
  resolveClaimPreviewComponentKeys,
  resolveSelectedClaimPlanHotspots,
} from "../lib/claim-kitchen-preview.js";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { buildServiceClaimPartHotspots } from "../lib/service-claim-kitchen-hotspots.js";

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

test("applyVisibleComponentsToSvgMarkup fades components that are not on the contract order", () => {
  const markup = applyVisibleComponentsToSvgMarkup(SAMPLE_KITCHEN_SVG, [
    "component-oven-base",
    "component-refrigerator",
  ]);

  assert.match(markup, /data-component-id="component-oven-base"/);
  assert.doesNotMatch(markup, /data-component-id="component-oven-base"[^>]*opacity:0\.3/);
  assert.match(markup, /data-component-id="component-refrigerator"/);
  assert.match(markup, /data-component-id="component-sink-base"[^>]*style="opacity:0\.3"/);
});

test("buildKitchenPreviewSvgMarkup applies visible component filtering before highlights", () => {
  const markup = buildKitchenPreviewSvgMarkup({
    svgMarkup: SAMPLE_KITCHEN_SVG,
    kitchenSlug: "kitchen-model-c",
    highlightedComponentKeys: ["oven-base"],
    visibleComponentIds: ["component-oven-base", "component-refrigerator"],
  });

  assert.match(markup, /data-component-id="component-sink-base"[^>]*style="opacity:0\.3"/);
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

test("AB 105805 email preview uses the claim picker's current PDF coordinates", () => {
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105805"];
  const baseModule2 = hotspots.find((hotspot) => hotspot.componentKey === "base-module-2");

  assert.deepEqual(baseModule2.points, [
    [45.57, 56.13],
    [55.52, 54.98],
    [55.52, 82.23],
    [45.57, 83.35],
  ]);
  assert.deepEqual(hotspots[0].points[0], [10.6, 29.8]);
});

test("email preview selection overlay uses claim hotspot clip polygons", () => {
  const source = fs.readFileSync(
    new URL("../lib/claim-kitchen-preview.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /function getClaimPlanClipPathPoints/);
  assert.match(source, /\.match\(\/\^polygon\\\(/);
  assert.match(source, /Number\(hotspot\.left \|\| 0\) \+ \(localX \/ 100\) \* Number\(hotspot\.width \|\| 0\)/);
  assert.match(source, /const clipPathPoints = getClaimPlanClipPathPoints\(hotspot\)/);
  assert.match(source, /const points = clipPathPoints\.length[\s\S]*Array\.isArray\(hotspot\?\.points\)/);
});

test("AB 105758 email preview uses the same actual-element plan as the service picker", () => {
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105758"];

  assert.equal(PLAN_IMAGE_BY_SLUG["ab-105758"], "/plans/AB%20105758.svg");
  assert.ok(hotspots.some((hotspot) => hotspot.componentKey === "base-module-3"));
  assert.ok(hotspots.some((hotspot) => hotspot.componentKey === "drawer-module"));
  assert.ok(hotspots.some((hotspot) => hotspot.componentKey === "oven-module"));
});

test("email preview falls back from a selected claim part to its actual kitchen element", () => {
  const sourceHotspot = {
    componentId: "component-dishwasher-base",
    componentKey: "dishwasher-base",
    left: 20,
    top: 30,
    width: 10,
    height: 20,
  };
  const selected = resolveSelectedClaimPlanHotspots({
    selectedAreas: [{ componentId: "component-claim-dishwasher", code: "A-EGSPV594400" }],
    claimHotspots: [],
    sourceHotspots: [sourceHotspot],
    selectableComponents: [{
      componentId: "component-claim-dishwasher",
      articleCode: "A-EGSPV594400",
      sourceComponentKey: "dishwasher-base",
    }],
  });

  assert.deepEqual(selected, [sourceHotspot]);
});

test("email preview selection overlay is strong enough to remain visible after email resizing", () => {
  const source = fs.readFileSync(
    new URL("../lib/claim-kitchen-preview.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /fill="rgba\(62,188,116,0\.34\)" stroke="none"/);
});

test("email preview cuts calibrated sinks out of a selected worktop", () => {
  const source = fs.readFileSync(
    new URL("../lib/claim-kitchen-preview.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /\|\| hotspot\?\.claimPartKey === "sink"/);
  assert.doesNotMatch(
    source,
    /hotspot\?\.claimPartKey === "sink" && !hotspot\?\.preserveManualSize/,
  );
});

test("AB 105758 email oven polygon uses the exact service-view coordinates after cropping", () => {
  const sourceOven = PLAN_HOTSPOTS_BY_SLUG["ab-105758"]
    .find((hotspot) => hotspot.componentKey === "oven-module");
  const crop = { left: 8, top: 4, right: 90, bottom: 94, width: 82, height: 90 };
  const croppedOven = cropClaimPlanHotspot(sourceOven, crop);
  const [emailOven] = buildServiceClaimPartHotspots(
    [croppedOven],
    [{ partKey: "oven", sourceComponentKey: "oven-module" }],
    "ab-105758",
  );

  assert.deepEqual(croppedOven.points, sourceOven.points);
  assert.ok(croppedOven.clipPath.startsWith("polygon("));
  assert.ok(Math.abs(emailOven.left - ((46.218527 - crop.left) / crop.width) * 100) < 0.0001);
  assert.ok(Math.abs(emailOven.top - ((54.783193 - crop.top) / crop.height) * 100) < 0.0001);
  assert.ok(Math.abs(emailOven.width - ((55.653207 - 46.218527) / crop.width) * 100) < 0.0001);
  assert.ok(Math.abs(emailOven.height - ((76.685714 - 54.783193) / crop.height) * 100) < 0.0001);
});
