import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { buildServiceClaimSelectableComponents } from "../lib/service-claim-kitchen-plan-selection.js";
import { buildServiceClaimPartHotspots } from "../lib/service-claim-kitchen-hotspots.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const component = (code, componentKey, name = code, overrides = {}) => ({
  itemType: "COMPONENT",
  code,
  componentKey,
  name,
  ...overrides,
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

test("service claim kitchen plan keeps only defaults and confirmed components selectable", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-DEFAULT", "base-module-0", "Default base", { isLocked: true }),
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

  assert.deepEqual(result.selectableComponentIds, ["component-base-module-0", "component-base-module-1"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["CAB-BASE-DEFAULT", "CAB-BASE-ORDERED"]);
  assert.equal(result.source, "kitchen");
});

test("service claim kitchen plan falls back to default components before any confirmed order", () => {
  const kitchen = {
    items: [
      component("CAB-BASE-A", "base-module-1", "Base A", { isLocked: true }),
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

  assert.deepEqual(result.selectableComponentIds, ["component-base-module-1"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["CAB-BASE-A"]);
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
    confirmedItems: [
      { itemType: "COMPONENT", code: "CAB-HOOD-AB105806-600", nameSnapshot: "Upper Cabinet with Extractor Hood 60 cm" },
    ],
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
  assert.match(source, /clipPath id=\{imageClipPathId\}/);
  assert.match(source, /getHotspotSvgPolygonPoints/);
  assert.match(source, /getServiceClaimLinkedComponentIds\(kitchenSlug,\s*hotspot\.componentId\)[\s\S]*\.includes\(hoveredComponentId\)/);
  assert.match(source, /styles\.planHotspotHover/);
  assert.match(source, /const isSelected = selectedIds\.has\(hotspot\.componentId\);/);
  assert.match(source, /getServiceClaimLinkedComponentIds\(kitchenSlug,\s*componentId\)\.filter\(\(id\) => selectable\.has\(id\)\)/);
  assert.match(source, /const shouldRemove = ids\.some\(\(id\) => current\.has\(id\)\);/);
  assert.match(source, /!isLShapedClaimKitchen\(kitchenSlug\)/);
  assert.match(source, /service-claim-kitchen__manual-option/);
  assert.match(source, /componentId:\s*sinkComponentId/);
  assert.match(source, /showManualCooktopOption/);
  assert.match(source, /componentId:\s*cooktopComponentId/);
  assert.match(source, /labels\?\.sinkOption\s*\|\|\s*"Sink"/);
  assert.match(source, /labels\?\.cooktopOption\s*\|\|\s*"Cooktop"/);
});

test("service claim kitchen plan uses test order state for 111 contracts", () => {
  const source = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-plan.js"), "utf8");

  assert.match(source, /getOrderKindForContractNumber\(contract\.contractNumber\)/);
  assert.match(source, /getContractOrderState\(contract\.id,\s*prisma,\s*orderKind\)/);
});

test("AB 105834 claim hotspots keep sink and sink cabinet separate", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");

  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"corner-base"[\s\S]*\[\[62\.31,\s*59\.71\]/);
  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"sink-faucet"[\s\S]*\[\[69\.95,\s*45\.98\]/);
});

test("AB 105837 claim hotspot maps the hood LED strip to extractor hood", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");

  assert.match(source, /"ab-105837":\s*\[[\s\S]*componentKey:\s*"wall-cabinet-2"[\s\S]*\[\[37\.08,\s*15\.17\],\s*\[48\.02,\s*13\.59\],\s*\[48\.02,\s*37\.69\],\s*\[37\.08,\s*39\.38\]\]/);
  assert.match(source, /"ab-105837":\s*\[[\s\S]*componentKey:\s*"extractor-hood"[\s\S]*\[\[37\.08,\s*39\.38\],\s*\[48\.02,\s*37\.69\],\s*\[48\.02,\s*39\.38\],\s*\[37\.08,\s*41\.0\]\]/);
});

test("AB 105834 claim hotspot maps the hood LED strip to extractor hood", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-stage.jsx"), "utf8");

  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"wall-cabinet-2"[\s\S]*\[\[35\.48,\s*11\.13\],\s*\[47\.48,\s*9\.4\],\s*\[47\.48,\s*37\.86\],\s*\[35\.48,\s*39\.6\]\]/);
  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"extractor-hood"[\s\S]*\[\[35\.49,\s*39\.62\],\s*\[35\.48,\s*37\.8\],\s*\[30\.0,\s*38\.62\]\]/);
  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"extractor-hood"[\s\S]*\[\[35\.48,\s*37\.9\],\s*\[47\.48,\s*36\.16\],\s*\[47\.48,\s*37\.9\],\s*\[35\.48,\s*39\.57\]\]/);
  assert.match(source, /"ab-105834":\s*\[[\s\S]*componentKey:\s*"extractor-hood"[\s\S]*\[\[36\.58,\s*44\.08\],\s*\[46\.38,\s*42\.75\],\s*\[46\.38,\s*38\.11\],\s*\[36\.58,\s*39\.57\]\]/);
});

