import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { ItemType } from '@prisma/client';
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG } from '../lib/kitchen-plan-preview-data.js';
import { prepareKitchenPlanGeometry, getPlanDisplayCrop, cropPlanHotspot } from '../lib/kitchen-plan-geometry.js';
import { buildServiceClaimPartHotspots, buildServiceClaimBlendeHotspots } from '../lib/service-claim-kitchen-hotspots.js';
import { buildServiceClaimSelectableComponents, getServiceClaimLinkedComponentIds } from '../lib/service-claim-kitchen-plan-selection.js';
import { getLinkedComponentIds, getLocalizedItemName, getProductInfoDocuments, shouldHideComponentFromSelectionSummary, isLinkedComponentSelected } from '../components/kitchen-selection-utils.js';
import { loadKitchenSvgMarkup } from '../lib/load-kitchen-svg.js';
import { serializeKitchenForLegacy } from '../lib/catalog.js';

const slug = 'ab-104332';
const seed = readFileSync(new URL('../prisma/seed.js', import.meta.url), 'utf8');
const helpers = seed.slice(seed.indexOf('const DEFAULT_KITCHEN_PROGRAMM_ID'), seed.indexOf('const PRODUCT_INFO_FILES'));
const declaration = seed.slice(seed.indexOf('const AB_104332_ITEMS = ['), seed.indexOf('// 670 101246:'));
const { items, articles, blenden } = JSON.parse(runInNewContext(`${helpers}\n${declaration}\nJSON.stringify({ items: AB_104332_ITEMS, articles: CATALOG_ARTICLES, blenden: CATALOG_BLENDEN })`, { ItemType }));
const components = items.filter(item => item.itemType === 'COMPONENT' && item.isActive !== false);
const faces = PLAN_HOTSPOTS_BY_SLUG[slug];
const claimParts = [
  { partKey: 'sink', articleCode: '526335', sourceComponentKey: 'sink-faucet' },
  { partKey: 'faucet', articleCode: '517720', sourceComponentKey: 'sink-faucet' },
  { partKey: 'sink-cabinet', articleCode: 'SPDT60', sourceComponentKey: 'sink-base' },
  { partKey: 'oven-set', articleCode: 'EHCX9330S-A', sourceComponentKey: 'oven-module' },
  { partKey: 'worktop-left', articleCode: 'AP60', sourceComponentKey: 'worktop' },
  { partKey: 'worktop-right', articleCode: 'AP60', sourceComponentKey: 'worktop' },
].map(part => ({ ...part, sourceKitchenItemCode: components.find(item => item.componentKey === part.sourceComponentKey).code }));

test('104332 maps twelve schedule rows and locks all eight DEFAULT rows', () => {
  const schedule = ['worktop','fridge-cabinet','base-module-1','oven-module','base-module-2','sink-base','dishwasher-front','drawer-module','wall-cabinet-1','wall-cabinet-2','wall-cabinet-3','wall-cabinet-4'];
  const expectedArticles = ['AP60','GI88214-01','US2A60','EHCX9330S-A','US2A60','SPDT60','TV60','UVADT20-01','H6072','FH664621E+FWK124+HFLH6072','H6072','H6072'];
  schedule.forEach((key, index) => {
    const item = components.find(item => item.componentKey === key);
    assert.ok(item, `NR ${index + 1}`);
    assert.equal(Boolean(item.isLocked), index < 8, `NR ${index + 1}`);
    assert.equal(item.articleNumber, expectedArticles[index]);
    assert.ok(getLocalizedItemName(item, (_key, fallback) => fallback, 'en', true).startsWith(`${index + 1}. `));
  });
  for (const article of ['UHS60','UPEV','UP10K']) {
    const item = components.find(item => item.articleNumber === article);
    assert.ok(item.isLocked);
    assert.ok(shouldHideComponentFromSelectionSummary(slug, item));
  }
  const optional = components.filter(item => !item.isLocked);
  assert.equal(optional.length, 4);
  assert.equal(optional.find(item => item.componentKey === 'wall-cabinet-4').blendeCode, 'HP2072K');
  assert.ok(components.filter(item => item.isLocked).every(item => Number(item.price) === 0));
  assert.match(seed, /slug: "ab-104332"[\s\S]*?programmId: "BURGER CINDY"[\s\S]*?items: AB_104332_ITEMS/);
});

