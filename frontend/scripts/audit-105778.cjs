const assert = require("node:assert/strict");
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const familySlugs = ["ab-105778", "ab-105781", "ab-105784", "ab-105787"];
  const auditFamily = process.argv.includes("--family");
  const kitchen = await prisma.kitchen.findUnique({
    where: { slug: "ab-105778" },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { catalogArticle: true, catalogBlende: true, catalogService: true } },
      contracts: true,
      claimParts: true,
    },
  });
  if (process.argv.includes("--catalog")) {
    const articles = await prisma.catalogArticle.findMany({
      where: { articleNumber: { in: ["A-EH923640E + 9EC744100C", "PLR60", "SP50", "US40", "A-EGSPV597210 + TGV60", "H4002", "FH664621E + FWK124 + HD6002", "H6002", "H5002", "526335 + 517720"] } },
      select: { articleNumber: true, price: true, widthMm: true, heightMm: true, depthMm: true },
    });
    const existingFamily = auditFamily
      ? await prisma.kitchen.findMany({ where: { slug: { in: familySlugs } }, select: { slug: true, id: true } })
      : undefined;
    console.log(JSON.stringify({ existingKitchen: Boolean(kitchen), existingFamily, articles }, null, 2));
    return;
  }
  assert.ok(kitchen, "Kitchen must exist");
  assert.equal(kitchen.items.length, 17);
  for (const item of kitchen.items) {
    assert.equal(item.catalogLinkStatus, "MATCHED", `${item.code}: missing link status`);
    const record = item.catalogArticle || item.catalogBlende || item.catalogService;
    assert.ok(record?.isActive, `${item.code}: missing active catalog record`);
    if (item.itemType === "SERVICE") assert.ok(item.catalogServiceId);
    else if (item.componentKey === "sink-end-blende") assert.ok(item.catalogBlendeId);
    else assert.ok(item.catalogArticleId, `${item.code}: missing catalog article`);
    if (item.isLocked) {
      assert.equal(Number(item.price), 0);
      assert.equal(item.catalogPriceSyncMode, "LOCKED_INCLUDED");
    }
  }
  const sink = kitchen.items.find((item) => item.componentKey === "sink-base");
  assert.equal(sink.catalogArticle.articleNumber, "SP50");
  assert.equal(sink.widthMm, 500);
  assert.match(sink.infoText, /hinge right/);
  const wall = kitchen.items.find((item) => item.componentKey === "wall-cabinet-4");
  assert.equal(wall.catalogArticle.articleNumber, "H5002");
  assert.equal(wall.catalogBlende.code, "HPK2002");
  assert.equal(kitchen.items.filter((item) => item.itemType === "COMPONENT" && item.isActive && !item.isLocked).length, 7);
  assert.ok(kitchen.contracts.some((contract) => contract.contractNumber === "670105778" && contract.isActive));
  for (const [key, article] of [["sink", "526335"], ["faucet", "517720"], ["sink-cabinet", "SP50"], ["oven", "A-EH923640E"], ["oven-drawer", "UHK"], ["cooktop", "9EC744100C"]]) {
    assert.equal(kitchen.claimParts.find((part) => part.partKey === key)?.articleCode, article, key);
  }
  if (auditFamily) {
    const stripIdentity = ({ id, kitchenId, createdAt, updatedAt, productInfoUpdatedAt, ...fields }) => fields;
    const baseItems = kitchen.items.map(stripIdentity).sort((a, b) => a.code.localeCompare(b.code));
    const baseParts = kitchen.claimParts.map(stripIdentity).sort((a, b) => a.partKey.localeCompare(b.partKey));
    const families = [kitchen];
    for (const slug of familySlugs.slice(1)) {
      const sibling = await prisma.kitchen.findUnique({
        where: { slug },
        include: {
          items: { include: { catalogArticle: true, catalogBlende: true, catalogService: true } },
          contracts: true,
          claimParts: true,
        },
      });
      assert.ok(sibling, `${slug}: missing separate kitchen`);
      assert.equal(sibling.name, slug.slice(3));
      assert.equal(sibling.kitchenCode, `105 ${slug.slice(-3)}`);
      assert.deepEqual(sibling.items.map(stripIdentity).sort((a, b) => a.code.localeCompare(b.code)), baseItems, `${slug}: items differ`);
      assert.deepEqual(sibling.claimParts.map(stripIdentity).sort((a, b) => a.partKey.localeCompare(b.partKey)), baseParts, `${slug}: ASC parts differ`);
      families.push(sibling);
    }
    assert.equal(new Set(families.map((entry) => entry.id)).size, 4);
    for (const collection of ["items", "claimParts"]) {
      const records = families.flatMap((entry) => entry[collection]);
      assert.equal(new Set(records.map((entry) => entry.id)).size, records.length, `${collection}: shared row identities`);
      families.forEach((entry) => assert.ok(entry[collection].every((record) => record.kitchenId === entry.id)));
    }
    for (const entry of families) {
      for (const prefix of ["670", "111"]) {
        assert.ok(entry.contracts.some((contract) => contract.contractNumber === `${prefix}${entry.slug.slice(3)}` && contract.isActive && contract.kitchenId === entry.id));
      }
    }
    console.log(JSON.stringify(families.map((entry) => ({ slug: entry.slug, id: entry.id, linkedItems: entry.items.length, claimParts: entry.claimParts.length, contracts: entry.contracts.map((contract) => contract.contractNumber) }))));
    return;
  }
  if (process.argv.includes("--summary")) {
    console.log(JSON.stringify({ slug: kitchen.slug, linkedItems: kitchen.items.length, selectableComponents: 7, defaultsIncludedAtZero: true, claimsVerified: true, contracts: kitchen.contracts.map((entry) => entry.contractNumber) }));
    return;
  }
  console.log(JSON.stringify({ slug: kitchen.slug, linkedItems: kitchen.items.length, contracts: kitchen.contracts.map((entry) => entry.contractNumber), items: kitchen.items.map(({ code, articleNumber, price, widthMm, heightMm, depthMm, isLocked, isActive, componentKey, blendeCode }) => ({ code, articleNumber, price, widthMm, heightMm, depthMm, isLocked, isActive, componentKey, blendeCode })) }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