test("service claim plan labels sink separately from worktop", () => {
  const planSource = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-plan-selection.js"), "utf8");
  const flowSource = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(planSource, /"component-sink-faucet":\s*"Sink"/);
  assert.match(planSource, /resolveServiceClaimComponentName\(componentId,\s*item\)/);
  assert.match(flowSource, /"SINK-WORKTOP":\s*"Sp\\u00fcle"/);
});

test("service claim kitchen plan replaces sink sources with three independent claim parts", () => {
  const kitchen = {
    items: [
      component("SINKBASE-B-600", "sink-base", "Sink Lower Cabinet", { isLocked: true }),
      component("SINK-WORKTOP", "sink-faucet", "Worktop", { isLocked: true }),
    ],
  };
  const claimParts = [
    { partKey: "sink", articleCode: "526335", name: "Built-in Sink BLANCO TIPO 45 S", nameDe: "Einbau-Spüle BLANCO TIPO 45 S", sourceKitchenItemCode: "SINK-WORKTOP", sourceComponentKey: "sink-faucet" },
    { partKey: "sink-cabinet", articleCode: "SP60", name: "Sink Lower Cabinet", nameDe: "Spülen-Unterschrank", sourceKitchenItemCode: "SINKBASE-B-600", sourceComponentKey: "sink-base" },
    { partKey: "faucet", articleCode: "517720", name: "Kitchen Faucet BLANCO DARAS HD", nameDe: "Küchenarmatur BLANCO DARAS HD", sourceKitchenItemCode: "SINK-WORKTOP", sourceComponentKey: "sink-faucet" },
  ];
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105806",
    claimParts,
  });

  assert.deepEqual(result.selectableComponentIds, [
    "component-claim-sink",
    "component-claim-sink-cabinet",
    "component-claim-faucet",
  ]);
  assert.deepEqual(result.visibleComponentIds, ["component-sink-base", "component-sink-faucet"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["526335", "SP60", "517720"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.articleCode), ["526335", "SP60", "517720"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.sourceKitchenItemCode), ["SINK-WORKTOP", "SINKBASE-B-600", "SINK-WORKTOP"]);
});

