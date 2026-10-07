const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const frontendRoot = path.resolve(__dirname, "../frontend");
const projectRequire = createRequire(path.join(frontendRoot, "package.json"));
projectRequire("@next/env").loadEnvConfig(frontendRoot, true);
const databaseHost = new URL(process.env.DATABASE_URL).hostname;
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(databaseHost), "This change only targets the local database");
const { PrismaClient } = projectRequire("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const kitchen = await prisma.kitchen.findUnique({ where: { slug: "ab-105790" }, select: { id: true, programmId: true } });
  assert.ok(kitchen);
  const where = { kitchenId_code: { kitchenId: kitchen.id, code: "CAB-WALL-AB105790-H5002" } };
  const include = { catalogArticle: true, catalogBlende: true };
  const item = await prisma.kitchenItem.findUnique({ where, include });
  assert.equal(item?.componentKey, "wall-cabinet-4");
  const [article, blende] = await Promise.all([
    prisma.catalogArticle.findUnique({ where: { articleNumber: "H5002" }, include: { programPrices: { where: { programmId: kitchen.programmId } } } }),
    prisma.catalogBlende.findUnique({ where: { code: "HPK2002" }, include: { programPrices: { where: { programmId: kitchen.programmId } } } }),
  ]);
  assert.ok(article?.isActive && blende?.isActive, "Both catalog entries must be active");
  const articlePrice = Number(article.programPrices[0]?.price ?? article.price);
  const blendePrice = Number(blende.programPrices[0]?.price ?? blende.price);
  console.log(JSON.stringify({ databaseHost, code: item.code, before: { price: item.price, blendeCode: item.blendeCode, catalogBlendeId: item.catalogBlendeId }, catalog: { programmId: kitchen.programmId, article: article.articleNumber, articlePrice, blende: blende.code, blendePrice, total: articlePrice + blendePrice } }));
  if (!process.argv.includes("--apply")) return;
  const after = await prisma.kitchenItem.update({ where, include, data: {
    catalogArticleId: article.id, catalogBlendeId: blende.id, catalogBlendeQuantity: 1,
    catalogLinkStatus: "MATCHED", catalogPriceSyncMode: "AUTO",
    blendeCode: blende.code, blendeLabel: blende.nameDe || blende.name,
    blendePrice: blendePrice.toFixed(2), price: (articlePrice + blendePrice).toFixed(2),
    infoText: "H5002 upper cabinet with HPK2002 right end filler panel",
  } });
  assert.equal(after.catalogArticle.articleNumber, "H5002");
  assert.equal(after.catalogBlende.code, "HPK2002");
  assert.equal(after.catalogBlendeQuantity, 1);
  assert.equal(Number(after.price), articlePrice + blendePrice);
  console.log(JSON.stringify({ verified: true, code: after.code, blende: after.blendeCode, quantity: after.catalogBlendeQuantity, price: Number(after.price) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
