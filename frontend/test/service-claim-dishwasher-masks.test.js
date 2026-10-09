import assert from 'node:assert/strict';
import test from 'node:test';
import {SERVICE_CLAIM_DISHWASHER_MASK_SLUGS,getServiceClaimDishwasherMask,buildServiceClaimDishwasherSvgOverlay} from '../lib/service-claim-dishwasher-masks.js';
import {PLAN_HOTSPOTS_BY_SLUG} from '../lib/kitchen-plan-preview-data.js';
import {prepareKitchenPlanGeometry} from '../lib/kitchen-plan-geometry.js';
import {buildServiceClaimPartHotspots} from '../lib/service-claim-kitchen-hotspots.js';
import {cropClaimPlanHotspot,resolveSelectedClaimPlanHotspots,buildKitchenPreviewSvgMarkup} from '../lib/claim-kitchen-preview.js';

for(const slug of SERVICE_CLAIM_DISHWASHER_MASK_SLUGS){
 const mask=getServiceClaimDishwasherMask(slug);
 if(mask.svgOverlay)continue;
 test(slug+' ASC/email keep basket and GS separate from the complete furniture front',()=>{
  const source=prepareKitchenPlanGeometry(PLAN_HOTSPOTS_BY_SLUG[slug],slug);
  const parts=['dishwasher','furniture-front'].map(partKey=>({partKey,sourceComponentKey:mask.sourceComponentKey}));
  for(const crop of [{left:0,top:0,width:100,height:100},{left:6,top:4,width:85,height:90}]){
   const cropped=source.map(h=>cropClaimPlanHotspot(h,crop));
   const hotspots=buildServiceClaimPartHotspots(cropped,parts,slug);
   for(const [partKey,count] of [['dishwasher',2],['furniture-front',1]]){
    const selected=resolveSelectedClaimPlanHotspots({selectedAreas:[{componentId:'component-claim-'+partKey}],claimHotspots:hotspots,sourceHotspots:cropped});
    assert.equal(selected.length,count,partKey+' count');
    assert.ok(selected.every(h=>h.claimPartKey===partKey));
    if(partKey==='dishwasher'){
     assert.equal(selected[0].claimDishwasherDetailKey,'dishwasher-basket');
     assert.equal(selected[1].claimDishwasherDetailKey,'dishwasher-gs-mark');
     assert.ok(selected[0].clipPath.split(',').length>4,'basket follows its contour');
    }
   }
  }
 });
}
test('legacy CAD uses identical ASC/email dishwasher overlay for all old slugs',()=>{
 for(const slug of SERVICE_CLAIM_DISHWASHER_MASK_SLUGS.filter(s=>getServiceClaimDishwasherMask(s).svgOverlay)){
  const svg='<svg width="800" height="600"></svg>';
  for(const part of ['dishwasher','furniture-front']){
   const ids=['component-claim-'+part];
   const overlay=buildServiceClaimDishwasherSvgOverlay({kitchenSlug:slug,selectedComponentIds:ids});
   const email=buildKitchenPreviewSvgMarkup({svgMarkup:svg,kitchenSlug:slug,selectedComponentIds:ids});
   assert.ok(email.includes(overlay));
   assert.match(overlay,/dishwasher/);
   assert.match(overlay,/>GS</);
  }
 }
});