test("service claim kitchen plan replaces the oven bundle with oven, drawer, and cooktop parts", () => {
  const kitchen = {
    items: [
      component("OVEN-B-600-HOB", "oven-module", "Built-in oven and induction hob", { isLocked: true }),
    ],
  };
  const claimParts = [
    { partKey: "oven", articleCode: "EH92364E-A", name: "Built-in Oven", nameDe: "Einbauherd", sourceKitchenItemCode: "OVEN-B-600-HOB", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", articleCode: "UHK", name: "Lower Cabinet for Built-in Oven", nameDe: "Unterschrank für Einbauherde", sourceKitchenItemCode: "OVEN-B-600-HOB", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", articleCode: "9EC744100C", name: "Ceramic Cooktop 60cm", nameDe: "Glaskeramikkochfeld 60 cm", sourceKitchenItemCode: "OVEN-B-600-HOB", sourceComponentKey: "oven-module" },
  ];
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105834",
    claimParts,
  });

  assert.deepEqual(result.selectableComponentIds, [
    "component-claim-oven",
    "component-claim-oven-drawer",
    "component-claim-cooktop",
  ]);
  assert.deepEqual(result.visibleComponentIds, ["component-oven-module"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.name), ["Built-in Oven", "Lower Cabinet for Built-in Oven", "Ceramic Cooktop 60cm"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["EH92364E-A", "UHK", "9EC744100C"]);
});

