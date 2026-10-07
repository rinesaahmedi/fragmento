const fs = require("node:fs");
const path = require("node:path");
const { createRequire, registerHooks } = require("node:module");
const projectRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(projectRoot, "frontend");
const frontendRequire = createRequire(path.join(frontendRoot, "package.json"));
process.chdir(frontendRoot);
frontendRequire("@next/env").loadEnvConfig(frontendRoot);
function registerProjectHooks() { registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
    const candidate = new URL(`${specifier}.js`, context.parentURL);
    if (fs.existsSync(candidate)) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} }); }
const { PrismaClient } = frontendRequire("@prisma/client");
const prisma = new PrismaClient();
globalThis.prisma = prisma;

async function main() {
  const { generatePurchasedKitchenPdf, buildOrderConfirmationAttachmentLabels } = await import("../frontend/lib/email/order-notifications.js");
  registerProjectHooks();
  const relations = { catalogArticle: true, catalogBlende: true, catalogService: true };
  const record = await prisma.order.findFirst({
    where: { contractNumber: "670105789" },
    orderBy: { createdAt: "desc" },
    include: { kitchen: { include: { items: { include: relations } } }, items: { include: { kitchenItem: { include: relations } } } },
  });
  if (!record) throw new Error("No saved order found for 670105789");
  const { buildOrderForNotificationsWithConfirmedBaseline } = await import("../frontend/lib/orders.js");
  const order = await buildOrderForNotificationsWithConfirmedBaseline(record);
  const attachment = await generatePurchasedKitchenPdf(order);
  if (!attachment?.base64) throw new Error("Purchased kitchen PDF was not generated");
  const outputDir = path.join(projectRoot, "output", "pdf");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, attachment.filename);
  const bytes = Buffer.from(attachment.base64, "base64");
  fs.writeFileSync(outputPath, bytes);
  const labels = await buildOrderConfirmationAttachmentLabels(order);
  console.log(JSON.stringify({ orderNumber: record.orderNumber, total: Number(record.totalPrice), selectedComponents: order.purchasedKitchenComponents.map(item => ({ componentKey: item.componentKey, locked: item.isLocked })), filename: attachment.filename, bytes: bytes.length, attachmentKeys: labels.map(item => item.key) }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
