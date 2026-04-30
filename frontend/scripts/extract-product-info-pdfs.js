const fs = require("fs/promises");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizePdfPath(value) {
  return String(value || "").trim().replace(/^\/+/, "");
}

function resolvePublicPdfPath(productInfoPdfPath) {
  const normalized = normalizePdfPath(productInfoPdfPath);
  if (!normalized) return "";
  return path.resolve(process.cwd(), "public", normalized);
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
  const items = await prisma.kitchenItem.findMany({
    where: {
      productInfoPdfPath: { not: null },
    },
    select: {
      id: true,
      code: true,
      name: true,
      productInfoPdfPath: true,
    },
    orderBy: [{ productInfoPdfPath: "asc" }, { code: "asc" }],
  });

  const itemsWithPdf = items.filter((item) => normalizePdfPath(item.productInfoPdfPath));
  const textByPdfPath = new Map();
  let updatedCount = 0;
  let skippedCount = 0;

  console.log(`Found ${itemsWithPdf.length} kitchen item(s) with productInfoPdfPath.`);

  for (const item of itemsWithPdf) {
    const normalizedPath = normalizePdfPath(item.productInfoPdfPath);
    const absolutePath = resolvePublicPdfPath(item.productInfoPdfPath);

    try {
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

      const text = textByPdfPath.get(normalizedPath);
      if (!text) {
        if (!absolutePath) {
          console.warn(`[skip] Empty productInfoPdfPath for ${item.code}`);
        }
        continue;
      }

      await prisma.kitchenItem.update({
        where: { id: item.id },
        data: {
          productInfoExtractedText: text,
          productInfoUpdatedAt: new Date(),
        },
      });
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
