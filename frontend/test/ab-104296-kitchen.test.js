import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { ItemType } from '@prisma/client';
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG } from '../lib/kitchen-plan-preview-data.js';
import { prepareKitchenPlanGeometry, getPlanDisplayCrop, cropPlanHotspot } from '../lib/kitchen-plan-geometry.js';
import { buildServiceClaimPartHotspots, buildServiceClaimBlendeHotspots } from '../lib/service-claim-kitchen-hotspots.js';
import { buildServiceClaimSelectableComponents, getServiceClaimLinkedComponentIds } from '../lib/service-claim-kitchen-plan-selection.js';
import { getLinkedComponentIds, getLocalizedItemName, getProductInfoHref, getProductInfoDocuments, shouldHideComponentFromSelectionSummary } from '../components/kitchen-selection-utils.js';
import { deriveKitchenAppliances } from '../lib/contract-appliances.js';
import { isElectricalApplianceProblemArea } from '../lib/service-claim-serial-number.js';
import { getSerialNumberHelpApplianceType } from '../lib/serial-number-help.js';
import { loadKitchenSvgMarkup } from '../lib/load-kitchen-svg.js';
import { assertBurgerCindyArticleCode } from '../lib/burger-cindy-article-codes.cjs';

const slug = 'ab-104296';
const seed = readFileSync(new URL('../prisma/seed.js', import.meta.url), 'utf8');
// Evaluate the real supplier rows and catalog declarations without running the DB seed.
const seedHelpers = seed.slice(seed.indexOf('const DEFAULT_KITCHEN_PROGRAMM_ID'), seed.indexOf('const PRODUCT_INFO_FILES'));
const itemDeclaration = seed.slice(seed.indexOf('const AB_104296_HOUSING_CLAIM_PARTS'), seed.indexOf('const AB_101246_ITEMS'));
const burgerCatalogStart = seed.indexOf('  const articles = [', seed.indexOf('async function ensureBurgerCindyCatalogArticles'));
const burgerCatalogDeclaration = seed.slice(burgerCatalogStart, seed.indexOf('  for (const spec of articles)', burgerCatalogStart));
const { items, articles, blenden, services, housingClaimDefinitions } = JSON.parse(runInNewContext(
  `${seedHelpers}\n${itemDeclaration}\n${burgerCatalogDeclaration}\nJSON.stringify({ items: AB_104296_ITEMS, articles: [...CATALOG_ARTICLES, ...articles], blenden: CATALOG_BLENDEN, services: CATALOG_SERVICES, housingClaimDefinitions: AB_104296_HOUSING_CLAIM_PARTS })`, { ItemType },
));
const components = items.filter(item => item.itemType === 'COMPONENT' && item.isActive !== false);
const faces = PLAN_HOTSPOTS_BY_SLUG[slug];
const claimParts = [
  { partKey: 'sink', articleCode: '526335', sourceComponentKey: 'sink-faucet', sourceKitchenItemCode: 'FAUCET-AB104296' },
  { partKey: 'faucet', articleCode: '517720', sourceComponentKey: 'sink-faucet', sourceKitchenItemCode: 'FAUCET-AB104296' },
  { partKey: 'sink-cabinet', articleCode: 'SPDT60', sourceComponentKey: 'sink-base', sourceKitchenItemCode: 'SINK-BASE-AB104296-SPDT60-R' },
  { partKey: 'oven-set', articleCode: 'EHCX9330S-A', sourceComponentKey: 'oven-module', sourceKitchenItemCode: 'OVEN-AB104296-SET' },
  { partKey: 'worktop-left', sourceComponentKey: 'worktop', sourceKitchenItemCode: 'TOP-AB104296' },
  { partKey: 'worktop-right', sourceComponentKey: 'worktop', sourceKitchenItemCode: 'TOP-AB104296' },
  ...housingClaimDefinitions.map(part => {
    const source = components.find(item => item.componentKey === (part.sourceComponentKey || 'fridge-cabinet'));
    return { ...part, articleCode: source.articleNumber, sourceComponentKey: source.componentKey, sourceKitchenItemCode: source.code };
  }),
];
function selection(confirmed = []) {
  return buildServiceClaimSelectableComponents({
    kitchen: { items: components }, kitchenConfig: { components }, kitchenSlug: slug,
    confirmedItems: confirmed, claimParts,
  });
}

