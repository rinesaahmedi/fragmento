import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { buildServiceClaimSelectableComponents } from "../lib/service-claim-kitchen-plan-selection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const component = (code, componentKey, name = code) => ({
  itemType: "COMPONENT",
  code,
  componentKey,
  name,
});

test("service kitchen svg loader uses the AB 105808 plan asset", async () => {
  const markup = await loadKitchenSvgMarkup("ab-105808");

  assert.match(markup, /viewBox="0 0 842 595"/);
  assert.match(markup, /M1214 2108H6758/);
});

test("service kitchen svg loader resolves AB plan assets by slug", async () => {
  const markup = await loadKitchenSvgMarkup("ab-105826");
  const expected = fs.readFileSync(path.join(repoRoot, "public", "plans", "AB 105826.svg"), "utf8").trim();

  assert.match(markup, /viewBox="0 0 842 595"/);
  assert.equal(markup, expected);
});

test("AB 105808 service plan uses overlay bounds instead of color grouping", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-plan-utils.js"), "utf8");

  assert.match(source, /"ab-105808":\s*{/);
  assert.match(source, /"component-wall-cabinet-6":\s*boundsFromPlanPercent\(81\.23,\s*15\.89,\s*15\.07,\s*24\.09\)/);
  assert.match(source, /!\s*hasOverlayPlanBounds\(kitchenConfig\.kitchen\.slug\)/);
});

test("service claim kitchen plan keeps the full assigned kitchen selectable when orders exist", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-ORDERED", "base-module-1", "Ordered base"),
      component("CAB-BASE-NOT-ORDERED", "base-module-2", "Not ordered base"),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105806",
    confirmedItems: [
      { itemType: "COMPONENT", code: "CAB-BASE-ORDERED", nameSnapshot: "Ordered base" },
    ],
  });

  assert.deepEqual(result.selectableComponentIds, ["component-base-module-1", "component-base-module-2"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["CAB-BASE-ORDERED", "CAB-BASE-NOT-ORDERED"]);
  assert.equal(result.source, "kitchen");
});

test("service claim kitchen plan falls back to the assigned kitchen before any confirmed order", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-A", "base-module-1", "Base A"),
      component("CAB-BASE-B", "base-module-2", "Base B"),
      { itemType: "ACCESSORY", code: "ACC-1", componentKey: "ignored", name: "Accessory" },
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105806",
    confirmedItems: [],
  });

  assert.deepEqual(result.selectableComponentIds, ["component-base-module-1", "component-base-module-2"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["CAB-BASE-A", "CAB-BASE-B"]);
  assert.equal(result.source, "kitchen");
});

test("AB 105805 service claim plan links extractor hood claims to the LED set", () => {
  const kitchen = {
    items: [
      component("CAB-HOOD-AB105806-600", "wall-cabinet-2", "Upper Cabinet with Extractor Hood 60 cm"),
      component("HOOD-AB105806-FH664621E", "extractor-hood", "FH664621E Extractor Hood"),
    ],
  };
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105805",
  });

  assert.ok(result.selectableComponentIds.includes("component-extractor-hood"));
  assert.ok(result.selectableComponentIds.includes("component-under-cabinet-light"));
  assert.ok(result.selectableComponents.some((entry) =>
    entry.componentId === "component-under-cabinet-light"
    && entry.code === "ACC-LIGHT-003"
    && entry.name === "LED Lighting Set"
  ));
});

test("service claim picker toggles claim-linked hood and LED together", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "service-claim-kitchen-picker.jsx"), "utf8");

  assert.match(source, /getServiceClaimLinkedComponentIds/);
  assert.match(source, /IMAGE_HOTSPOTS_BY_SLUG/);
  assert.match(source, /IMAGE_VIEW_BY_SLUG/);
  assert.match(source, /withBasePlinthExtension/);
  assert.match(source, /withCornerBlendeExtensions/);
  assert.match(source, /withDerivedSinkFaucet/);
  assert.match(source, /getPlanDisplayCrop/);
  assert.match(source, /cropPlanHotspot/);
  assert.match(source, /croppedPlanAspectRatio/);
  assert.match(source, /getServiceClaimLinkedComponentIds\(kitchenSlug,\s*hotspot\.componentId\)[\s\S]*\.includes\(hoveredComponentId\)/);
  assert.match(source, /styles\.planHotspotHover/);
  assert.match(source, /const isSelected = selectedIds\.has\(hotspot\.componentId\);/);
  assert.match(source, /getServiceClaimLinkedComponentIds\(kitchenSlug,\s*componentId\)\.filter\(\(id\) => selectable\.has\(id\)\)/);
  assert.match(source, /const shouldRemove = ids\.some\(\(id\) => current\.has\(id\)\);/);
});

test("AB 105834 claim hotspots keep sink and sink cabinet separate", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");

  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"corner-base"[\s\S]*\[\[62\.31,\s*59\.71\]/);
  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"sink-faucet"[\s\S]*\[\[69\.95,\s*45\.98\]/);
});

test("AB 105837 claim hotspot maps the hood LED strip to extractor hood", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");

  assert.match(source, /"ab-105837":\s*\[[\s\S]*componentKey:\s*"wall-cabinet-2"[\s\S]*\[\[37\.08,\s*15\.17\],\s*\[48\.02,\s*13\.59\],\s*\[48\.02,\s*38\.69\],\s*\[37\.08,\s*40\.38\]\]/);
  assert.match(source, /"ab-105837":\s*\[[\s\S]*componentKey:\s*"extractor-hood"[\s\S]*\[\[37\.08,\s*40\.38\],\s*\[48\.02,\s*38\.69\],\s*\[48\.02,\s*39\.78\],\s*\[37\.08,\s*41\.0\]\]/);
});

test("service claim plan labels sink separately from worktop", () => {
  const planSource = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-plan-selection.js"), "utf8");
  const flowSource = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(planSource, /"component-sink-faucet":\s*"Sink"/);
  assert.match(planSource, /resolveServiceClaimComponentName\(componentId,\s*item\)/);
  assert.match(flowSource, /"SINK-WORKTOP":\s*"Sp\\u00fcle"/);
});

test("German service claim labels do not fall back to English catalog names", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(source, /function formatGermanClaimAreaName/);
  assert.match(source, /code\.startsWith\("REF-"\)[\s\S]*Standk\\u00fchlschrank 178 cm/);
  assert.match(source, /normalizedName\.includes\("lower cabinet with drawer"\)[\s\S]*Unterschrank mit Schublade/);
  assert.match(source, /normalizedName\.includes\("dishwasher"\)[\s\S]*Vollintegrierter Geschirrsp\\u00fcler/);
});
