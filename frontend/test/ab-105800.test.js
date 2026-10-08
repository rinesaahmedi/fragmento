import assert from 'node:assert/strict';
import test from 'node:test';
import { AB_105800_HOTSPOTS, AB_105800_COOKTOP_POINTS, AB_105800_SINK_POINTS } from '../lib/ab-105800-plan.js';
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG } from '../lib/kitchen-plan-preview-data.js';
import { buildServiceClaimPartHotspots, isLShapedClaimKitchen } from '../lib/service-claim-kitchen-hotspots.js';
import { toggleLinkedComponentSelection } from '../components/kitchen-selection-utils.js';
import { loadKitchenSvgMarkup } from '../lib/load-kitchen-svg.js';

const contains = (points, [x,y]) => {
  let inside = false;
  for (let i=0,j=points.length-1; i<points.length; j=i++) {
    const [xi,yi]=points[i], [xj,yj]=points[j];
    if (((yi>y)!==(yj>y)) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
};
const hits = (key,x,y) => AB_105800_HOTSPOTS.some(h=>h.componentKey===key && contains(h.points,[x/842*100,y/595*100]));

test('105800 service plan loads the vector asset', async () => {
  const svg = await loadKitchenSvgMarkup('ab-105800');
  assert.match(svg, /<svg/);
  assert.match(svg, /viewBox="0 0 842 595"/);
});

test('105800 supplier callouts land on their own drawn components', () => {
  assert.equal(PLAN_IMAGE_BY_SLUG['ab-105800'], '/plans/670%20105800.svg');
  assert.equal(PLAN_HOTSPOTS_BY_SLUG['ab-105800'], AB_105800_HOTSPOTS);
  // Centres of the numbered supplier callouts extracted from the source PDF.
  for (const [key,x,y] of [
    ['oven-module',513,356],['worktop',263,339],['sink-base',415,394],
    ['base-module-1',147,444],['base-module-2',214,433],['dishwasher-base',319,394],
    ['base-module-3',566,422],['refrigerator',624,275],
    ['wall-cabinet-1',469,149],['wall-cabinet-2',554,132],['wall-cabinet-3',614,144],
  ]) assert.ok(hits(key,x,y),key);
  assert.ok(hits('wall-cabinet-1',435,150), 'HPK2002 belongs to row 9');
  assert.ok(!hits('wall-cabinet-3',624,275), 'hidden H3002 cannot cover refrigerator');
  assert.ok(!hits('dishwasher-base',400,430), 'dishwasher cannot cover sink cabinet');
  assert.ok(hits('worktop',595,440), 'vertical strip beside refrigerator belongs to worktop');
  assert.ok(!hits('base-module-3',595,440), 'US30 selection excludes the worktop strip');
  assert.ok(hits('base-module-3',580,440), 'US30 door remains selectable');
  assert.ok(!hits('worktop',580,440), 'worktop strip cannot cover US30 door');
});

test('105800 claims retain independent fixtures and physical worktop pieces', () => {
  assert.ok(isLShapedClaimKitchen('ab-105800'));
  const parts = [
    ...['sink','faucet'].map(partKey=>({partKey,sourceComponentKey:'sink-faucet'})),
    ...['oven','oven-drawer','cooktop'].map(partKey=>({partKey,sourceComponentKey:'oven-module'})),
    ...['worktop-left','worktop-right','worktop-end-panel','worktop-end-panel-left'].map(partKey=>({partKey,sourceComponentKey:'worktop'})),
  ];
  const result = buildServiceClaimPartHotspots(AB_105800_HOTSPOTS,parts,'ab-105800');
  for (const key of ['sink','faucet','oven','oven-drawer','cooktop','worktop-left','worktop-right','worktop-end-panel']) {
    assert.ok(result.some(h=>h.claimPartKey===key),key);
  }
  assert.deepEqual(result.find(h=>h.claimPartKey==='sink').points, AB_105800_SINK_POINTS);
  assert.ok(result.filter(h=>h.claimPartKey==='cooktop').every(h=>JSON.stringify(h.points)===JSON.stringify(AB_105800_COOKTOP_POINTS)));
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-left').length,2);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-end-panel-left').length,3);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-right').length,2);
  const rightStripFaces = result.filter(h=>h.points && contains(h.points,[595/842*100,440/595*100]));
  assert.equal(rightStripFaces.length,1);
  assert.equal(rightStripFaces[0].claimPartKey,'worktop-end-panel', 'Unterschrank-Wange selects the refrigerator side panel');
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-end-panel').length,1);
  for (const [x,y] of [[75,440],[117.5,440],[275,440]]) {
    const faces = result.filter(h=>h.points && contains(h.points,[x/842*100,y/595*100]));
    assert.equal(faces.length,1);
    assert.equal(faces[0].claimPartKey,'worktop-end-panel-left', 'left panels have a separate dropdown option');
  }
  assert.equal(result.filter(h=>h.claimPartKey==='oven').length,1);
  assert.equal(result.filter(h=>h.claimPartKey==='oven-drawer').length,1);
});

test('105800 hood faces toggle the package together while included items stay selected', () => {
  const locked=['component-oven-module','component-worktop','component-sink-base','component-sink-faucet'];
  const selected=toggleLinkedComponentSelection('ab-105800',locked,'component-extractor-hood',locked);
  assert.ok(selected.includes('component-wall-cabinet-2'));
  assert.ok(selected.includes('component-extractor-hood'));
  assert.deepEqual(toggleLinkedComponentSelection('ab-105800',selected,'component-wall-cabinet-2',locked),locked);
});

test('105800 ASC excludes the sink cabinet corner strip while retaining its door', () => {
  const parts = [{ partKey: 'sink-cabinet', sourceComponentKey: 'sink-base' }];
  for (const claimParts of [parts, []]) {
    const result = buildServiceClaimPartHotspots(AB_105800_HOTSPOTS, claimParts, 'ab-105800');
    const containsPdfPoint = (x,y) => result.some(h=>contains(h.points,[x/842*100,y/595*100]));
    assert.ok(!containsPdfPoint(466,420), 'corner strip is not selectable in ASC');
    assert.ok(containsPdfPoint(415,420), 'sink cabinet door remains selectable');
  }
  assert.ok(!hits('sink-base',466,420), 'order plan excludes the corner strip from the locked sink cabinet');
  assert.ok(hits('static-corner-blende',466,420), 'corner strip remains visual-only in the order plan');
  assert.ok(!hits('oven-module',473,420), 'oven selection excludes the other corner blende face');
  assert.ok(hits('static-corner-blende',473,420), 'other corner blende face remains visual-only');
  assert.ok(hits('oven-module',513,420), 'oven remains selected within its own outline');
});
