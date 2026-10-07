import assert from "node:assert/strict";
import test from "node:test";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { buildServiceClaimPartHotspots, buildServiceClaimBlendeHotspots } from "../lib/service-claim-kitchen-hotspots.js";
import { getLinkedComponentIds, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import { buildServiceClaimReferencePlan } from "../lib/service-claim-reference-plan.js";

const slug = "ab-105777";
const source = PLAN_HOTSPOTS_BY_SLUG[slug];
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);

test("105777 claims use the configured plan even when an older reference preview is stored", () => {
  assert.equal(buildServiceClaimReferencePlan({
    kitchen: { slug, name: "105777" },
    claimPlanPreviewPath: "/api/service-claims/contracts/670105777/plan-assets/preview",
  }), null);
  assert.equal(buildServiceClaimReferencePlan({
    kitchen: { slug: "ab-105845", name: "105845" },
    claimPlanPreviewPath: "/jpg/older-plan.jpg",
  })?.selectionMode, "reference-pdf");
});

test("105777 selections follow the PDF cabinet edges and supplied filler panels", () => {
  for (const [key, start, end] of [
    ["base-module-1", 120, 222.96], ["oven-module", 222.96, 325.8],
    ["base-module-2", 325.8, 394.44], ["base-module-3", 394.44, 456.12],
    ["drawer-module", 525.12, 625.32], ["sink-base", 625.32, 728.28],
    ["dishwasher-base", 728.28, 833.88],
  ]) {
    const h = source.find(h => h.componentKey === key);
    near(h.left, start / 842 * 100);
    near(h.left + h.width, end / 842 * 100);
    near(h.top, 366.28 / 595 * 100);
    near(h.top + h.height, 516.88 / 595 * 100);
  }
  assert.equal(source.filter(h => h.componentKey.startsWith("wall-cabinet-")).length, 7);
  assert.deepEqual(getLinkedComponentIds(slug, "component-wall-cabinet-2"), ["component-wall-cabinet-2", "component-extractor-hood"]);
  const hood = source.filter(h => h.componentKey === "extractor-hood");
  assert.equal(hood.length, 3, "hood fascia and both light symbols select the same package");
  for (const [index, start, end] of [[1, 240.6, 260.64], [2, 292.68, 312.72]]) {
    near(hood[index].left, start / 842 * 100);
    near(hood[index].left + hood[index].width, end / 842 * 100);
    near(hood[index].top, 284.08 / 595 * 100);
    near(hood[index].top + hood[index].height, 298.36 / 595 * 100);
  }
  const label = getLocalizedItemName({code:"CAB-BASE-AB105777-US40-6",name:"Lower Cabinet"},(_key,fallback)=>fallback,"en",true);
  assert.ok(label.startsWith("6. "));
  assert.deepEqual(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug].map(h=>h.key), ["dishwasher-basket","dishwasher-gs-mark"]);
});

test("105777 default articles split into independent claim areas at the PDF drawer seam", () => {
  const parts = [
    ["oven", "oven-module"], ["oven-drawer", "oven-module"], ["cooktop", "oven-module"],
    ["sink", "sink-faucet"], ["faucet", "sink-faucet"],
    ["worktop-left", "worktop"], ["worktop-right", "worktop"],
  ].map(([partKey, sourceComponentKey]) => ({partKey,sourceComponentKey,componentId:`component-claim-${partKey}`}));
  const claims = buildServiceClaimPartHotspots(source,parts,slug);
  const part = key => claims.find(h=>h.claimPartKey===key);
  for (const [key] of parts.map(p=>[p.partKey])) assert.ok(part(key),key);
  near(part("oven").top + part("oven").height, 465.88 / 595 * 100);
  near(part("oven-drawer").top, 465.88 / 595 * 100);
  assert.deepEqual([part("worktop-left").left,part("worktop-right").left],source.filter(h=>h.componentKey==="worktop" && !h.separateLockedSidePanel).map(h=>h.left));
});

test("105777 claim filler areas stop on their measured cabinet divider", () => {
  const definitions = [["base-module-3","UPK20",445.92,456.12,300],["drawer-module","UPK20",525.12,539.64,500],["dishwasher-base","UPK20",831.12,833.88,600],["wall-cabinet-4","HPK2002",445.92,456.12,300],["wall-cabinet-5","HPK2002",525.12,539.64,500],["wall-cabinet-7","HPK2002",831.12,833.88,600]];
  const parts = definitions.map(([sourceComponentKey,code,,,sourceWidthMm])=>({sourceComponentKey,code,componentId:`blende-${sourceComponentKey}`,claimPartKey:"blende",sourceWidthMm,blendeQuantity:1}));
  const result = buildServiceClaimBlendeHotspots(source,parts,definitions.map(([componentKey,,,,widthMm])=>({componentKey,widthMm})),slug);
  for (const [key,,start,end] of definitions) {
    const h = result.find(h=>h.claimPartKey==="blende" && h.sourceComponentKey===key);
    assert.ok(h,key);
    near(h.left,start/842*100);
    near(h.left+h.width,end/842*100);
  }
});
