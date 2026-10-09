import assert from 'node:assert/strict';
import test from 'node:test';
import { AB_105803_HOTSPOTS, AB_105803_SINK_POINTS, AB_105803_COOKTOP_POINTS } from '../lib/ab-105803-plan.js';
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG } from '../lib/kitchen-plan-preview-data.js';
import { prepareKitchenPlanGeometry } from '../lib/kitchen-plan-geometry.js';
import { buildServiceClaimBlendeHotspots, buildServiceClaimPartHotspots, isLShapedClaimKitchen } from '../lib/service-claim-kitchen-hotspots.js';
import { buildServiceClaimComponentChoiceGroups, resolveServiceClaimPlanDisplayComponentIds } from '../lib/service-claim-component-choices.js';
import { toggleLinkedComponentSelection } from '../components/kitchen-selection-utils.js';
import { loadKitchenSvgMarkup } from '../lib/load-kitchen-svg.js';

const contains = (points,[x,y]) => {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if(((yi>y)!==(yj>y)) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
};
const hits=(key,x,y)=>AB_105803_HOTSPOTS.some(h=>h.componentKey===key&&contains(h.points,[x/842*100,y/595*100]));

test('105803 owns its vector plan and all eleven supplier callouts',async()=>{
  assert.match(await loadKitchenSvgMarkup('ab-105803'),/viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG['ab-105803'],'/plans/670%20105803.svg');
  assert.equal(PLAN_HOTSPOTS_BY_SLUG['ab-105803'],AB_105803_HOTSPOTS);
  // Positions extracted from the white numbered text in the supplier PDF.
  for(const [key,x,y] of [
    ['oven-module',472.56,359.73],['worktop',410.27,313.96],['sink-base',228.66,378.49],
    ['base-module-1',173.88,428.01],['dishwasher-base',330.72,388.99],
    ['base-module-2',415.53,394.24],['end-blende',531.84,400.25],
    ['refrigerator',590.38,319.21],['wall-cabinet-1',410.27,141.39],
    ['wall-cabinet-2',461.83,141.39],['wall-cabinet-3',518.26,157.89],
  ]) assert.ok(hits(key,x,y),key);
  assert.deepEqual(prepareKitchenPlanGeometry(AB_105803_HOTSPOTS,'ab-105803').map(h=>h.points),AB_105803_HOTSPOTS.map(h=>h.points));
});

test('105803 fillers follow their supplier packages without crossing adjacent fronts',()=>{
  for(const [key,x,y] of [
    ['base-module-1',144,420],['base-module-2',402,420],
    ['dishwasher-base',387,420],['dishwasher-base',394,420],
    ['wall-cabinet-1',360,145],['end-blende',535,430],
  ]) assert.ok(hits(key,x,y),key);
  assert.ok(hits('worktop',382,420));
  assert.ok(!hits('dishwasher-base',382,420));
  assert.ok(hits('worktop',551,430));
  assert.ok(!hits('end-blende',551,430));
  assert.ok(!hits('wall-cabinet-3',590,319),'hood cabinet cannot paint over the refrigerator');
  assert.ok(!hits('worktop',65,440),'left side panel starts at the drawn inset edge');
  assert.ok(hits('worktop',90,440));
});

test('105803 claims use the exact fixtures, oven split and physical worktop seam',()=>{
  assert.ok(isLShapedClaimKitchen('ab-105803'));
  const parts=[
    ...['sink','faucet'].map(partKey=>({partKey,sourceComponentKey:'sink-faucet'})),
    ...['oven','oven-drawer','cooktop'].map(partKey=>({partKey,sourceComponentKey:'oven-module'})),
    ...['worktop-left','worktop-right','worktop-end-panel','worktop-end-panel-left'].map(partKey=>({partKey,sourceComponentKey:'worktop'})),
  ];
  const result=buildServiceClaimPartHotspots(AB_105803_HOTSPOTS,parts,'ab-105803');
  for(const p of parts) assert.ok(result.some(h=>h.claimPartKey===p.partKey),p.partKey);
  assert.deepEqual(result.find(h=>h.claimPartKey==='sink').points,AB_105803_SINK_POINTS);
  assert.deepEqual(result.find(h=>h.claimPartKey==='cooktop').points,AB_105803_COOKTOP_POINTS);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-left').length,2);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-right').length,2);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-end-panel-left').length,3);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-end-panel').length,1);
});

test('105803 linked hood toggles its cabinet while defaults stay selected',()=>{
  const locked=['component-oven-module','component-worktop','component-sink-base','component-sink-faucet'];
  const selected=toggleLinkedComponentSelection('ab-105803',locked,'component-extractor-hood',locked);
  assert.ok(selected.includes('component-wall-cabinet-3'));
  assert.deepEqual(toggleLinkedComponentSelection('ab-105803',selected,'component-wall-cabinet-3',locked),locked);
});

test('105803 ASC dropdown assigns both corner filler faces to UPEF65',()=>{
  const dishwasher={componentId:'component-claim-dishwasher',componentKey:'claim-dishwasher',sourceComponentKey:'dishwasher-base',claimPartKey:'dishwasher'};
  const blende={componentId:'component-claim-blende-dishwasher-base',componentKey:'claim-blende-dishwasher-base',sourceComponentKey:'dishwasher-base',claimPartKey:'blende',isCompanionOption:true,isPlanSelectableCompanion:true};
  const groups=buildServiceClaimComponentChoiceGroups([dishwasher,blende]);
  const prepared=prepareKitchenPlanGeometry(AB_105803_HOTSPOTS,'ab-105803');
  const split=buildServiceClaimBlendeHotspots(prepared,[blende],[],'ab-105803');
  const result=buildServiceClaimPartHotspots(split,[{partKey:'dishwasher',sourceComponentKey:'dishwasher-base'}],'ab-105803');
  const painted=(option,x,y)=>{
    const selected=resolveServiceClaimPlanDisplayComponentIds([dishwasher.componentId],groups,{'dishwasher-base':[option.componentId]});
    return result.filter(h=>selected.includes(h.componentId || ('component-'+h.componentKey)) && contains(h.points,[x/842*100,y/595*100]));
  };
  for(const x of [387,394]) {
    assert.equal(painted(blende,x,420).length,1,'corner face belongs to filler');
    assert.equal(painted(dishwasher,x,420).length,0,'dishwasher must exclude corner filler');
  }
  assert.equal(painted(blende,330,420).length,0);
  assert.equal(painted(dishwasher,330,420).length,1);
  assert.equal(painted(blende,382,420).length,0,'adjacent worktop panel remains separate');
  assert.equal(result.filter(h=>h.componentId===blende.componentId).length,2);
});