test("L kitchen claim plan replaces one worktop item with independent left and right parts", () => {
  const kitchen = {
    items: [
      component("TOP-AB105806", "worktop", "Worktop", { isLocked: true }),
    ],
  };
  const claimParts = [
    { partKey: "worktop-left", articleCode: "PLR60-1", name: "Left Worktop", nameDe: "Arbeitsplatte links", sourceKitchenItemCode: "TOP-AB105806", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", articleCode: "PLR60-2", name: "Right Worktop", nameDe: "Arbeitsplatte rechts", sourceKitchenItemCode: "TOP-AB105806", sourceComponentKey: "worktop" },
  ];
  const result = buildServiceClaimSelectableComponents({
    kitchen,
    kitchenConfig: { components: kitchen.items },
    kitchenSlug: "ab-105834",
    claimParts,
  });

  assert.deepEqual(result.selectableComponentIds, [
    "component-claim-worktop-left",
    "component-claim-worktop-right",
  ]);
  assert.deepEqual(result.visibleComponentIds, ["component-worktop"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.name), ["Left Worktop", "Right Worktop"]);
  assert.deepEqual(result.selectableComponents.map((entry) => entry.code), ["PLR60-1", "PLR60-2"]);
});

test("non-L claim plans omit the invisible sink hotspot but keep cabinet and faucet", () => {
  const hotspots = [
    { componentKey: "sink-base", left: 10, top: 50, width: 20, height: 30 },
    { componentKey: "sink-faucet", left: 14, top: 40, width: 8, height: 10 },
  ];
  const result = buildServiceClaimPartHotspots(hotspots, [
    { partKey: "sink", sourceComponentKey: "sink-faucet" },
    { partKey: "sink-cabinet", sourceComponentKey: "sink-base" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
  ]);

  assert.deepEqual(result.map((entry) => entry.componentId), [
    "component-claim-sink-cabinet",
    "component-claim-faucet",
  ]);
  const sink = result.find((entry) => entry.claimPartKey === "sink");
  const faucet = result.find((entry) => entry.claimPartKey === "faucet");
  assert.equal(sink, undefined);
  assert.equal(faucet.top, 40);
  assert.equal(faucet.width, 8);
  assert.equal(faucet.height, 10);
});

test("oven, drawer, and cooktop use independent claim hotspots", () => {
  const claimParts = [
    { partKey: "oven", sourceComponentKey: "oven-module" },
    { partKey: "oven-drawer", sourceComponentKey: "oven-module" },
    { partKey: "cooktop", sourceComponentKey: "oven-module" },
  ];
  const source = [{ componentKey: "oven-module", left: 20, top: 40, width: 10, height: 30 }];
  const elevation = buildServiceClaimPartHotspots(source, claimParts, "ab-105814");
  const ovenHotspots = elevation.filter((entry) => entry.claimPartKey === "oven");
  const oven = ovenHotspots[0];
  const drawer = elevation.find((entry) => entry.claimPartKey === "oven-drawer");
  const cooktop = elevation.find((entry) => entry.claimPartKey === "cooktop");

  assert.equal(oven.left, 20);
  assert.equal(oven.top, 40);
  assert.equal(oven.width, 10);
  assert.ok(Math.abs(oven.height - 19.8) < 0.000001);
  assert.equal(ovenHotspots.length, 1);
  assert.equal(drawer.componentId, "component-claim-oven-drawer");
  assert.equal(drawer.left, 20);
  assert.ok(Math.abs(drawer.top - 59.8) < 0.000001);
  assert.equal(drawer.width, 10);
  assert.ok(Math.abs(drawer.height - 10.2) < 0.000001);
  assert.ok(Math.abs(oven.top + oven.height - drawer.top) < 0.000001);
  assert.ok(Math.abs(drawer.top + drawer.height - 70) < 0.000001);
  assert.ok(cooktop.top < oven.top);
  assert.ok(cooktop.height < oven.height);
  assert.match(cooktop.clipPath, /^polygon\(/);

  const lShaped = buildServiceClaimPartHotspots(source, claimParts, "ab-105834");
  const lShapedCooktop = lShaped.find((entry) => entry.claimPartKey === "cooktop");
  assert.ok(lShapedCooktop.left < oven.left);
  assert.ok(lShapedCooktop.width > oven.width);
  assert.ok(Math.abs(lShapedCooktop.left - 11.45) < 0.001);
  assert.ok(Math.abs(lShapedCooktop.top - 36.949) < 0.001);
  assert.ok(Math.abs(lShapedCooktop.width - 19.215) < 0.001);
  assert.ok(Math.abs(lShapedCooktop.height - 3.495) < 0.001);

  // Use the exact live AB 105805 oven bounds and verify the PDF-measured
  // cooktop outline. AB 105809/105813/105817 reuse this same plan.
  const kitchen105805Source = [
    { componentKey: "oven-module", left: 35.45, top: 56.13, width: 10.12, height: 28.71 },
  ];
  const kitchen105805 = buildServiceClaimPartHotspots(kitchen105805Source, claimParts, "ab-105805");
  const kitchen105805Cooktop = kitchen105805.find((entry) => entry.claimPartKey === "cooktop");
  assert.ok(Math.abs(kitchen105805Cooktop.left - 28.44418) < 0.001);
  assert.ok(Math.abs(kitchen105805Cooktop.top - 53.15125) < 0.001);
  assert.ok(Math.abs(kitchen105805Cooktop.width - 17.13183) < 0.001);
  assert.ok(Math.abs(kitchen105805Cooktop.height - 3.19329) < 0.001);
  assert.match(kitchen105805Cooktop.clipPath, /51\.993\d*% 0%/);

  for (const alias of ["ab-105809", "ab-105813", "ab-105817"]) {
    const aliasCooktop = buildServiceClaimPartHotspots(kitchen105805Source, claimParts, alias)
      .find((entry) => entry.claimPartKey === "cooktop");
    assert.equal(aliasCooktop.left, kitchen105805Cooktop.left);
    assert.equal(aliasCooktop.top, kitchen105805Cooktop.top);
    assert.equal(aliasCooktop.width, kitchen105805Cooktop.width);
    assert.equal(aliasCooktop.height, kitchen105805Cooktop.height);
    assert.equal(aliasCooktop.clipPath, kitchen105805Cooktop.clipPath);
  }

  // Use the exact live AB 105831 oven bounds from kitchen-svg-stage.jsx. They
  // differ from the canonical preview table and previously shifted the cooktop down.
  const kitchen105831 = buildServiceClaimPartHotspots(
    [{
      componentKey: "oven-module",
      left: 53.25,
      top: 61.55,
      width: 9.1,
      height: 31.15,
      points: [[53.25, 61.55], [62.35, 63.55], [62.35, 92.7], [53.25, 91.2]],
    }],
    claimParts,
    "ab-105831",
  );
  const kitchen105831Cooktop = kitchen105831.find((entry) => entry.claimPartKey === "cooktop");
  const kitchen105831Drawer = kitchen105831.find((entry) => entry.claimPartKey === "oven-drawer");
  assert.ok(Math.abs(kitchen105831Cooktop.left - 53.23634) < 0.001);
  assert.ok(Math.abs(kitchen105831Cooktop.top - 58.73949) < 0.001);
  assert.ok(Math.abs(kitchen105831Cooktop.width - 18.70547) < 0.001);
  assert.ok(Math.abs(kitchen105831Cooktop.height - 3.52942) < 0.001);
  assert.ok(Math.abs(kitchen105831Drawer.left - 53.25) < 0.001);
  assert.ok(Math.abs(kitchen105831Drawer.top - 81.119) < 0.001);
  assert.ok(Math.abs(kitchen105831Drawer.width - 9.1) < 0.001);
  assert.ok(Math.abs(kitchen105831Drawer.height - 11.581) < 0.001);
  assert.match(kitchen105831Drawer.clipPath, /^polygon\(0% 0%, 100% 14\.42\d*%, 100% 100%, 0% 87\.04\d*%\)$/);

  const kitchen105837 = buildServiceClaimPartHotspots(
    [{ componentKey: "oven-module", left: 41.07, top: 57.45, width: 10.98, height: 31.06 }],
    claimParts,
    "ab-105837",
  );
  const kitchen105837Cooktop = kitchen105837.find((entry) => entry.claimPartKey === "cooktop");
  assert.ok(Math.abs(kitchen105837Cooktop.left - 32.63064) < 0.001);
  assert.ok(Math.abs(kitchen105837Cooktop.top - 54.03361) < 0.001);
  assert.ok(Math.abs(kitchen105837Cooktop.width - 20.33848) < 0.001);
  assert.ok(Math.abs(kitchen105837Cooktop.height - 3.4874) < 0.001);

  const kitchen105825 = buildServiceClaimPartHotspots(
    [{ componentKey: "oven-base", left: 53.44, top: 56.8, width: 8.76, height: 30.26 }],
    claimParts.map((part) => ({ ...part, sourceComponentKey: "oven-base" })),
    "ab-105825",
  );
  const kitchen105825Cooktop = kitchen105825.find((entry) => entry.claimPartKey === "cooktop");
  assert.ok(Math.abs(kitchen105825Cooktop.left - 53.23634) < 0.001);
  assert.ok(Math.abs(kitchen105825Cooktop.top - 53.36135) < 0.001);
  assert.ok(Math.abs(kitchen105825Cooktop.width - 18.05226) < 0.001);
  assert.ok(Math.abs(kitchen105825Cooktop.height - 3.48739) < 0.001);
});

test("L worktop claim hotspots split the combined outline at the corner seam", () => {
  const claimParts = [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ];
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 29.55, top: 52.08, width: 65.27, height: 11.39 },
  ], claimParts, "ab-105834");
  const left = result.find((entry) => entry.claimPartKey === "worktop-left");
  const right = result.find((entry) => entry.claimPartKey === "worktop-right");

  assert.equal(result.length, 2);
  assert.equal(left.componentId, "component-claim-worktop-left");
  assert.equal(right.componentId, "component-claim-worktop-right");
  assert.ok(Math.abs(left.left - 29.55) < 0.001);
  assert.ok(Math.abs(left.top - 53.83) < 0.001);
  assert.ok(Math.abs(left.width - 24.26) < 0.001);
  assert.ok(Math.abs(left.height - 6.84) < 0.001);
  assert.ok(Math.abs(right.left - 42.41) < 0.001);
  assert.ok(Math.abs(right.top - 52.08) < 0.001);
  assert.ok(Math.abs(right.width - 52.41) < 0.001);
  assert.ok(Math.abs(right.height - 11.39) < 0.001);
  assert.match(left.clipPath, /^polygon\(/);
  assert.match(right.clipPath, /^polygon\(/);
});

test("L worktop split excludes floor-height end panels from the worktop selection", () => {
  const claimParts = [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ];
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 28.4, top: 50.4, width: 58.77, height: 8.87 },
    { componentKey: "worktop", left: 28.28, top: 58.5, width: 0.44, height: 27.52 },
  ], claimParts, "ab-105805");

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((entry) => entry.claimPartKey).sort(), [
    "worktop-left",
    "worktop-right",
  ]);
  assert.ok(result.every((entry) => entry.height < 10));
});

