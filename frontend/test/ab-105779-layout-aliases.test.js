import assert from "node:assert/strict";
import test from "node:test";
import { AB_105779_LAYOUT_ALIAS_SLUGS } from "../lib/ab-105779-layout.js";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG, PLAN_IMAGE_SOURCE_SIZE_BY_SLUG, PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { buildServiceClaimPartHotspots, buildServiceClaimBlendeHotspots, isLShapedClaimKitchen } from "../lib/service-claim-kitchen-hotspots.js";
import { getLinkedComponentIds } from "../components/kitchen-selection-utils.js";
import { buildServiceClaimReferencePlan } from "../lib/service-claim-reference-plan.js";
import { allowsKitchenArticleNumberAlias } from "../lib/order-article-aliases.js";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { buildPurchasedKitchenOverlaySvg } from "../lib/email/order-notifications.js";

const source=PLAN_HOTSPOTS_BY_SLUG["ab-105779"].map(h=>{
  const xs=h.points.map(p=>p[0]),ys=h.points.map(p=>p[1]);
  return {...h,left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
});
for(const slug of AB_105779_LAYOUT_ALIAS_SLUGS){
  test(`${slug} inherits the corrected plan, hood lights and PDF worktop`,async()=>{
    for(const map of [PLAN_HOTSPOTS_BY_SLUG,PLAN_IMAGE_BY_SLUG,PLAN_IMAGE_SOURCE_SIZE_BY_SLUG,PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG]) assert.deepEqual(map[slug],map["ab-105779"]);
    assert.equal(await loadKitchenSvgMarkup(slug),await loadKitchenSvgMarkup("ab-105779"));
    assert.ok(!PLAN_HOTSPOTS_BY_SLUG[slug].some(h=>h.componentKey==="corner-blende"));
    assert.deepEqual(getLinkedComponentIds(slug,"component-wall-cabinet-2"),["component-wall-cabinet-2","component-extractor-hood"]);
    assert.equal(allowsKitchenArticleNumberAlias(slug),true);
    const overlay=buildPurchasedKitchenOverlaySvg({order:{kitchen:{slug}},hotspots:source.filter(h=>h.componentKey==="worktop"),crop:{left:0,top:0,width:100,height:100},width:842,height:595}).toString("utf8");
    assert.match(overlay,/fill="rgba\(37,99,235,0\.26\)"/);
    assert.doesNotMatch(overlay,/stroke="rgba/);
  });
  test(`${slug} inherits all claim splits and uses the interactive plan`,()=>{
    assert.equal(isLShapedClaimKitchen(slug),true);
    const parts=[["sink","sink-faucet"],["faucet","sink-faucet"],["oven","oven-module"],["oven-drawer","oven-module"],["cooktop","oven-module"],["worktop-left","worktop"],["worktop-right","worktop"],["worktop-end-panel","worktop"]].map(([partKey,sourceComponentKey])=>({partKey,sourceComponentKey,componentId:`claim-${partKey}`}));
    assert.deepEqual(buildServiceClaimPartHotspots(source,parts,slug),buildServiceClaimPartHotspots(source,parts,"ab-105779"));
    const blende=[{sourceComponentKey:"wall-cabinet-3",componentId:"blende-upper",claimPartKey:"blende",code:"HPK2002",sourceWidthMm:600,blendeQuantity:1}];
    const cabinets=[{componentKey:"wall-cabinet-3",widthMm:600}];
    assert.deepEqual(buildServiceClaimBlendeHotspots(source,blende,cabinets,slug),buildServiceClaimBlendeHotspots(source,blende,cabinets,"ab-105779"));
    assert.equal(buildServiceClaimReferencePlan({kitchen:{slug},claimPlanPreviewPath:"/jpg/older-plan.jpg"}),null);
  });
}
