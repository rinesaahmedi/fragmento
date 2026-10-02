import nextEnv from '@next/env';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
// Match Next's extensionless local-module resolution for the standalone audit.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.js`, context);
    throw error;
  }
} });
nextEnv.loadEnvConfig(process.cwd());
const { prisma } = await import('../lib/prisma.js');
const { getServiceClaimKitchenPlan } = await import('../lib/service-claim-kitchen-plan.js');
const { renderClaimKitchenPreviewPng } = await import('../lib/claim-kitchen-preview.js');
const { getKitchenBySlug, serializeKitchenForLegacy } = await import('../lib/catalog.js');
try {
  const config = serializeKitchenForLegacy(await getKitchenBySlug('ab-104332'));
  assert.ok(config.components.filter(item => item.isLocked).every(item => item.price === 0), 'serialized DEFAULT prices');
  assert.equal(config.components.find(item => item.componentKey === 'base-module-1').depthMm, 600);
  assert.equal(config.components.filter(item => !item.isLocked).length, 4);
  const plan = await getServiceClaimKitchenPlan('670104332');
  assert.equal(plan?.kitchenSlug, 'ab-104332');
  assert.match(plan.svgMarkup, /viewBox="0 0 842 595"/);
  const choices = plan.selectableComponents;
  assert.ok(choices.some(item => item.componentId === 'component-claim-oven-set'));
  assert.ok(choices.some(item => item.articleCode === 'GI88214-01'));
  assert.ok(!choices.some(item => item.componentId === 'component-refrigerator'));
  for (const [name, ids] of [
    ['housing', ['component-fridge-cabinet']],
    ['cooker', ['component-claim-oven-set']],
    ['sink', ['component-claim-sink']],
    ['faucet', ['component-claim-faucet']],
    ['worktop-left', ['component-claim-worktop-left']],
    ['worktop-right', ['component-claim-worktop-right']],
    ['dishwasher-front', ['component-dishwasher-front']],
  ]) {
    const selectedAreas = ids.map(id => choices.find(item => item.componentId === id));
    assert.ok(selectedAreas.every(Boolean), name);
    const image = await renderClaimKitchenPreviewPng({ kitchenSlug: plan.kitchenSlug, selectedAreas, contractNumber: '670104332', width: 1200 });
    assert.ok(image?.content, name);
    writeFileSync(`../tmp/104332-claim-${name}.png`, image.content);
  }
  console.log(JSON.stringify({ slug: plan.kitchenSlug, selectable: choices.map(item => ({ id: item.componentId, article: item.articleCode })), previews: 7 }));
} finally { await prisma.$disconnect(); }
