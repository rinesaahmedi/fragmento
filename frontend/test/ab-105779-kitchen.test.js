import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG, PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { AB_105779_BLENDE_FACES, AB_105779_COOKTOP_POINTS, AB_105779_SINK_POINTS, AB_105779_OVEN_PART_POINTS } from "../lib/ab-105779-plan.js";
import { buildServiceClaimPartHotspots, buildServiceClaimBlendeHotspots, isLShapedClaimKitchen } from "../lib/service-claim-kitchen-hotspots.js";
import { getLinkedComponentIds, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import { buildServiceClaimReferencePlan } from "../lib/service-claim-reference-plan.js";
import { buildPurchasedKitchenOverlaySvg } from "../lib/email/order-notifications.js";

const slug = "ab-105779";
const source = PLAN_HOTSPOTS_BY_SLUG[slug].map(h => {
  const xs=h.points.map(p=>p[0]), ys=h.points.map(p=>p[1]);
  return {...h,left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
});

test("105779 uses the measured perspective plan and supplier callout numbers", () => {
  assert.equal(PLAN_IMAGE_BY_SLUG[slug],"/plans/AB%20105779.svg");
  assert.match(readFileSync(new URL("../public/plans/AB 105779.svg",import.meta.url),"utf8"),/viewBox="0 0 842 595"/);
  assert.ok(source.every(h=>h.points.length>=3));
  assert.equal(source.filter(h=>h.componentKey==="corner-blende").length,0,"the excluded corner must have no selection hotspot");
  const divider=source.find(h=>Math.abs(h.left-547.8/842*100)<0.00001 && h.top>60);
  assert.equal(divider?.componentKey,"worktop","the dishwasher/US60 divider stays fixed blue");
  assert.equal(divider?.claimExcludeFromWorktop,true);
  assert.equal(source.filter(h=>h.componentKey==="base-module-2").length,1);
  assert.equal(source.filter(h=>h.componentKey==="extractor-hood").length,4);
  for(const [code,nr] of Object.entries({"CAB-BASE-AB105779-US30":"5","DISH-AB105779-600":"7","CAB-BASE-AB105779-US60":"8","CAB-BASE-AB105779-US40":"9","CAB-WALL-AB105779-H3002":"10","CAB-HOOD-AB105777-600":"11","CAB-WALL-AB105779-H6002-HPK2002":"12"})) {
    assert.ok(getLocalizedItemName({code,name:"Kitchen element"},(_key,fallback)=>fallback,"en",true).startsWith(`${nr}. `),code);
  }
  assert.deepEqual(getLinkedComponentIds(slug,"component-wall-cabinet-2"),["component-wall-cabinet-2","component-extractor-hood"]);
  assert.deepEqual(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug].map(h=>h.key),["dishwasher-basket","dishwasher-gs-mark"]);
  assert.equal(buildServiceClaimReferencePlan({kitchen:{slug},claimPlanPreviewPath:"/jpg/older-plan.jpg"}),null);
});

test("105779 claims follow the sink, cooktop, drawer seam and worktop end panel", () => {
  assert.equal(isLShapedClaimKitchen(slug),true);
  const parts = [["sink","sink-faucet"],["faucet","sink-faucet"],["oven","oven-module"],["oven-drawer","oven-module"],["cooktop","oven-module"],["worktop-left","worktop"],["worktop-right","worktop"],["worktop-end-panel","worktop"]].map(([partKey,sourceComponentKey])=>({partKey,sourceComponentKey,componentId:`claim-${partKey}`}));
  const claims=buildServiceClaimPartHotspots(source,parts,slug);
  const part=key=>claims.filter(h=>h.claimPartKey===key);
  assert.deepEqual(part("sink")[0].points,AB_105779_SINK_POINTS);
  assert.deepEqual(part("cooktop")[0].points,AB_105779_COOKTOP_POINTS);
  for(const key of ["oven","oven-drawer"]) {
    const area=part(key)[0];
    const relative=area.clipPath.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const points=Array.from({length:relative.length/2},(_,i)=>[area.left+relative[i*2]/100*area.width,area.top+relative[i*2+1]/100*area.height]);
    points.forEach((point,index)=>point.forEach((v,axis)=>assert.ok(Math.abs(v-AB_105779_OVEN_PART_POINTS[key][index][axis])<0.00001)));
  }
  assert.equal(part("worktop-end-panel").length,1,"the narrow left side strip must not become another WU16 claim");
  assert.ok(part("worktop-left").length>1 && part("worktop-right").length>1);
});

test("105779 HPK2002 claims use only its two visible filler faces", () => {
  const blende=[{componentId:"blende-upper",sourceComponentKey:"wall-cabinet-3",claimPartKey:"blende",code:"HPK2002",sourceWidthMm:600,blendeQuantity:1}];
  const claims=buildServiceClaimBlendeHotspots(source,blende,[{componentKey:"wall-cabinet-3",widthMm:600}],slug).filter(h=>h.claimPartKey==="blende");
  assert.equal(claims.length,2);
  assert.deepEqual(claims.map(h=>({left:h.left,right:h.left+h.width,top:h.top,bottom:h.top+h.height})),AB_105779_BLENDE_FACES);
});

test("105779 purchased-kitchen PDF paints the worktop without artificial seams", () => {
  const crop={left:0,top:0,width:100,height:100};
  const order={kitchen:{slug},components:[{componentKey:"base-module-2",isLocked:false}]};
  const worktopOverlay=buildPurchasedKitchenOverlaySvg({order,hotspots:source.filter(h=>h.componentKey==="worktop"),crop,width:842,height:595}).toString("utf8");
  assert.match(worktopOverlay,/fill="rgba\(37,99,235,0\.26\)"/);
  assert.doesNotMatch(worktopOverlay,/stroke="rgba/);
  assert.equal((worktopOverlay.match(/stroke="none"/g)||[]).length,source.filter(h=>h.componentKey==="worktop").length);
  const cabinetOverlay=buildPurchasedKitchenOverlaySvg({order,hotspots:source.filter(h=>h.componentKey==="base-module-2"),crop,width:842,height:595}).toString("utf8");
  assert.match(cabinetOverlay,/stroke="rgba\(42,145,85,1\)"/);
});
