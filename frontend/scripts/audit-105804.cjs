const assert = require("node:assert/strict");
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const kitchen = await prisma.kitchen.findUnique({ where: { slug: "ab-105804" }, include: {
    items: { include: { catalogArticle: true, catalogBlende: true, catalogService: true }, orderBy: { sortOrder: "asc" } },
    contracts: true, claimParts: true,
  } });
  assert.ok(kitchen);
  assert.equal(kitchen.items.length, 19);
  for (const item of kitchen.items) {
    assert.equal(item.catalogLinkStatus, "MATCHED", item.code);
    assert.ok((item.catalogArticle || item.catalogBlende || item.catalogService)?.isActive, item.code);
    if (item.isLocked) { assert.equal(Number(item.price), 0); assert.equal(item.catalogPriceSyncMode, "LOCKED_INCLUDED"); }
    else {
      const expected = Number((item.catalogArticle || item.catalogService)?.price || 0) + Number(item.catalogBlende?.price || 0) * (item.catalogBlendeQuantity || 1);
      assert.equal(Number(item.price), expected, item.code);
    }
  }
  const byKey = (key) => kitchen.items.find((item) => item.componentKey === key);
  for (const [key, article, filler] of [
    ["base-module-1", "US50", "UPK20"], ["base-module-2", "US60", "UPK20"],
    ["wall-cabinet-1", "H5002", "HPK2002"], ["wall-cabinet-4", "H6002", "HPK2002"],
    ["wall-cabinet-3", "H6002", null], ["dishwasher-base", "A-EGSPV597210 + TGV60", null],
    ["wall-cabinet-2", "FH664621E + FWK124 + HD6002", null],
  ]) {
    assert.equal(byKey(key).catalogArticle.articleNumber, article);
    assert.equal(byKey(key).catalogBlende?.code || null, filler);
    assert.ok(byKey(key).widthMm > 0, key);
    if (key !== "dishwasher-base") assert.ok(byKey(key).heightMm > 0 && byKey(key).depthMm > 0, key);
  }
  assert.equal(byKey("sink-end-blende").catalogBlende.code, "UPK20");
  assert.equal(byKey("sink-end-blende").isLocked, false);
  assert.equal(byKey("extractor-hood").isActive, false);
  assert.match(byKey("sink-base").infoText, /hinge right/);
  assert.equal(kitchen.items.filter((item) => item.isLocked).length, 4);
  for (const prefix of ["670", "111"]) assert.ok(kitchen.contracts.some((c) => c.contractNumber === `${prefix}105804` && c.isActive));
  for (const [key, article] of [["sink","526335"],["faucet","517720"],["sink-cabinet","SP60"],["oven","EH92364E-A"],["oven-drawer","UHK"],["cooktop","9EC744100C"],["worktop-left","PLR60-1"],["worktop-right","PLR60-2"],["worktop-end-panel","WU16"]]) {
    const part = kitchen.claimParts.find((p) => p.partKey === key && p.isActive);
    assert.equal(part?.articleCode, article, key);
    assert.ok(kitchen.items.some((item) => item.code === part.sourceKitchenItemCode && item.componentKey === part.sourceComponentKey), key);
  }
  const optional = kitchen.items.filter((item) => item.itemType === "COMPONENT" && item.isActive && !item.isLocked);
  assert.equal(optional.length, 9);
  console.log(JSON.stringify({ slug: kitchen.slug, linkedItems: kitchen.items.length, optionalComponents: optional.length, optionalTotal: optional.reduce((s,i) => s + Number(i.price),0), contracts: kitchen.contracts.map(c=>c.contractNumber), claims: kitchen.claimParts.map(({partKey,articleCode})=>({partKey,articleCode})) }, null, 2));
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
