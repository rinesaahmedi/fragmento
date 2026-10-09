import assert from 'node:assert/strict';
import test from 'node:test';
import {PLAN_HOTSPOTS_BY_SLUG,PLAN_IMAGE_BY_SLUG} from '../lib/kitchen-plan-preview-data.js';
import {shouldHideComponentFromSelectionSummary} from '../components/kitchen-selection-utils.js';
import {buildServiceClaimSelectableComponents} from '../lib/service-claim-kitchen-plan-selection.js';
import {buildServiceClaimComponentChoiceGroups,resolveServiceClaimPlanDisplayComponentIds} from '../lib/service-claim-component-choices.js';

test('105796, 105799 and 105802 own equal geometry and both ASC worktop groups',()=>{
  const source=PLAN_HOTSPOTS_BY_SLUG['ab-105793'];
  const seen=new Set([source]);
  for(const code of ['105796','105799','105802']) {
    const slug='ab-'+code,hotspots=PLAN_HOTSPOTS_BY_SLUG[slug];
    assert.deepEqual(hotspots,source);
    assert.ok(!seen.has(hotspots));seen.add(hotspots);
    for(let i=0;i<hotspots.length;i++) assert.notEqual(hotspots[i].points,source[i].points);
    assert.equal(PLAN_IMAGE_BY_SLUG[slug],`/plans/AB%20${code}.svg`);
    assert.equal(shouldHideComponentFromSelectionSummary(slug,{code:`TOP-AB${code}-SECONDARY`}),true);
    assert.equal(shouldHideComponentFromSelectionSummary(slug,{code:`TOP-AB${code}`}),false);
    const items=[{code:`TOP-AB${code}`,componentKey:'worktop',itemType:'COMPONENT',isLocked:true},{code:`TOP-AB${code}-SECONDARY`,componentKey:'worktop-secondary',itemType:'COMPONENT',isLocked:true}];
    const claimParts=[
      ...['worktop-left','worktop-end-panel'].map(partKey=>({partKey,sourceKitchenItemCode:items[0].code,sourceComponentKey:'worktop'})),
      ...['worktop-right','worktop-end-panel-right'].map(partKey=>({partKey,sourceKitchenItemCode:items[1].code,sourceComponentKey:'worktop-secondary'})),
    ];
    const plan=buildServiceClaimSelectableComponents({kitchen:{items},kitchenConfig:{components:items},kitchenSlug:slug,claimParts});
    const groups=buildServiceClaimComponentChoiceGroups(plan.selectableComponents);
    for(const [worktop,panel] of [['worktop-left','worktop-end-panel'],['worktop-right','worktop-end-panel-right']]) {
      const ids=[`component-claim-${worktop}`,`component-claim-${panel}`];
      assert.deepEqual(groups.find(g=>g.triggerComponentId===ids[0]).options.map(o=>o.componentId),ids);
      assert.deepEqual(resolveServiceClaimPlanDisplayComponentIds([ids[0]],groups),ids);
    }
  }
});
