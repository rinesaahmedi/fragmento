const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const frontendRoot = path.resolve(__dirname, "../frontend");
const projectRequire = createRequire(path.join(frontendRoot, "package.json"));
projectRequire("@next/env").loadEnvConfig(frontendRoot, true);
const targetUrl = new URL(process.env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(targetUrl.hostname), "Refusing to delete from a non-local database");
const { PrismaClient } = projectRequire("@prisma/client");
const prisma = new PrismaClient();
const orderNumbers = ["670105789-1", "670105778-1"];
async function main() {
  const where = { orderNumber: { in: orderNumbers } };
  const before = await prisma.order.findMany({ where, select: { id: true, orderNumber: true, contractNumber: true, totalPrice: true, _count: { select: { items: true } } } });
  console.log(JSON.stringify({ databaseHost: targetUrl.hostname, orders: before.map(row => ({ orderNumber: row.orderNumber, contractNumber: row.contractNumber, total: Number(row.totalPrice), items: row._count.items })) }, null, 2));
  if (!process.argv.includes("--apply")) return;
  assert.equal(before.length, 2, "Both exact orders must exist before deleting");
  const deleted = await prisma.$transaction(async tx => {
    const result = await tx.order.deleteMany({ where: { id: { in: before.map(row => row.id) }, ...where } });
    assert.equal(result.count, 2);
    assert.equal(await tx.order.count({ where }), 0);
    assert.equal(await tx.orderItem.count({ where: { orderId: { in: before.map(row => row.id) } } }), 0);
    return result.count;
  });
  console.log(JSON.stringify({ deleted, remainingTargetOrders: await prisma.order.count({ where }) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
