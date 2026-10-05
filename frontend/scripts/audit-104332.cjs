const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const catalogInclude = { programPrices: { where: { programmId: 'BURGER CINDY', isActive: true } } };
  const kitchen = await prisma.kitchen.findUnique({ where: { slug: 'ab-104332' }, include: {
    items: { orderBy: { sortOrder: 'asc' }, include: {
      catalogArticle: { include: catalogInclude },
      catalogBlende: { include: catalogInclude },
      catalogService: { include: catalogInclude },
    } }, claimParts: true, contracts: true,
  } });
  const articles = await prisma.catalogArticle.findMany({ where: { articleNumber: { in: ['GI88214-01','SPDT60','TV60','EHCX9330S-A','UHS60','US2A60','UVADT20-01','AP60','UP10K','UPEV','HP2072K','H6072'] } }, select: { articleNumber: true, name: true, price: true, widthMm: true, heightMm: true, depthMm: true } });
  const blenden = await prisma.catalogBlende.findMany({ select: { code: true, name: true, price: true } });
  if (kitchen) {
    const assert = require('node:assert/strict');
    assert.equal(kitchen.items.length, 22);
    assert.ok(kitchen.items.every(item => item.catalogLinkStatus === 'MATCHED'));
    for (const item of kitchen.items) {
      const catalogRecords = [item.catalogArticle, item.catalogBlende, item.catalogService].filter(Boolean);
      assert.ok(catalogRecords.length, `${item.code}: missing catalog relation`);
      assert.ok(catalogRecords.every(record => record.isActive && record.programPrices.length), `${item.code}: missing active Burger program record`);
      if (item.itemType === 'SERVICE') assert.ok(item.catalogService, `${item.code}: missing service catalog link`);
      else if (item.iconKey === 'blende') assert.ok(item.catalogBlende, `${item.code}: missing filler catalog link`);
      else assert.ok(item.catalogArticle, `${item.code}: missing article catalog link`);
      if (item.blendeCode) assert.equal(item.catalogBlende?.code, item.blendeCode, `${item.code}: filler catalog mismatch`);
      else if (item.catalogArticle) assert.equal(item.catalogArticle.articleNumber, item.articleNumber, `${item.code}: article catalog mismatch`);
    }
    assert.ok(kitchen.items.filter(item => item.isLocked).every(item => Number(item.price) === 0));
    assert.ok(kitchen.items.filter(item => item.isLocked).every(item => item.catalogPriceSyncMode === 'LOCKED_INCLUDED'));
    assert.equal(kitchen.items.filter(item => item.itemType === 'COMPONENT' && item.isActive && !item.isLocked).length, 4);
    assert.ok(kitchen.contracts.some(contract => contract.contractNumber === '670104332'));
    assert.equal(kitchen.claimParts.find(part => part.partKey === 'oven-set')?.articleCode, 'EHCX9330S-A');
    assert.equal(kitchen.claimParts.find(part => part.partKey === 'sink-cabinet')?.articleCode, 'SPDT60');
    if (process.argv.includes('--summary')) {
      console.log(JSON.stringify({ slug: kitchen.slug, total: kitchen.items.length, linked: kitchen.items.length,
        articleLinked: kitchen.items.filter(item => item.catalogArticle).length,
        fillerLinked: kitchen.items.filter(item => item.catalogBlende && !item.catalogArticle).length,
        serviceLinked: kitchen.items.filter(item => item.catalogService).length,
        activeBurgerProgramLinks: true, allDefaultsIncludedAtZero: true,
      }));
      return;
    }
    console.log(JSON.stringify({ slug: kitchen.slug, items: kitchen.items.map(({ code, articleNumber, price, isLocked, isActive, componentKey, catalogLinkStatus, widthMm, heightMm, depthMm, blendeCode }) => ({ code, articleNumber, price, isLocked, isActive, componentKey, catalogLinkStatus, widthMm, heightMm, depthMm, blendeCode })), claims: kitchen.claimParts.map(({ partKey, articleCode, sourceComponentKey }) => ({ partKey, articleCode, sourceComponentKey })), contracts: kitchen.contracts.map(contract => contract.contractNumber) }, null, 2));
  } else console.log(JSON.stringify({ kitchen, articles, blenden }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
