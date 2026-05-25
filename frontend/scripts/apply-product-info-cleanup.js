const fs = require("fs/promises");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PROPOSALS_PATH = path.resolve(__dirname, "product-info-cleanup-proposals.json");
const SUPPORTED_FIELDS = new Set([
  "productInfoSummary",
  "productInfoKeyFacts",
  "productInfoExtractedText",
]);

function hasApplyFlag() {
  return process.argv.includes("--apply");
}

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

function keyFactsTextToJson(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function currentFieldText(item, field) {
  if (field === "productInfoKeyFacts") {
    return normalizeKeyFacts(item.productInfoKeyFacts).join("\n");
  }

  return String(item[field] || "");
}

function updateValueForField(field, afterText) {
  if (field === "productInfoKeyFacts") {
    return keyFactsTextToJson(afterText);
  }

  return String(afterText || "");
}

async function loadProposalReport() {
  const raw = await fs.readFile(PROPOSALS_PATH, "utf8");
  return JSON.parse(raw);
}

function flattenProposalFields(report) {
  return (Array.isArray(report.proposals) ? report.proposals : []).flatMap((item) => {
    const proposals = Array.isArray(item.proposals) ? item.proposals : [];
    return proposals.map((proposal) => ({
      itemId: item.id,
      code: item.code,
      name: item.name,
      field: proposal.field,
      beforeText: String(proposal.beforeText || ""),
      afterText: String(proposal.afterText || ""),
      reason: proposal.reason || "",
    }));
  });
}

async function loadDbItems(itemIds) {
  const uniqueIds = Array.from(new Set(itemIds.filter(Boolean)));
  const items = await prisma.kitchenItem.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      code: true,
      name: true,
      productInfoSummary: true,
      productInfoKeyFacts: true,
      productInfoExtractedText: true,
    },
  });

  return new Map(items.map((item) => [item.id, item]));
}

function validateReport(report) {
  if (!report || report.mutation !== false) {
    throw new Error("Refusing to apply: proposal report must have mutation: false.");
  }

  if (!Array.isArray(report.proposals)) {
    throw new Error("Refusing to apply: proposal report has no proposals array.");
  }
}

function validateFieldProposals(fieldProposals, dbItemsById) {
  const readyByItemId = new Map();
  const skippedMissingItems = [];
  const skippedUnsupportedFields = [];
  const skippedBeforeTextMismatches = [];

  for (const proposal of fieldProposals) {
    const dbItem = dbItemsById.get(proposal.itemId);
    if (!dbItem) {
      skippedMissingItems.push(proposal);
      continue;
    }

    if (!SUPPORTED_FIELDS.has(proposal.field)) {
      skippedUnsupportedFields.push(proposal);
      continue;
    }

    const currentText = currentFieldText(dbItem, proposal.field);
    if (currentText !== proposal.beforeText) {
      skippedBeforeTextMismatches.push({
        ...proposal,
        currentText,
      });
      continue;
    }

    if (!readyByItemId.has(proposal.itemId)) {
      readyByItemId.set(proposal.itemId, {
        item: dbItem,
        fields: [],
      });
    }

    readyByItemId.get(proposal.itemId).fields.push(proposal);
  }

  return {
    readyByItemId,
    skippedMissingItems,
    skippedUnsupportedFields,
    skippedBeforeTextMismatches,
  };
}

async function writeBackup(readyByItemId) {
  const backupPath = path.resolve(__dirname, `product-info-cleanup-backup-${timestampForFile()}.json`);
  const items = Array.from(readyByItemId.values()).map(({ item }) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    productInfoSummary: item.productInfoSummary,
    productInfoKeyFacts: item.productInfoKeyFacts,
    productInfoExtractedText: item.productInfoExtractedText,
  }));

  await fs.writeFile(
    backupPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      sourceProposalPath: PROPOSALS_PATH,
      items,
    }, null, 2)}\n`,
    "utf8",
  );

  return backupPath;
}

async function applyUpdates(readyByItemId) {
  const results = [];

  for (const [itemId, entry] of readyByItemId.entries()) {
    const data = {};
    for (const proposal of entry.fields) {
      data[proposal.field] = updateValueForField(proposal.field, proposal.afterText);
    }

    await prisma.kitchenItem.update({
      where: { id: itemId },
      data,
    });

    results.push({
      itemId,
      code: entry.item.code,
      name: entry.item.name,
      fields: Object.keys(data),
    });
  }

  return results;
}

function printSummary({ updatedItems, validation, backupPath }) {
  const fieldsUpdated = updatedItems.reduce((sum, item) => sum + item.fields.length, 0);

  console.log("Product Information Cleanup Apply");
  console.log("=================================");
  console.log(`Items updated: ${updatedItems.length}`);
  console.log(`Fields updated: ${fieldsUpdated}`);
  console.log(`Fields skipped because beforeText mismatch: ${validation.skippedBeforeTextMismatches.length}`);
  console.log(`Fields skipped because unsupported field: ${validation.skippedUnsupportedFields.length}`);
  console.log(`Fields skipped because item was missing: ${validation.skippedMissingItems.length}`);
  console.log(`Backup path: ${backupPath ? path.relative(process.cwd(), backupPath) : "-"}`);

  if (updatedItems.length) {
    console.log("\nUpdated fields:");
    updatedItems.forEach((item) => {
      console.log(`  - ${item.code} ${item.name}: ${item.fields.join(", ")}`);
    });
  }

  if (validation.skippedBeforeTextMismatches.length) {
    console.log("\nSkipped beforeText mismatches:");
    validation.skippedBeforeTextMismatches.forEach((item) => {
      console.log(`  - ${item.code} ${item.name} ${item.field}`);
    });
  }

  if (validation.skippedUnsupportedFields.length) {
    console.log("\nSkipped unsupported fields:");
    validation.skippedUnsupportedFields.forEach((item) => {
      console.log(`  - ${item.code} ${item.name} ${item.field}`);
    });
  }
}

async function main() {
  if (!hasApplyFlag()) {
    console.error("Refusing to run: pass --apply to update approved product info cleanup proposals.");
    console.error("Example: npm run apply:product-info-cleanup -- --apply");
    process.exitCode = 1;
    return;
  }

  const report = await loadProposalReport();
  validateReport(report);

  const fieldProposals = flattenProposalFields(report);
  const dbItemsById = await loadDbItems(fieldProposals.map((proposal) => proposal.itemId));
  const validation = validateFieldProposals(fieldProposals, dbItemsById);

  let backupPath = "";
  let updatedItems = [];

  if (validation.readyByItemId.size) {
    backupPath = await writeBackup(validation.readyByItemId);
    updatedItems = await applyUpdates(validation.readyByItemId);
  }

  printSummary({ updatedItems, validation, backupPath });
}

main()
  .catch((error) => {
    console.error("Product information cleanup apply failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
