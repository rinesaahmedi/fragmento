import assert from 'node:assert/strict';
import test from 'node:test';
import {PLAN_HOTSPOTS_BY_SLUG,PLAN_IMAGE_BY_SLUG} from '../lib/kitchen-plan-preview-data.js';
import {buildServiceClaimSelectableComponents} from '../lib/service-claim-kitchen-plan-selection.js';
import {buildServiceClaimComponentChoiceGroups,resolveServiceClaimPlanDisplayComponentIds} from '../lib/service-claim-component-choices.js';

test('105795, 105798 and 105801 own equal geometry and independent ASC worktop groups',()=>{
  const source=PLAN_HOTSPOTS_BY_SLUG['ab-105792'];
  for(const code of ['105795','105798','105801']) {
    const slug='ab-'+code,hotspots=PLAN_HOTSPOTS_BY_SLUG[slug];
    assert.deepEqual(hotspots,source);
    assert.notEqual(hotspots,source);
    for(let i=0;i<hotspots.length;i++) assert.notEqual(hotspots[i].points,source[i].points);
    assert.equal(hotspots.filter(h=>h.componentKey==='extractor-hood').length,3,'hood includes both LED cones');
    assert.equal(PLAN_IMAGE_BY_SLUG[slug],`/plans/670%20${code}.svg`);
    const items=[{code:`TOP-AB${code}`,componentKey:'worktop',itemType:'COMPONENT',isLocked:true}];
    const plan=buildServiceClaimSelectableComponents({kitchen:{items},kitchenConfig:{components:items},kitchenSlug:slug,claimParts:[{partKey:'worktop-end-panel',sourceKitchenItemCode:`TOP-AB${code}`,sourceComponentKey:'worktop'}]});
    const groups=buildServiceClaimComponentChoiceGroups(plan.selectableComponents);
    const group=groups.find(g=>g.triggerComponentId==='component-worktop');
    assert.ok(group);
    assert.deepEqual(group.options.map(o=>o.componentId),['component-worktop','component-claim-worktop-end-panel']);
    assert.deepEqual(resolveServiceClaimPlanDisplayComponentIds(['component-worktop'],groups),['component-worktop','component-claim-worktop-end-panel']);
  }
});
