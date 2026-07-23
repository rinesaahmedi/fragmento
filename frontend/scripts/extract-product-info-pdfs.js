const fs = require("fs/promises");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ADDITIONAL_PRODUCT_INFO_PDF_PATHS_BY_CODE = {
  "EBX943600S + OL-KMI754000E": ["/product-info/hobs/ol-kmi754000e/ol-kmi754000e-product-info.pdf"],
  "OVEN-B-600-HOB": ["/product-info/hobs/ol-kmi754000e/ol-kmi754000e-product-info.pdf"],
  "OVEN-C-600-HOB": ["/product-info/hobs/ol-kmi754000e/ol-kmi754000e-product-info.pdf"],
};

function normalizePdfPath(value) {
  return String(value || "").trim().replace(/^\/+/, "");
}

function resolvePublicPdfPath(productInfoPdfPath) {
  const normalized = normalizePdfPath(productInfoPdfPath);
  if (!normalized) return "";
  return path.resolve(process.cwd(), "public", normalized);
}

function buildPdfPathsForItem(item) {
  return [
    item.productInfoPdfPath,
    ...(ADDITIONAL_PRODUCT_INFO_PDF_PATHS_BY_CODE[item.code] || []),
  ]
    .map(normalizePdfPath)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function normalizeExtractedText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(absolutePath) {
  const buffer = await fs.readFile(absolutePath);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeExtractedText(result.text);
  } finally {
    await parser.destroy();
  }
}

async function main() {
  const [catalogArticles, allClaimProducts, allLegacyItems] = await Promise.all([
    prisma.catalogArticle.findMany({
      where: {
        productInfoPdfPath: { not: null },
      },
      select: {
        id: true,
        articleNumber: true,
        name: true,
        productInfoPdfPath: true,
      },
      orderBy: [{ productInfoPdfPath: "asc" }, { articleNumber: "asc" }],
    }),
    prisma.kitchenClaimPart.findMany({
      where: {
        isActive: true,
        productInfoPdfPath: { not: null },
      },
      select: {
        id: true,
        kitchenId: true,
        partKey: true,
        articleCode: true,
        name: true,
        sourceKitchenItemCode: true,
        productInfoPdfPath: true,
      },
      orderBy: [{ articleCode: "asc" }, { partKey: "asc" }],
    }),
    prisma.kitchenItem.findMany({
      where: {
        catalogArticleId: null,
        productInfoPdfPath: { not: null },
      },
      select: {
        id: true,
        kitchenId: true,
        code: true,
        name: true,
        productInfoPdfPath: true,
      },
      orderBy: [{ productInfoPdfPath: "asc" }, { code: "asc" }],
    }),
  ]);
  const claimProducts = [
    ...new Map(
      allClaimProducts.map((product) => [
        `${product.partKey}:${product.articleCode || ""}`,
        product,
      ]),
    ).values(),
  ];
  const claimManagedSources = new Set(
    allClaimProducts.map(
      (product) => `${product.kitchenId}:${product.sourceKitchenItemCode || ""}`,
    ),
  );
  const legacyItems = allLegacyItems.filter(
    (item) => !claimManagedSources.has(`${item.kitchenId}:${item.code}`),
  );

  const items = [
    ...catalogArticles.map((article) => ({
      ...article,
      code: article.articleNumber,
      source: "catalog",
    })),
    ...claimProducts.map((product) => ({
      ...product,
      code: product.articleCode || product.partKey,
      source: "claim-product",
    })),
    ...legacyItems.map((item) => ({
      ...item,
      source: "kitchen-item",
    })),
  ];

  const itemsWithPdf = items.filter((item) => normalizePdfPath(item.productInfoPdfPath));
  const textByPdfPath = new Map();
  let updatedCount = 0;
  let skippedCount = 0;

  console.log(
    `Found ${catalogArticles.length} catalog article(s), ${claimProducts.length} claim product(s), and ${legacyItems.length} unlinked legacy item(s) with productInfoPdfPath.`,
  );

  for (const item of itemsWithPdf) {
    const pdfPaths = buildPdfPathsForItem(item);

    try {
      const extractedTexts = [];

      for (const normalizedPath of pdfPaths) {
        const absolutePath = resolvePublicPdfPath(normalizedPath);

        if (!textByPdfPath.has(normalizedPath)) {
          try {
            await fs.access(absolutePath);
          } catch {
            console.warn(`[skip] PDF not found for ${item.code}: ${absolutePath}`);
            textByPdfPath.set(normalizedPath, "");
            skippedCount += 1;
            continue;
          }

          try {
            const extractedText = await extractPdfText(absolutePath);
            if (!extractedText) {
              console.warn(`[skip] PDF text is empty for ${item.code}: ${absolutePath}`);
              textByPdfPath.set(normalizedPath, "");
              skippedCount += 1;
              continue;
            }

            textByPdfPath.set(normalizedPath, extractedText);
            console.log(`[extract] ${normalizedPath}: ${extractedText.length} characters`);
          } catch (error) {
            console.warn(`[skip] PDF extraction failed for ${item.code}: ${error.message}`);
            textByPdfPath.set(normalizedPath, "");
            skippedCount += 1;
            continue;
          }
        }

        const extractedText = textByPdfPath.get(normalizedPath);
        if (extractedText) {
          extractedTexts.push(extractedText);
        }
      }

      const text = extractedTexts.join("\n\n---\n\n");
      if (!text) {
        if (!pdfPaths.length) {
          console.warn(`[skip] Empty productInfoPdfPath for ${item.code}`);
        }
        continue;
      }

      const data = {
        productInfoExtractedText: text,
        productInfoUpdatedAt: new Date(),
      };

      if (item.source === "catalog") {
        await prisma.catalogArticle.update({
          where: { id: item.id },
          data,
        });
      } else if (item.source === "claim-product") {
        await prisma.kitchenClaimPart.updateMany({
          where: {
            partKey: item.partKey,
            articleCode: item.articleCode,
          },
          data,
        });
      } else {
        await prisma.kitchenItem.update({
          where: { id: item.id },
          data,
        });
      }
      updatedCount += 1;
      console.log(`[update] ${item.code} ${item.name}`);
    } catch (error) {
      skippedCount += 1;
      console.warn(`[skip] Could not update ${item.code}: ${error.message}`);
    }
  }

  console.log(`Done. Updated ${updatedCount} item(s). Skipped ${skippedCount} item/file operation(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
