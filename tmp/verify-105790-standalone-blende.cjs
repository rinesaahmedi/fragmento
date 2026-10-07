const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire, registerHooks } = require("node:module");
const frontendRoot = path.resolve(__dirname, "../frontend");
const projectRequire = createRequire(path.join(frontendRoot, "package.json"));
process.chdir(frontendRoot);
projectRequire("@next/env").loadEnvConfig(frontendRoot);
assert.equal(new URL(process.env.DATABASE_URL).hostname, "localhost");
function registerProjectHooks() { registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
    const candidate = new URL(`${specifier}.js`, context.parentURL);
    if (fs.existsSync(candidate)) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} }); }
const { PrismaClient } = projectRequire("@prisma/client");
const prisma = new PrismaClient();
globalThis.prisma = prisma;
async function main() {
  const relations = { catalogArticle: true, catalogBlende: true, catalogService: true };
  const include = { kitchen: { include: { items: { include: relations } } }, items: { include: { kitchenItem: { include: relations } } } };
  const where = { orderNumber: "670105790-1" };
  const record = await prisma.order.findUnique({ where, include }) || await prisma.testOrder.findUnique({ where, include });
  assert.ok(record, "The saved 105790 order must exist");
  const { buildOrderSummaryHtml } = await import("../frontend/lib/email/order-notifications.js");
  registerProjectHooks();
  const { buildOrderForNotifications } = await import("../frontend/lib/orders.js");
  const order = buildOrderForNotifications(record);
  console.log(JSON.stringify({ components: order.components.filter(item => item.code.includes("BLENDE") || item.code.includes("US60")).map(item => ({ code: item.code, price: item.price, blendeCode: item.blendeCode, blendePrice: item.blendePrice, componentKey: item.componentKey })) }));
  const html = buildOrderSummaryHtml(order);
  const text = html.match(/<tr>[\s\S]*?<\/tr>/g).map(row => row.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).filter(row => row.includes("Passblende") || row.includes("US60"));
  console.log(JSON.stringify({ orderNumber: record.orderNumber, rows: text }));
  assert.match(html, /<tr><td[^>]*>2<\/td><td[\s\S]*?Passblende bis 20 cm[\s\S]*?Typen-Nr\.: UPK20[\s\S]*?<\/td><td[^>]*>25/, "The sink-end filler must have its own main row");
  assert.ok(text.some(row => /^1\.1\s+Passblende/.test(row) && row.includes("25,00")), "The US60 filler stays under its own cabinet");
  assert.ok(!text.some(row => row.includes("x 2")), "Independent fillers must not combine as x 2");
  console.log("Verified saved order: separate sink-end filler row, attached US60 filler row, unchanged prices. No email sent.");
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(() => prisma.$disconnect());
