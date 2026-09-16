// Dry-run by default. Only repairs the two newest kitchens in a local database.
const assert = require("node:assert/strict");
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");

loadEnvConfig(process.cwd());
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL).hostname), "Local database required");
const prisma = new PrismaClient();
const articleNumber = "A-EH923640E + 9EC744100C";
const slugs = ["ab-105759", "ab-105760"];

async function main() {
  await prisma.$transaction(async (tx) => {
    const article = await tx.catalogArticle.findUniqueOrThrow({ where: { articleNumber } });
    assert.match(article.productInfoPdfPath, /\/eh923640e\/a-eh923640e-product-info\.pdf$/);
    const kitchens = await tx.kitchen.findMany({
      where: { slug: { in: slugs } },
      include: {
        items: { where: { code: "OVEN-B-600-HOB" } },
        claimParts: { where: { partKey: "oven" } },
      },
    });
    assert.equal(kitchens.length, 2, "Both kitchens must exist before applying");
    for (const kitchen of kitchens) {
      assert.equal(kitchen.items.length, 1);
      assert.equal(kitchen.claimParts.length, 1);
      assert.ok(["EH92364E-A + 9EC744100C + UHK", articleNumber].includes(kitchen.items[0].articleNumber));
    }
    for (const kitchen of kitchens) {
      console.log(`${kitchen.slug}: ${kitchen.items[0].articleNumber} -> ${articleNumber}`);
      if (!process.argv.includes("--apply")) continue;
      const metadata = Object.fromEntries([
        "productImagePath", "productInfoPdfPath", "productInfoSummary",
        "productInfoKeyFacts", "productInfoExtractedText",
      ].map((key) => [key, article[key]]));
      metadata.productInfoUpdatedAt = new Date();
      await tx.kitchenItem.update({
        where: { id: kitchen.items[0].id },
        data: {
          ...metadata, articleNumber, catalogArticleId: article.id,
          name: article.name, nameDe: article.nameDe, catalogLinkStatus: "MATCHED",
          infoText: "A-EH923640E oven, 9EC744100C ceramic cooktop and UHK lower cabinet",
        },
      });
      await tx.kitchenClaimPart.update({
        where: { id: kitchen.claimParts[0].id },
        data: { ...metadata, articleCode: "A-EH923640E" },
      });
    }
  });
  console.log(process.argv.includes("--apply") ? "Local oven links repaired; prices, cabinets and orders unchanged." : "Dry run only. Use --apply to repair.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