test("AB 105805 uses separate PDF surface and front-edge seam points", () => {
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 28.4, top: 50.4, width: 58.77, height: 8.87 },
  ], [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ], "ab-105805");
  const left = result.find((entry) => entry.claimPartKey === "worktop-left");
  const right = result.find((entry) => entry.claimPartKey === "worktop-right");

  assert.ok(Math.abs(left.left + left.width - 54.9) < 0.001);
  assert.ok(Math.abs(right.left - 45.57) < 0.001);
  assert.ok(Math.abs(right.left + right.width - 76.8) < 0.001);
  assert.match(left.clipPath, /^polygon\(/);
  assert.match(right.clipPath, /^polygon\(/);
});

test("segmented L worktop surfaces and front edges stay assigned to their side", () => {
  const claimParts = [
    { partKey: "worktop-left", sourceComponentKey: "worktop" },
    { partKey: "worktop-right", sourceComponentKey: "worktop" },
  ];
  const result = buildServiceClaimPartHotspots([
    { componentKey: "worktop", left: 10, top: 10, width: 20, height: 5 },
    { componentKey: "worktop", left: 30, top: 10, width: 40, height: 5 },
    { componentKey: "worktop", left: 10, top: 15, width: 20, height: 2 },
    { componentKey: "worktop", left: 30, top: 15, width: 40, height: 2 },
  ], claimParts, "ab-105840");

  assert.deepEqual(result.map((entry) => entry.claimPartKey), [
    "worktop-left",
    "worktop-right",
    "worktop-left",
    "worktop-right",
  ]);
  assert.deepEqual(result.map((entry) => entry.componentId), [
    "component-claim-worktop-left",
    "component-claim-worktop-right",
    "component-claim-worktop-left",
    "component-claim-worktop-right",
  ]);
});