test('104296 maps all twelve Excel callouts and locks precisely the included furniture', () => {
  const expected = ['worktop','sink-base','dishwasher-front','oven-module','drawer-module','base-module-1','fridge-cabinet','wall-cabinet-1','wall-cabinet-2','wall-cabinet-3','wall-cabinet-4','wall-cabinet-5'];
  for (let nr = 1; nr <= 12; nr++) {
    const item = components.find(item => item.componentKey === expected[nr - 1]);
    assert.ok(item, `Excel row ${nr}`);
    assert.equal(Boolean(item.isLocked), nr <= 7);
    assert.ok(getLocalizedItemName(item, (_key, fallback) => fallback, 'en', true).startsWith(`${nr}. `));
  }
  assert.ok(components.find(item => item.articleNumber === 'UHS60').isLocked);
  assert.ok(components.find(item => item.articleNumber === 'UPE65').isLocked);
  assert.match(seed, /slug: "ab-104296"[\s\S]*?kitchenCode: "104 296"[\s\S]*?items: AB_104296_ITEMS/);
});

test('every 104296 component, accessory, helper and service resolves to master catalog data', () => {
  for (const item of items) {
    assert.doesNotThrow(() => assertBurgerCindyArticleCode(item.catalogArticleNumber || item.articleNumber, 'BURGER CINDY'), item.code);
    if (item.itemType === 'SERVICE') {
      const serviceCode = item.code === 'SVC-MONTAGE-001' ? 'MONTAGE' : 'PICKUP';
      assert.ok(services.some(service => service.code === serviceCode));
    } else if (item.catalogBlendeCode) {
      assert.ok(blenden.some(blende => blende.code === item.catalogBlendeCode));
    } else {
      assert.ok(articles.some(article => article.articleNumber === (item.catalogArticleNumber || item.articleNumber)), item.code);
    }
    if (item.blendeCode) assert.ok(blenden.some(blende => blende.code === item.blendeCode));
  }
  assert.equal(components.some(item => /^(REF-|DISH-)/.test(item.code)), false);
  assert.equal(components.some(item => ['refrigerator','dishwasher-base'].includes(item.componentKey)), false);
  assert.match(seed, /slug: "ab-104296"[\s\S]*?programmId: "BURGER CINDY"[\s\S]*?items: AB_104296_ITEMS/);
  for (const item of items) assert.doesNotMatch(item.articleNumber || '', /(?:^|\s)[LR](?:\s|$)/, item.code);
  assert.equal(components.find(item => item.componentKey === 'sink-faucet').catalogArticleNumber, '526335 + 517720');
});

test('Burger catalog registration preserves supplier prices and other programs on repeated seeds', async () => {
  const records = new Map([
    ['BURGER CINDY:drawer', { price: '387.00' }],
    ['IP 2200:drawer', { price: '298.00' }],
  ]);
  const linkedItems = [
    { catalogArticle: { id: 'drawer', articleNumber: 'US2A30', price: '298.00', isActive: true } },
    { catalogArticle: { id: 'sink', articleNumber: 'SPDT60', price: '0.00', isActive: true }, catalogBlende: { id: 'filler', code: 'HPK2002', price: '35.00', isActive: true } },
    { catalogService: { id: 'pickup', code: 'PICKUP', price: '0.00', isActive: true } },
  ];
  const upsert = async ({ create, update }) => {
    const id = create.catalogArticleId || create.catalogBlendeId || create.catalogServiceId;
    const key = `${create.programmId}:${id}`;
    records.set(key, records.has(key) ? { ...records.get(key), ...update } : create);
  };
  const prisma = {
    kitchenItem: { findMany: async () => linkedItems },
    catalogProgram: { upsert: async () => {} },
    catalogArticleProgramPrice: { upsert }, catalogBlendeProgramPrice: { upsert }, catalogServiceProgramPrice: { upsert },
  };
  const helper = seed.slice(seed.indexOf('async function seedKitchenCatalogProgramPrices'), seed.indexOf('async function seedCatalogMasterData'));
  const register = runInNewContext(`${helper}\nseedKitchenCatalogProgramPrices`, { prisma });
  await register({ id: 'kitchen', programmId: 'BURGER CINDY' });
  await register({ id: 'kitchen', programmId: 'BURGER CINDY' });
  assert.equal(records.size, 5);
  assert.equal(records.get('BURGER CINDY:drawer').price, '387.00');
  assert.equal(records.get('IP 2200:drawer').price, '298.00');
  assert.equal(records.get('BURGER CINDY:sink').articleNumber, 'SPDT60');
  assert.equal(records.get('BURGER CINDY:filler').code, 'HPK2002');
  assert.equal(records.get('BURGER CINDY:pickup').price, '0.00');
});