test('supplier furniture and filler identities have explicit master links', () => {
  for (const item of components) {
    if (item.catalogBlendeCode) assert.ok(blenden.some(record => record.code === item.catalogBlendeCode), item.code);
    else if (!['H6072','FH664621E+FWK124+HFLH6072'].includes(item.catalogArticleNumber)) {
      assert.ok(articles.some(record => record.articleNumber === item.catalogArticleNumber), item.code);
    }
    assert.ok(faces.some(face => face.componentKey === item.componentKey), item.code);
  }
  assert.deepEqual(getLinkedComponentIds(slug, 'component-extractor-hood'), ['component-wall-cabinet-2','component-extractor-hood','component-under-cabinet-light']);
  for (const key of ['fridge-cabinet','dishwasher-front']) {
    assert.deepEqual(getProductInfoDocuments(components.find(item => item.componentKey === key)), []);
  }
});

test('both PDF LED symbols toggle with the hood package in FRG and ASC', () => {
  const group = ['component-wall-cabinet-2','component-extractor-hood','component-under-cabinet-light'];
  for (const id of group) {
    assert.deepEqual(getLinkedComponentIds(slug, id), group);
    assert.deepEqual(getServiceClaimLinkedComponentIds(slug, id), group);
    assert.equal(isLinkedComponentSelected(slug, ['component-wall-cabinet-2'], id), true);
    assert.equal(isLinkedComponentSelected(slug, [], id), false);
  }
  const lightFaces = faces.filter(face => face.componentKey === 'under-cabinet-light');
  assert.equal(lightFaces.length, 2);
  const prepared = prepareKitchenPlanGeometry(faces, slug, components);
  assert.equal(prepared.filter(face => face.componentKey === 'under-cabinet-light').length, 2);
  for (const face of lightFaces) assert.ok(face.preserveManualSize && face.points.length === 6);
  const selected = buildServiceClaimSelectableComponents({ kitchen: { items: components }, kitchenConfig: { components }, kitchenSlug: slug, confirmedItems: components.filter(item => !item.isLocked), claimParts });
  assert.ok(selected.selectableComponentIds.includes('component-under-cabinet-light'));
});

test('DEFAULT prices stay zero when a shared Burger article is priced for optional orders', () => {
  const seeded = components.filter(item => item.isLocked).map(item => ({
    ...item, catalogArticleId: 'shared-article',
    catalogArticle: { articleNumber: item.articleNumber, price: 347, programPrices: [{ price: 461 }], widthMm: item.widthMm, heightMm: null, depthMm: null },
  }));
  const result = serializeKitchenForLegacy({ slug, programmId: 'BURGER CINDY', items: seeded });
  assert.ok(result.components.every(item => item.price === 0));
  const drawer = result.components.find(item => item.componentKey === 'base-module-1');
  assert.equal(drawer.widthMm, 600);
  assert.equal(drawer.depthMm, null, 'blank catalog dimensions remain omitted');
  const optional = serializeKitchenForLegacy({ slug, programmId: 'BURGER CINDY', items: [{ ...seeded.find(item => item.componentKey === 'base-module-1'), isLocked: false, catalogPriceSyncMode: 'AUTO' }] });
  assert.equal(optional.components[0].price, 461);
});