test("service claim picker outlines worktop surfaces but not separate front-edge polygons", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "components", "service-claim-kitchen-picker.jsx"),
    "utf8",
  );

  assert.match(
    source,
    /hotspot\.claimPartKey === "worktop-left"[\s\S]*hotspot\.claimPartKey === "worktop-right"[\s\S]*hotspot\.preserveManualSize[\s\S]*return null/,
  );
  assert.match(source, /styles\.planHotspotWorktop/);

  const styles = fs.readFileSync(
    path.join(repoRoot, "components", "kitchen-configurator.module.css"),
    "utf8",
  );
  assert.match(styles, /\.planHotspotWorktop[\s\S]*border-color:\s*transparent;[\s\S]*box-shadow:\s*none;/);
});

test("service claim picker preserves sink and cooktop cutouts over a selected worktop", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "components", "service-claim-kitchen-picker.jsx"),
    "utf8",
  );
  const styles = fs.readFileSync(
    path.join(repoRoot, "components", "kitchen-configurator.module.css"),
    "utf8",
  );

  assert.match(
    source,
    /hotspot\.claimPartKey === "sink"\s*\|\|\s*hotspot\.claimPartKey === "cooktop"/,
  );
  assert.match(source, /hasSelectedWorktop\s*&&\s*applianceImageHotspots\.length/);
  assert.match(source, /className=\{styles\.planApplianceCutouts\}/);
  assert.match(
    styles,
    /\.planApplianceCutouts[\s\S]*z-index:\s*8;[\s\S]*pointer-events:\s*none;/,
  );
});

test("AB 105837 right worktop meets the calibrated cooktop edge without a surface gap", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "components", "kitchen-svg-stage.jsx"),
    "utf8",
  );

  assert.match(
    source,
    /"ab-105837":\s*\[[\s\S]*componentKey:\s*"worktop",\s*points:\s*\[\[43\.76,\s*54\.03\],\s*\[52\.05,\s*53\.0\][\s\S]*\[52\.97,\s*55\.84\]\]/,
  );
});

