const fs = require("fs/promises");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TARGET_MODEL_PATTERN = /EWA\s*34660\s*W|EWA34660W/i;
const PROGRAM_KEY_FACTS = [
  "Programme: 16",
  "Programme Baumwolle: ECO 40-60, 20°C",
  "Programme Pflegeleicht: Pflegeleicht",
  "Programme Wolle: Wolle",
  "Programme Feinwäsche/Seide: Feinwäsche",
  "Zusatzprogramme: Steam Wash, Express 15', Baby Comfort, Sportwäsche, Mixwäsche, Schleudern, Spülen & Schleudern, Individuell, Kurzwäsche 45', Jeans, Baumwolle Extra",
  "Zusatzfunktionen: Standby, Startzeitvorwahl, Schleuderwahl, Temperaturwahl, Start/Pause",
];

const EXTRACTED_TEXT_SECTION = [
  "Programme und Funktionen:",
  "- Programme: 16.",
  "- Programme Baumwolle: ECO 40-60, 20°C.",
  "- Programme Pflegeleicht: Pflegeleicht.",
  "- Programme Wolle: Wolle.",
  "- Programme Feinwäsche/Seide: Feinwäsche.",
  "- Zusatzprogramme: Steam Wash, Express 15', Baby Comfort, Sportwäsche, Mixwäsche, Schleudern, Spülen & Schleudern, Individuell, Kurzwäsche 45', Jeans, Baumwolle Extra.",
  "- Zusatzfunktionen: Standby, Startzeitvorwahl, Schleuderwahl, Temperaturwahl, Start/Pause.",
].join("\n");

function timestampForFile(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function normalizeKeyFacts(value) {
  const source = Array.isArray(value) ? value : (value ? [value] : []);

  return source
    .flatMap((entry) => String(entry || "").split(/\r?\n/))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function factLabel(value) {
  const colonIndex = String(value || "").indexOf(":");
  return colonIndex === -1 ? "" : String(value).slice(0, colonIndex).trim().toLowerCase();
}

function appendMissingKeyFacts(existingFacts) {
  const facts = normalizeKeyFacts(existingFacts);
  const labels = new Set(facts.map(factLabel).filter(Boolean));
  const additions = PROGRAM_KEY_FACTS.filter((fact) => !labels.has(factLabel(fact)));

  return {
    facts: [...facts, ...additions],
    additions,
  };
}

function appendExtractedTextSection(existingText) {
  const text = String(existingText || "").trim();
  if (/Programme und Funktionen:/i.test(text) || /Zusatzprogramme:\s*Steam Wash/i.test(text)) {
    return { text, changed: false };
  }

  return {
    text: [text, EXTRACTED_TEXT_SECTION].filter(Boolean).join("\n\n"),
    changed: true,
  };
}

function isTargetItem(item) {
  return [
    item.code,
    item.articleNumber,
    item.productInfoPdfPath,
    item.productInfoSummary,
    normalizeKeyFacts(item.productInfoKeyFacts).join("\n"),
    item.productInfoExtractedText,
  ].some((value) => TARGET_MODEL_PATTERN.test(String(value || "")));
}

async function loadTargetItems() {
  const candidates = await prisma.kitchenItem.findMany({
    where: {
      isActive: true,
      OR: [
        { code: { contains: "EWA34660W" } },
        { articleNumber: { contains: "EWA34660W" } },
        { productInfoPdfPath: { contains: "ewa34660w" } },
        { productInfoSummary: { contains: "EWA34660W" } },
        { productInfoExtractedText: { contains: "EWA34660W" } },
      ],
    },
    select: {
      id: true,
      code: true,
      articleNumber: true,
      name: true,
      productInfoPdfPath: true,
      productInfoSummary: true,
      productInfoKeyFacts: true,
      productInfoExtractedText: true,
    },
    orderBy: [{ code: "asc" }],
  });

  return candidates.filter(isTargetItem);
}

async function writeBackup(items) {
  const backupPath = path.resolve(__dirname, `washing-machine-product-programs-backup-${timestampForFile()}.json`);
  await fs.writeFile(
    backupPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      mutation: false,
      target: "EWA 34660 W washing machine product programs/functions update",
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        articleNumber: item.articleNumber,
        name: item.name,
        productInfoPdfPath: item.productInfoPdfPath,
        productInfoSummary: item.productInfoSummary,
        productInfoKeyFacts: item.productInfoKeyFacts,
        productInfoExtractedText: item.productInfoExtractedText,
      })),
    }, null, 2)}\n`,
    "utf8",
  );
  return backupPath;
}

async function main() {
  const items = await loadTargetItems();
  if (!items.length) {
    console.log("No active EWA 34660 W washing machine product-info items found.");
    return;
  }

  const backupPath = await writeBackup(items);
  const updated = [];
  const unchanged = [];

  for (const item of items) {
    const keyFactsUpdate = appendMissingKeyFacts(item.productInfoKeyFacts);
    const extractedTextUpdate = appendExtractedTextSection(item.productInfoExtractedText);
    const data = {};

    if (keyFactsUpdate.additions.length) {
      data.productInfoKeyFacts = keyFactsUpdate.facts;
    }
    if (extractedTextUpdate.changed) {
      data.productInfoExtractedText = extractedTextUpdate.text;
    }

    if (!Object.keys(data).length) {
      unchanged.push(item);
      continue;
    }

    await prisma.kitchenItem.update({
      where: { id: item.id },
      data,
    });

    updated.push({
      code: item.code,
      name: item.name,
      keyFactsAdded: keyFactsUpdate.additions.length,
      extractedTextUpdated: extractedTextUpdate.changed,
    });
  }

  console.log("Washing machine product programs update");
  console.log("=======================================");
  console.log(`Target items found: ${items.length}`);
  console.log(`Items updated: ${updated.length}`);
  console.log(`Items unchanged: ${unchanged.length}`);
  console.log(`Backup path: ${path.relative(process.cwd(), backupPath)}`);
  updated.forEach((item) => {
    console.log(`- ${item.code} ${item.name}: ${item.keyFactsAdded} key fact(s) added; extracted text updated: ${item.extractedTextUpdated ? "yes" : "no"}`);
  });
}

main()
  .catch((error) => {
    console.error("Washing machine product programs update failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