test('linked upper cabinets in 104296 and 104332 use catalog dimensions, including nulls', () => {
  const masters = [
    { articleNumber: 'H6072', widthMm: 600, heightMm: 723, depthMm: null },
    { articleNumber: 'H3072', widthMm: 300, heightMm: 723, depthMm: null },
    { articleNumber: 'FH664621E+FWK124+HFLH6072', widthMm: 600, heightMm: null, depthMm: null },
  ];
  for (const kitchenSlug of ['ab-104296', 'ab-104332']) {
    const kitchenItems = masters.map((master, index) => ({
      itemType: 'COMPONENT', code: `upper-${index}`, componentKey: `wall-cabinet-${index + 1}`,
      widthMm: 600, heightMm: 720, depthMm: 340, price: 146,
      catalogArticleId: `catalog-${index}`, catalogArticle: master,
    }));
    const result = serializeKitchenForLegacy({ slug: kitchenSlug, programmId: 'BURGER CINDY', items: kitchenItems });
    for (let index = 0; index < masters.length; index++) {
      for (const dimension of ['widthMm', 'heightMm', 'depthMm']) {
        assert.equal(result.components[index][dimension], masters[index][dimension], `${kitchenSlug}: ${dimension}`);
      }
    }
    const unlinked = serializeKitchenForLegacy({ slug: kitchenSlug, items: [{ ...kitchenItems[0], catalogArticleId: null, catalogArticle: null }] });
    assert.equal(unlinked.components[0].depthMm, 340, 'unlinked rows retain their own dimensions');
  }
  const seededUpperCabinets = components.filter(item => item.componentKey.startsWith('wall-cabinet-'));
  assert.ok(seededUpperCabinets.every(item => item.depthMm === null));
  assert.equal(seededUpperCabinets.find(item => item.iconKey === 'hood_wall_cabinet').heightMm, null);
  assert.ok(seededUpperCabinets.filter(item => item.articleNumber === 'H6072').every(item => item.heightMm === 723));
});

test('the source SVG and perspective polygons share the original PDF coordinates', async () => {
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], '/plans/670%20104332.svg');
  const svg = await loadKitchenSvgMarkup(slug);
  assert.match(svg, /viewBox="0 0 842 595"/);
  assert.ok(faces.every(face => face.points?.length >= 3 && face.preserveManualSize));
  const oven = faces.find(face => face.componentKey === 'oven-module');
  const cabinet = faces.find(face => face.componentKey === 'oven-cabinet');
  assert.deepEqual(oven.points.slice(2), [cabinet.points[1], cabinet.points[0]]);
  const tall = faces.filter(face => face.componentKey === 'fridge-cabinet').slice(4,8);
  for (let i = 1; i < tall.length; i++) assert.deepEqual(tall[i-1].points.slice(2), [tall[i].points[1], tall[i].points[0]]);
});

test('ASC preserves independent sink/faucet, both worktops and one cooker set after cropping', () => {
  const geometry = prepareKitchenPlanGeometry(faces, slug, components);
  const crop = getPlanDisplayCrop(geometry, slug);
  const cropped = geometry.map(face => cropPlanHotspot(face, crop));
  const claims = buildServiceClaimPartHotspots(cropped, claimParts, slug);
  for (const part of ['sink','faucet']) {
    assert.deepEqual(claims.filter(face => face.claimPartKey === part).map(face => face.points), cropped.filter(face => face.claimFixturePartKey === part).map(face => face.points));
  }
  assert.deepEqual(claims.filter(face => face.claimPartKey?.startsWith('worktop-')).map(face => face.points), cropped.filter(face => face.componentKey === 'worktop').map(face => face.points));
  assert.deepEqual(claims.filter(face => face.claimPartKey === 'oven-set').map(face => face.points), cropped.filter(face => face.componentKey === 'oven-module').map(face => face.points));
  const selection = buildServiceClaimSelectableComponents({ kitchen: { items: components }, kitchenConfig: { components }, kitchenSlug: slug, confirmedItems: components.filter(item => !item.isLocked), claimParts });
  assert.ok(selection.selectableComponentIds.includes('component-claim-oven-set'));
  for (const id of ['component-refrigerator','component-dishwasher-base','component-claim-cooktop']) assert.ok(!selection.selectableComponentIds.includes(id));
  const blendeFaces = buildServiceClaimBlendeHotspots(faces, selection.selectableComponents, components, slug).filter(face => face.claimPartKey === 'blende');
  assert.equal(blendeFaces.length, 2);
});

// Reproducible PDF overlay input; enable only for visual QA.
if (process.env.EXPORT_104332_GEOMETRY) writeFileSync(new URL('../../tmp/104332-hotspots.json', import.meta.url), JSON.stringify(faces));