test("oven and cooktop migration backfills the existing claim-parts table", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260713160000_add_oven_cooktop_claim_parts", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /\('oven',\s*'Oven',\s*'Backofen',\s*40\)/);
  assert.match(migration, /\('cooktop',\s*'Cooktop',\s*'Kochfeld',\s*50\)/);
  assert.match(migration, /lower\(coalesce\(item\."componentKey", ''\)\) IN \('oven-module', 'oven-base'\)/);
  assert.match(migration, /ON CONFLICT \("kitchenId", "partKey"\) DO UPDATE/);
});

test("oven drawer migration adds one claim-only part without changing kitchen items", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260713200000_add_oven_drawer_claim_part", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /INSERT INTO "KitchenClaimPart"/);
  assert.match(migration, /'oven-drawer'/);
  assert.match(migration, /'Drawer under oven'/);
  assert.match(migration, /'Schublade unter Backofen'/);
  assert.match(migration, /lower\(coalesce\(item\."componentKey", ''\)\) IN \('oven-module', 'oven-base'\)/);
  assert.match(migration, /ON CONFLICT \("kitchenId", "partKey"\) DO UPDATE/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+"KitchenItem"/i);
});

test("claim article-code migration stores official AB metadata without changing kitchen items", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260713210000_add_claim_part_article_codes", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /ADD COLUMN "articleCode" TEXT/);
  assert.match(migration, /'oven-drawer', 'UHK', 'Lower Cabinet for Built-in Oven', 'Unterschrank für Einbauherde'/);
  assert.match(migration, /'oven', 'EH92364E-A', 'Built-in Oven', 'Einbauherd'/);
  assert.match(migration, /'cooktop', '9EC744100C', 'Ceramic Cooktop 60cm', 'Glaskeramikkochfeld 60 cm'/);
  assert.match(migration, /'sink-cabinet', 'SP60', 'Sink Lower Cabinet', 'Spülen-Unterschrank'/);
  assert.match(migration, /'sink', '526335', 'Built-in Sink BLANCO TIPO 45 S', 'Einbau-Spüle BLANCO TIPO 45 S'/);
  assert.match(migration, /'faucet', '517720', 'Kitchen Faucet BLANCO DARAS HD', 'Küchenarmatur BLANCO DARAS HD'/);
  assert.match(migration, /'worktop-left', 'PLR60-1'/);
  assert.match(migration, /'worktop-right', 'PLR60-2'/);
  assert.match(migration, /'cabinet-side-panel'[\s\S]*'WU16'/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+"KitchenItem"/i);
});

test("L worktop migration adds two claim-only parts without changing kitchen items", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260713180000_add_l_worktop_claim_parts", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /INSERT INTO "KitchenClaimPart"/);
  assert.match(migration, /lower\(coalesce\(item\."componentKey", ''\)\) = 'worktop'/);
  assert.match(migration, /'worktop-left', 'Left Worktop', 'Arbeitsplatte links', 60/);
  assert.match(migration, /'worktop-right', 'Right Worktop', 'Arbeitsplatte rechts', 70/);
  assert.match(migration, /'ab-105840'/);
  assert.match(migration, /ON CONFLICT \("kitchenId", "partKey"\) DO UPDATE/);
  assert.doesNotMatch(migration, /UPDATE\s+"KitchenItem"/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+"KitchenItem"/i);
});

