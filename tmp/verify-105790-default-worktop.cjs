const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const frontendRoot = path.resolve(__dirname, "../frontend");
const projectRequire = createRequire(path.join(frontendRoot, "package.json"));
projectRequire("@next/env").loadEnvConfig(frontendRoot, true);
const databaseHost = new URL(process.env.DATABASE_URL).hostname;
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(databaseHost), "This verification only targets the local database");
const { PrismaClient } = projectRequire("@prisma/client");
const prisma = new PrismaClient();
const where = { kitchen: { slug: "ab-105790" }, code: "TOP-AB105790-SECONDARY" };
async function main() {
  const select = { code: true, componentKey: true, isLocked: true, price: true, catalogPriceSyncMode: true };
  const before = await prisma.kitchenItem.findMany({ where, select });
  assert.equal(before.length, 1, "Expected exactly one secondary worktop in AB 105790");
  console.log(JSON.stringify({ databaseHost, before }));
  if (process.argv.includes("--apply")) {
    await prisma.kitchenItem.updateMany({ where, data: {
      isLocked: true, price: "0.00", catalogPriceSyncMode: "LOCKED_INCLUDED",
      infoText: "Included separate PLR60 worktop on the left block, supplier row 4",
    } });
  }
  const [after] = await prisma.kitchenItem.findMany({ where, select });
  assert.equal(after.isLocked, true);
  assert.equal(Number(after.price), 0);
  assert.equal(after.catalogPriceSyncMode, "LOCKED_INCLUDED");
  console.log(JSON.stringify({ verified: true, after }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