test('FRG and ASC load the original vector drawing and share measured perspective faces', async () => {
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], '/plans/670%20104296.svg');
  const svg = readFileSync(new URL('../public/plans/670 104296.svg', import.meta.url), 'utf8').trim();
  assert.equal(await loadKitchenSvgMarkup(slug), svg);
  assert.match(svg, /viewBox="0 0 842 595"/);
  assert.ok(faces.every(face => face.points?.length >= 3 && face.preserveManualSize));
  const stage = readFileSync(new URL('../components/kitchen-svg-stage.jsx', import.meta.url), 'utf8');
  assert.match(stage, /IMAGE_HOTSPOTS_BY_SLUG\["ab-104296"\] = PLAN_HOTSPOTS_BY_SLUG\["ab-104296"\]/);
  for (const item of components) assert.ok(faces.some(face => face.componentKey === item.componentKey), item.code);
  // PDF seam: oven body stops on (376.68,486.4)-(454.8,497.68).
  const oven = faces.find(face => face.componentKey === 'oven-module');
  const cabinet = faces.find(face => face.componentKey === 'oven-cabinet');
  assert.deepEqual(oven.points.slice(2), [cabinet.points[1], cabinet.points[0]]);
});

test('ASC combines the oven and ceramic surface while excluding customer-owned appliances', () => {
  const selected = selection();
  assert.ok(selected.selectableComponentIds.includes('component-claim-oven-set'));
  for (const id of ['component-refrigerator','component-dishwasher-base','component-claim-dishwasher','component-claim-oven','component-claim-cooktop']) {
    assert.equal(selected.selectableComponentIds.includes(id), false, id);
  }
  for (const id of ['component-dishwasher-front','component-oven-cabinet']) {
    assert.ok(selected.selectableComponentIds.includes(id), id);
  }
  const claims = buildServiceClaimPartHotspots(faces, claimParts, slug);
  const setFaces = claims.filter(face => face.componentId === 'component-claim-oven-set');
  assert.equal(setFaces.length, 2);
  assert.deepEqual(setFaces.map(face => face.points), faces.filter(face => face.componentKey === 'oven-module').map(face => face.points));
  assert.deepEqual(setFaces.map(face => face.claimApplianceSurface).sort(), ['cooktop','oven']);
  const set = selected.selectableComponents.find(item => item.claimPartKey === 'oven-set');
  assert.equal(isElectricalApplianceProblemArea(set), true);
  assert.equal(getSerialNumberHelpApplianceType(set), 'oven');
  assert.equal(isElectricalApplianceProblemArea(selected.selectableComponents.find(item => item.componentKey === 'dishwasher-front')), false);
});

test('ASC selects GI88214-01 as one article and keeps DBK50 and SP20214K separate', () => {
  const selected = selection();
  assert.equal(selected.selectableComponentIds.includes('component-fridge-cabinet'), false);
  assert.equal(components.filter(item => item.componentKey === 'fridge-cabinet').length, 1);
  const prepared = prepareKitchenPlanGeometry(faces, slug, components);
  const crop = getPlanDisplayCrop(prepared, slug);
  const cropped = prepared.map(face => cropPlanHotspot(face, crop));
  const claims = buildServiceClaimPartHotspots(cropped, claimParts, slug);
  assert.equal(housingClaimDefinitions.length, 3);
  const housingChoices = selected.selectableComponents.filter(component => component.articleCode === 'GI88214-01');
  assert.equal(housingChoices.length, 1, 'one GI88214-01 claim form row');
  assert.equal(housingChoices[0].claimPartKey, 'housing-cabinet');
  for (const part of housingClaimDefinitions) {
    const id = `component-claim-${part.partKey}`;
    const choice = selected.selectableComponents.find(component => component.componentId === id);
    assert.ok(choice, part.partKey);
    const expectedArticle = part.partKey === 'housing-top-front' ? 'DBK50'
      : part.partKey === 'housing-side-panel' ? 'SP20214K' : 'GI88214-01';
    assert.equal(choice.articleCode, expectedArticle);
    const source = components.find(item => item.code === choice.sourceKitchenItemCode);
    assert.equal(source.catalogArticleNumber, expectedArticle);
    assert.equal(source.componentKey, choice.componentKey);
    assert.equal(isElectricalApplianceProblemArea(choice), false);
    assert.equal(getProductInfoHref(source), '');
    assert.deepEqual(getServiceClaimLinkedComponentIds(slug, id), [id]);
    const sourceFaces = cropped.filter(face => face.claimFurniturePartKey === part.partKey);
    assert.ok(sourceFaces.length, part.partKey);
    assert.deepEqual(claims.filter(face => face.componentId === id).map(face => face.points), sourceFaces.map(face => face.points));
  }
  assert.equal(claims.filter(face => face.componentKey === 'fridge-cabinet').length, 0);
  const cabinetClaims = claims.filter(face => face.componentId === 'component-claim-housing-cabinet');
  assert.equal(cabinetClaims.length, 7, 'all cabinet fronts, body and plinth toggle with the same identity');
  assert.ok(cabinetClaims.every(face => face.claimFurniturePartKey === 'housing-cabinet'));
  assert.ok(claims.filter(face => face.componentId !== 'component-claim-housing-cabinet')
    .every(face => face.claimFurniturePartKey !== 'housing-cabinet'));
  const frontFaces = faces.filter(face => face.componentKey === 'fridge-cabinet'
    && face.points.length === 4 && Math.min(...face.points.map(point => point[0])) > 18);
  assert.equal(frontFaces.length, 4);
  for (let index = 1; index < frontFaces.length; index++) {
    const upper = frontFaces[index - 1];
    const lower = frontFaces[index];
    assert.deepEqual(upper.points[2], lower.points[1]);
    assert.deepEqual(upper.points[3], lower.points[0]);
  }
  const filler = components.find(item => item.articleNumber === 'SP20214K');
  const closure = components.find(item => item.articleNumber === 'DBK50');
  assert.equal(filler.widthMm, 91);
  assert.equal(closure.widthMm, 600);
  assert.equal(closure.heightMm, 425);
  assert.ok([filler, closure].every(item => item.isLocked && shouldHideComponentFromSelectionSummary(slug, item)));
  const fillerFaces = faces.filter(face => face.claimFurniturePartKey === 'housing-side-panel');
  assert.equal(fillerFaces.length, 1);
  assert.ok(Math.max(...fillerFaces[0].points.map(point => point[0])) - Math.min(...fillerFaces[0].points.map(point => point[0])) < 2);
  assert.ok(faces.some(face => face.claimFurniturePartKey === 'housing-cabinet' && face.componentKey === 'fridge-cabinet'));
});

