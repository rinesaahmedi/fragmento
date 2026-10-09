import assert from 'node:assert/strict';
import test from 'node:test';
import {AB_105802_HOTSPOTS,AB_105802_OVEN_PART_POINTS,AB_105802_COOKTOP_POINTS} from '../lib/ab-105802-plan.js';
import {PLAN_HOTSPOTS_BY_SLUG,PLAN_IMAGE_BY_SLUG} from '../lib/kitchen-plan-preview-data.js';
import {buildServiceClaimPartHotspots,isLShapedClaimKitchen} from '../lib/service-claim-kitchen-hotspots.js';
import {toggleLinkedComponentSelection} from '../components/kitchen-selection-utils.js';
import {loadKitchenSvgMarkup} from '../lib/load-kitchen-svg.js';
import {prepareKitchenPlanGeometry} from '../lib/kitchen-plan-geometry.js';
import {PDFDocument} from 'pdf-lib';
import {loadKitchenPlanPreviewData,generatePurchasedKitchenPdf,buildOrderConfirmationAttachmentLabels} from '../lib/email/order-notifications.js';
const contains=(points,[x,y])=>{
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if(((yi>y)!==(yj>y))&&x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
};
const hits=(key,x,y)=>AB_105802_HOTSPOTS.some(h=>h.componentKey===key&&contains(h.points,[x/842*100,y/595*100]));
test('105802 own vector plan covers all 17 supplier rows in both elevations',async()=>{
  assert.match(await loadKitchenSvgMarkup('ab-105802'),/viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG['ab-105802'],'/plans/AB%20105802.svg');
  assert.equal(PLAN_HOTSPOTS_BY_SLUG['ab-105802'],AB_105802_HOTSPOTS);
  for(const [key,x,y] of [
    ['oven-module',180.64,384.49],['worktop',145.36,362],['sink-base',655.67,415.25],
    ['base-module-1',34.3,420.5],['base-module-2',98.09,420.5],['base-module-3',287.95,431.01],
    ['refrigerator',392.26,354.48],['dishwasher-base',573.87,415.25],['base-module-4',759.23,431.01],
    ['wall-cabinet-1',50.59,203.66],['wall-cabinet-2',100.87,192.41],['wall-cabinet-3',216.44,203.66],
    ['wall-cabinet-4',290.73,203.66],['wall-cabinet-5',561.64,208.92],['wall-cabinet-6',663.7,203.66],
    ['wall-cabinet-7',767.26,203.66],['worktop-secondary',607.42,362],
  ]) assert.ok(hits(key,x,y),key);
});
test('105802 fillers follow their cabinet and worktop panels exclude neighbours',()=>{
  for(const [key,x,y] of [['base-module-1',8,450],['base-module-4',825,450],['wall-cabinet-1',8,200],['wall-cabinet-7',825,200]]) assert.ok(hits(key,x,y),key);
  assert.ok(hits('worktop',341,450));
  assert.ok(!hits('base-module-3',341,450));
  assert.ok(hits('worktop-secondary',524,450));
  assert.ok(!hits('dishwasher-base',524,450));
});
test('105802 ASC separates both worktops, panels and measured appliance parts',()=>{
  assert.equal(isLShapedClaimKitchen('ab-105802'),false);
  const parts=[
    ...['sink','faucet'].map(partKey=>({partKey,sourceComponentKey:'sink-faucet'})),
    ...['oven','oven-drawer','cooktop'].map(partKey=>({partKey,sourceComponentKey:'oven-module'})),
    ...['worktop-left','worktop-end-panel'].map(partKey=>({partKey,sourceComponentKey:'worktop'})),
    ...['worktop-right','worktop-end-panel-right'].map(partKey=>({partKey,sourceComponentKey:'worktop-secondary'})),
  ];
  const result=buildServiceClaimPartHotspots(prepareKitchenPlanGeometry(AB_105802_HOTSPOTS,'ab-105802'),parts,'ab-105802');
  for(const p of parts) assert.ok(result.some(h=>h.claimPartKey===p.partKey),p.partKey);
  for(const [key,points] of Object.entries({...AB_105802_OVEN_PART_POINTS,cooktop:AB_105802_COOKTOP_POINTS})) {
    const actual=result.find(h=>h.claimPartKey===key),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    for(const [field,expected] of Object.entries({left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)})) assert.ok(Math.abs(actual[field]-expected)<0.02,`${key} ${field}`);
  }
  const sink=result.find(h=>h.claimPartKey==='sink');
  assert.ok(Math.abs(sink.left-629.04/842*100)<0.02);
  assert.ok(Math.abs(sink.top-359.44/595*100)<0.02);
  assert.ok(Math.abs(sink.height-6.96/595*100)<0.02);
});
test('105802 hood LEDs select with its cabinet and leave all five defaults locked',()=>{
  const fixed=['component-oven-module','component-worktop','component-worktop-secondary','component-sink-base','component-sink-faucet'];
  const selected=toggleLinkedComponentSelection('ab-105802',fixed,'component-extractor-hood',fixed);
  assert.ok(selected.includes('component-wall-cabinet-3'));
  assert.equal(AB_105802_HOTSPOTS.filter(h=>h.componentKey==='extractor-hood').length,3);
  assert.deepEqual(toggleLinkedComponentSelection('ab-105802',selected,'component-wall-cabinet-3',fixed),fixed);
});
test('105802 order attachment uses its own plan and both worktops',async()=>{
  const preview=await loadKitchenPlanPreviewData();
  assert.equal(preview.imageViews['ab-105802'],PLAN_IMAGE_BY_SLUG['ab-105802']);
  assert.equal(preview.hotspotsBySlug['ab-105802'].length,AB_105802_HOTSPOTS.length-1);
  assert.ok(!preview.hotspotsBySlug['ab-105802'].some(h=>h.claimFurniturePartKey==='worktop-end-panel-right'));
  const order={
    id:'preview-105802',orderNumber:'670105802-preview',createdAt:'2026-10-08T08:00:00Z',
    kitchen:{slug:'ab-105802',name:'105802'},customer:{contractNumber:'670105802'},
    components:[...new Set(AB_105802_HOTSPOTS.map(h=>h.componentKey))].filter(key=>key!=='extractor-hood').map(componentKey=>({componentKey,isLocked:['worktop','worktop-secondary','oven-module','sink-base','sink-faucet'].includes(componentKey)})),
  };
  assert.ok((await buildOrderConfirmationAttachmentLabels(order)).some(entry=>entry.key==='purchased-kitchen'));
  const attachment=await generatePurchasedKitchenPdf(order);
  const bytes=Buffer.from(attachment.base64,'base64');
  assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);
  assert.ok(bytes.length>20000);
});