test("AB 105825 claim sink follows the calibrated bowl polygon", () => {
  const result = buildServiceClaimPartHotspots(
    [{ componentKey: "sink-faucet", left: 20, top: 40, width: 8, height: 14 }],
    [
      { partKey: "sink", sourceComponentKey: "sink-faucet" },
      { partKey: "faucet", sourceComponentKey: "sink-faucet" },
    ],
    "ab-105825",
  );
  const sink = result.find((entry) => entry.claimPartKey === "sink");
  const faucet = result.find((entry) => entry.claimPartKey === "faucet");

  assert.equal(sink.left, 14);
  assert.ok(Math.abs(sink.top - 50.92) < 0.000001);
  assert.ok(Math.abs(sink.width - 22.4) < 0.000001);
  assert.ok(Math.abs(sink.height - 3.78) < 0.000001);
  assert.match(sink.clipPath, /^polygon\(/);
  assert.equal(faucet.left, 20);
  assert.equal(faucet.top, 40);
  assert.equal(faucet.width, 8);
  assert.equal(faucet.height, 14);
});

test("all L-shaped claim plans separate the complete faucet from the sink bowl", () => {
  const lShapedSlugs = [
    "ab-104968",
    "ab-105734",
    "ab-105737",
    "ab-105740",
    "ab-105805",
    "ab-105809",
    "ab-105813",
    "ab-105817",
    "ab-105822",
    "ab-105825",
    "ab-105828",
    "ab-105831",
    "ab-105834",
    "ab-105837",
    "ab-105840",
    "ab-105843",
  ];

  for (const kitchenSlug of lShapedSlugs) {
    const result = buildServiceClaimPartHotspots(
      [{ componentKey: "sink-faucet", left: 20, top: 40, width: 8, height: 14 }],
      [
        { partKey: "sink", sourceComponentKey: "sink-faucet" },
        { partKey: "faucet", sourceComponentKey: "sink-faucet" },
      ],
      kitchenSlug,
    );
    const sink = result.find((entry) => entry.claimPartKey === "sink");
    const faucet = result.find((entry) => entry.claimPartKey === "faucet");

    assert.match(sink.clipPath, /^polygon\(/, kitchenSlug);
    assert.ok(sink.width > faucet.width, kitchenSlug);
    assert.equal(faucet.left, 20, kitchenSlug);
    assert.equal(faucet.top, 40, kitchenSlug);
    assert.equal(faucet.width, 8, kitchenSlug);
    assert.equal(faucet.height, 14, kitchenSlug);
  }
});

test("AB 105822 reuses the pixel-matched AB 105825 sink polygon", () => {
  const claimParts = [
    { partKey: "sink", sourceComponentKey: "sink-faucet" },
    { partKey: "faucet", sourceComponentKey: "sink-faucet" },
  ];
  const hotspot = [{ componentKey: "sink-faucet", left: 20, top: 40, width: 8, height: 14 }];
  const sinkFor = (slug) => buildServiceClaimPartHotspots(hotspot, claimParts, slug)
    .find((entry) => entry.claimPartKey === "sink");

  assert.deepEqual(sinkFor("ab-105822"), sinkFor("ab-105825"));
});

test("German service claim labels do not fall back to English catalog names", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(source, /function formatGermanClaimAreaName/);
  assert.match(source, /claimPartNameDe[\s\S]*return claimPartNameDe/);
  assert.match(source, /service-field__problem-area-article-code[\s\S]*area\.articleCode/);
  assert.match(source, /component-claim-oven"\) \{[\s\S]*return "Backofen"/);
  assert.match(source, /component-claim-oven-drawer"\) \{[\s\S]*return "Schublade unter Backofen"/);
  assert.match(source, /component-claim-cooktop"\) \{[\s\S]*return "Kochfeld"/);
  assert.match(source, /component-claim-worktop-left"\) \{[\s\S]*return "Arbeitsplatte links"/);
  assert.match(source, /component-claim-worktop-right"\) \{[\s\S]*return "Arbeitsplatte rechts"/);
  assert.match(source, /code\.startsWith\("REF-"\)[\s\S]*Standk\\u00fchlschrank 178 cm/);
  assert.match(source, /normalizedName\.includes\("lower cabinet with drawer"\)[\s\S]*Unterschrank mit Schublade/);
  assert.match(source, /normalizedName\.includes\("dishwasher"\)[\s\S]*Vollintegrierter Geschirrsp\\u00fcler/);
});