test('appliance inventory keeps furniture out and shares the cooker serial number', () => {
  const inventory = deriveKitchenAppliances({ ...selection(), items: components });
  assert.deepEqual(inventory.map(item => item.applianceType).sort(), ['hob','oven']);
  assert.equal(inventory.find(item => item.applianceType === 'hob').sharesOvenSerial, true);
  assert.ok(inventory.every(item => item.articleNumber === 'EHCX9330S-A'));
});

test('the refrigerator housing does not inherit the customer-owned appliance PDF', () => {
  const housing = components.find(item => item.componentKey === 'fridge-cabinet');
  assert.equal(getProductInfoHref(housing), '');
  assert.deepEqual(getProductInfoDocuments(housing), []);
  const cabinetPdf = { ...housing, productInfoPdfPath: '/product-info/housing/gi88214-01.pdf' };
  assert.equal(getProductInfoHref(cabinetPdf), cabinetPdf.productInfoPdfPath);
  assert.deepEqual(getProductInfoDocuments(cabinetPdf).map(document => document.href), [cabinetPdf.productInfoPdfPath]);
  const refrigerator = { code: 'REF-B-545-1800-700', componentKey: 'refrigerator', iconKey: 'tall_refrigerator', articleNumber: 'OL-KGCN388140E' };
  assert.match(getProductInfoHref(refrigerator), /refrigerators\/kgcn388140e/);
  assert.ok(getProductInfoDocuments(refrigerator).length > 0);
});

test('sink, faucet and each worktop retain their independent source outlines after responsive cropping', () => {
  const prepared = prepareKitchenPlanGeometry(faces, slug, components);
  const crop = getPlanDisplayCrop(prepared, slug);
  const definitions = prepared.map(face => cropPlanHotspot(face, crop));
  const claims = buildServiceClaimPartHotspots(definitions, claimParts, slug);
  for (const partKey of ['sink','faucet']) {
    assert.deepEqual(claims.filter(face => face.claimPartKey === partKey).map(face => face.points), definitions.filter(face => face.claimFixturePartKey === partKey).map(face => face.points));
  }
  assert.deepEqual(claims.filter(face => face.claimPartKey?.startsWith('worktop-')).map(face => face.points), definitions.filter(face => face.componentKey === 'worktop').map(face => face.points));
});

test('the hood toggles as a package and its H6072 filler is measured separately in ASC', () => {
  assert.deepEqual(getLinkedComponentIds(slug, 'component-extractor-hood'), ['component-wall-cabinet-3','component-extractor-hood']);
  const selected = selection(components.map(item => ({ ...item, itemType: 'COMPONENT' })));
  const claims = buildServiceClaimBlendeHotspots(faces, selected.selectableComponents, components, slug);
  const filler = claims.filter(face => face.claimPartKey === 'blende');
  assert.equal(filler.length, 2);
  assert.deepEqual(filler.map(face => face.points), faces.filter(face => face.componentKey === 'wall-cabinet-1').slice(0,2).map(face => face.points));
  assert.deepEqual(claims.filter(face => face.componentKey === 'wall-cabinet-1').map(face => face.points), faces.filter(face => face.componentKey === 'wall-cabinet-1').slice(2).map(face => face.points));
});
