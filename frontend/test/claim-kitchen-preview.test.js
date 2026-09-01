import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import sharp from "sharp";
import {
  applyClaimPreviewSourceHotspotOverrides,
  applyVisibleComponentsToSvgMarkup,
  buildKitchenPreviewSvgMarkup,
  cropClaimPlanHotspot,
  inferKitchenSlugFromSelectedAreas,
  resolveClaimPreviewComponentKeys,
  resolveSelectedClaimPlanHotspots,
  renderReferencePlanMarkersPng,
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

test("AB 105811 email preview translates the oven to the original SVG coordinates", () => {
  const sourceHotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105811"];
  const corrected = applyClaimPreviewSourceHotspotOverrides("ab-105811", sourceHotspots);
  const originalOven = sourceHotspots.find((hotspot) => hotspot.componentKey === "oven-module");
  const correctedOven = corrected.find((hotspot) => hotspot.componentKey === "oven-module");

  assert.ok(Math.abs(originalOven.left - 50.712589) < 0.000001);
  assert.ok(Math.abs(correctedOven.left - 50.69358669833729) < 0.000001);
  assert.ok(Math.abs(correctedOven.top - 65.00840336134453) < 0.000001);
  assert.ok(Math.abs(correctedOven.width - 15.676959619952495) < 0.000001);
  assert.ok(Math.abs(correctedOven.height - 32.45042016806723) < 0.000001);
});

test("AB 105811 plan hotspots follow the source elevation lines", () => {
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105811"];
  const worktops = hotspots.filter((hotspot) => hotspot.componentKey === "worktop");
  const oven = hotspots.find((hotspot) => hotspot.componentKey === "oven-module");
  const refrigerator = hotspots.find((hotspot) => hotspot.componentKey === "refrigerator");

  assert.equal(worktops.length, 1);
  assert.deepEqual(worktops[0], {
    componentKey: "worktop",
    left: 2.850356,
    top: 63.361345,
    width: 63.895487,
    height: 1.512605,
  });
  assert.ok(Math.abs(oven.left - 50.712589) < 0.000001);
  assert.ok(Math.abs(oven.top - 64.873950) < 0.000001);
  assert.ok(Math.abs(refrigerator.left - 69.714964) < 0.000001);
});

test("AB 105814 oven follows the source elevation lines", () => {
  const oven = PLAN_HOTSPOTS_BY_SLUG["ab-105814"]
    .find((hotspot) => hotspot.componentKey === "oven-module");

  assert.deepEqual(oven, {
    componentKey: "oven-module",
    left: 28.622327,
    top: 58.319328,
    width: 14.014252,
    height: 29.07563,
  });
});

test("AB 105814 worktop is one continuous source-aligned surface", () => {
  const worktops = PLAN_HOTSPOTS_BY_SLUG["ab-105814"]
    .filter((hotspot) => hotspot.componentKey === "worktop");

  assert.deepEqual(worktops, [
    { componentKey: "worktop", left: 17.695962, top: 56.97479, width: 76.95962, height: 1.344538 },
  ]);
});

test("AB 105814 refrigerator follows the actual left cabinet outline", () => {
  const refrigerator = PLAN_HOTSPOTS_BY_SLUG["ab-105814"]
    .find((hotspot) => hotspot.componentKey === "refrigerator");

  assert.deepEqual(refrigerator, {
    componentKey: "refrigerator",
    left: 2.375297,
    top: 27.731092,
    width: 14.489312,
    height: 59.663866,
  });
});

test("AB 105815 email uses the same oven layout as the dashboard", () => {
  const emailOven = PLAN_HOTSPOTS_BY_SLUG["ab-105815"]
    .find((hotspot) => hotspot.componentKey === "oven-module");
  const dashboardLayoutOven = PLAN_HOTSPOTS_BY_SLUG["ab-105819"]
    .find((hotspot) => hotspot.componentKey === "oven-module");

  assert.deepEqual(emailOven, dashboardLayoutOven);
  assert.equal(emailOven.left, 50.68);
  assert.equal(emailOven.top, 64.82);
});

test("AB 105822 email uses the dashboard sink and faucet sources", () => {
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105822"];
  const sinkBase = hotspots.find((hotspot) => hotspot.componentKey === "sink-base");
  const faucets = hotspots.filter((hotspot) => hotspot.componentKey === "sink-faucet");

  assert.deepEqual(sinkBase.points, [
    [32.19, 56.37],
    [42.67, 54.78],
    [42.67, 83.36],
    [32.19, 84.87],
  ]);
  assert.equal(faucets.length, 1);
  assert.deepEqual(faucets[0].points, [
    [22.35, 42.85],
    [29.5, 42.85],
    [29.5, 54.3],
    [22.35, 55.2],
  ]);
});

test("AB 105828 email reuses the dashboard-matched AB 105822 sink geometry", () => {
  const kitchen105828 = PLAN_HOTSPOTS_BY_SLUG["ab-105828"];
  const kitchen105822 = PLAN_HOTSPOTS_BY_SLUG["ab-105822"];

  assert.equal(kitchen105828, kitchen105822);
  assert.equal(
    kitchen105828.filter((hotspot) => hotspot.componentKey === "sink-faucet").length,
    1,
  );
});

test("every image-based claim view and email use the same shared plan source", () => {
  const pickerSource = fs.readFileSync(
    new URL("../components/service-claim-kitchen-picker.jsx", import.meta.url),
    "utf8",
  );

  assert.match(pickerSource, /PLAN_HOTSPOTS_BY_SLUG\[kitchenSlug\]/);
  assert.match(pickerSource, /PLAN_IMAGE_BY_SLUG\[kitchenSlug\]/);
  assert.doesNotMatch(pickerSource, /IMAGE_HOTSPOTS_BY_SLUG\[kitchenSlug\]/);
  assert.doesNotMatch(pickerSource, /IMAGE_VIEW_BY_SLUG\[kitchenSlug\]/);
  assert.deepEqual(
    Object.keys(PLAN_HOTSPOTS_BY_SLUG).sort(),
    Object.keys(PLAN_IMAGE_BY_SLUG).sort(),
  );
});

test("AB 105831 email uses the dashboard sink and faucet geometry", () => {
  const hotspots = PLAN_HOTSPOTS_BY_SLUG["ab-105831"];
  const sinkBase = hotspots.find((hotspot) => hotspot.componentKey === "sink-base");
  const faucets = hotspots.filter((hotspot) => hotspot.componentKey === "sink-faucet");

  assert.deepEqual(sinkBase.points, [
    [31.45, 60.55],
    [42.25, 59.8],
    [42.25, 88.75],
    [31.45, 90.1],
  ]);
  assert.equal(faucets.length, 2);
  assert.deepEqual(faucets[1].points, [
    [25.05, 49.15],
    [30.8, 48.45],
    [30.8, 58.15],
    [25.05, 58.65],
  ]);
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
  assert.match(source, /normalizedSlug === "ab-105824"/);
  assert.match(source, /fill="rgba\(62,188,116,0\.58\)" stroke="none"/);
  assert.match(source, /png\(\{ compressionLevel: 9, palette: true, quality: 90 \}\)/);
});

test("email preview cuts calibrated sinks out of a selected worktop", () => {
  const source = fs.readFileSync(
    new URL("../lib/claim-kitchen-preview.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /\|\| hotspot\?\.claimPartKey === "sink"/);
  assert.match(source, /hasSelectedWorktop && isLShapedClaimKitchen\(normalizedSlug\)/);
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

test("reference-plan email renderer composites numbered markers without changing dimensions", async () => {
  const source = await sharp({
    create: {
      width: 240,
      height: 120,
      channels: 4,
      background: "#ffffff",
    },
  }).png().toBuffer();

  const rendered = await renderReferencePlanMarkersPng({
    content: source,
    markers: [{ markerNumber: 2, x: 50, y: 50 }],
  });
  const { data, info } = await sharp(rendered).raw().toBuffer({ resolveWithObject: true });
  let redPixelCount = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (data[offset] > 120 && data[offset + 1] < 90 && data[offset + 2] < 90) {
      redPixelCount += 1;
    }
  }

  assert.equal(info.width, 240);
  assert.equal(info.height, 120);
  assert.ok(redPixelCount > 100);
});
