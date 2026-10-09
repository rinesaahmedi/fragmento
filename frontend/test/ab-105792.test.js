import assert from 'node:assert/strict';
import test from 'node:test';
import {AB_105792_HOTSPOTS,AB_105792_OVEN_PART_POINTS,AB_105792_COOKTOP_POINTS} from '../lib/ab-105792-plan.js';
import {PLAN_HOTSPOTS_BY_SLUG,PLAN_IMAGE_BY_SLUG} from '../lib/kitchen-plan-preview-data.js';
import {buildServiceClaimPartHotspots,isLShapedClaimKitchen} from '../lib/service-claim-kitchen-hotspots.js';
import {toggleLinkedComponentSelection} from '../components/kitchen-selection-utils.js';
import {loadKitchenSvgMarkup} from '../lib/load-kitchen-svg.js';
import {prepareKitchenPlanGeometry} from '../lib/kitchen-plan-geometry.js';
const contains = (points,[x,y]) => {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if(((yi>y)!==(yj>y))&&x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
};
const hits=(key,x,y)=>AB_105792_HOTSPOTS.some(h=>h.componentKey===key&&contains(h.points,[x/842*100,y/595*100]));
test('105792 uses its own vector plan and measured supplier callouts',async()=>{
  assert.match(await loadKitchenSvgMarkup('ab-105792'),/viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG['ab-105792'],'/plans/670%20105792.svg');
  assert.equal(PLAN_HOTSPOTS_BY_SLUG['ab-105792'],AB_105792_HOTSPOTS);
  for(const [key,x,y] of [
    ['oven-module',486.07,404.75],['worktop',387,382],['sink-base',240.67,455.02],
    ['sink-end-blende',179.89,432.51],['dishwasher-base',356.99,428.01],['base-module-1',609.14,473.03],
    ['wall-cabinet-1',240.67,166.15],['wall-cabinet-2',375,160.14],
    ['wall-cabinet-3',486.07,166.15],['wall-cabinet-4',588.66,166.15],
  ]) assert.ok(hits(key,x,y),key);
  assert.ok(!hits('sink-base',179.89,432.51),'optional UPK20 is independent of the locked SP50');
  assert.ok(!hits('base-module-1',653,450),'US40 excludes the thin worktop side panel');
  assert.ok(hits('worktop',653,450));
});
test('105792 remains linear with exact oven/drawer seam and independent ASC parts',()=>{
  assert.equal(isLShapedClaimKitchen('ab-105792'),false);
  const parts=[
    ...['sink','faucet'].map(partKey=>({partKey,sourceComponentKey:'sink-faucet'})),
    ...['oven','oven-drawer','cooktop'].map(partKey=>({partKey,sourceComponentKey:'oven-module'})),
    {partKey:'worktop-end-panel',sourceComponentKey:'worktop'},
    {partKey:'blende-wall-cabinet-1',sourceComponentKey:'wall-cabinet-1'},
  ];
  const result=buildServiceClaimPartHotspots(prepareKitchenPlanGeometry(AB_105792_HOTSPOTS,'ab-105792'),parts,'ab-105792');
  for(const key of ['sink','faucet','oven','oven-drawer','cooktop','worktop-end-panel']) assert.ok(result.some(h=>h.claimPartKey===key),key);
  for(const [key,points] of Object.entries({...AB_105792_OVEN_PART_POINTS,cooktop:AB_105792_COOKTOP_POINTS})) {
    const actual=result.find(h=>h.claimPartKey===key),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    // The shared display geometry rounds source bounds to 0.01 percent.
    for(const [field,expected] of Object.entries({left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)})) assert.ok(Math.abs(actual[field]-expected)<0.02,`${key} ${field}`);
  }
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-end-panel').length,1);
  const sink=result.find(h=>h.claimPartKey==='sink');
  assert.ok(Math.abs(sink.top-377.68/595*100)<0.02);
  assert.ok(Math.abs(sink.height-9/595*100)<0.02);
});
test('105792 hood cabinet and extractor select together and preserve defaults',()=>{
  const fixed=['component-oven-module','component-worktop','component-sink-base','component-sink-faucet'];
  const selected=toggleLinkedComponentSelection('ab-105792',fixed,'component-extractor-hood',fixed);
  assert.ok(selected.includes('component-wall-cabinet-3'));
  assert.ok(selected.includes('component-extractor-hood'));
  assert.deepEqual(toggleLinkedComponentSelection('ab-105792',selected,'component-wall-cabinet-3',fixed),fixed);
});
