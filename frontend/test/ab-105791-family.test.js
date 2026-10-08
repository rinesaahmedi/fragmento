import assert from 'node:assert/strict';
import test from 'node:test';
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG } from '../lib/kitchen-plan-preview-data.js';
import { buildServiceClaimSelectableComponents } from '../lib/service-claim-kitchen-plan-selection.js';
import { buildServiceClaimComponentChoiceGroups, resolveServiceClaimPlanDisplayComponentIds } from '../lib/service-claim-component-choices.js';

test('105794, 105797 and 105800 own their geometry and retain independent ASC worktop groups', () => {
  const source = PLAN_HOTSPOTS_BY_SLUG['ab-105791'];
  for (const code of ['105794','105797','105800']) {
    const slug = `ab-${code}`;
    const hotspots = PLAN_HOTSPOTS_BY_SLUG[slug];
    assert.deepEqual(hotspots,source);
    assert.notEqual(hotspots,source);
    assert.notEqual(hotspots[0].points,source[0].points);
    assert.equal(PLAN_IMAGE_BY_SLUG[slug],`/plans/670%20${code}.svg`);
    const items = [{code:`TOP-AB${code}`,componentKey:'worktop',itemType:'COMPONENT',isLocked:true}];
    const claimParts = ['worktop-left','worktop-right','worktop-end-panel','worktop-end-panel-left'].map(partKey=>({
      partKey,sourceKitchenItemCode:`TOP-AB${code}`,sourceComponentKey:'worktop',
    }));
    const plan = buildServiceClaimSelectableComponents({kitchen:{items},kitchenConfig:{components:items},kitchenSlug:slug,claimParts});
    const groups = buildServiceClaimComponentChoiceGroups(plan.selectableComponents);
    for (const [worktop,panel] of [['worktop-left','worktop-end-panel-left'],['worktop-right','worktop-end-panel']]) {
      const triggerId = `component-claim-${worktop}`, panelId = `component-claim-${panel}`;
      const group = groups.find(g=>g.triggerComponentId===triggerId);
      assert.deepEqual(group.options.map(o=>o.componentId),[triggerId,panelId]);
      assert.deepEqual(resolveServiceClaimPlanDisplayComponentIds([triggerId],groups),[triggerId,panelId]);
      assert.deepEqual(resolveServiceClaimPlanDisplayComponentIds([triggerId],groups,{[group.sourceComponentKey]:[panelId]}),[panelId]);
    }
  }
});
