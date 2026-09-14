const fs = require("fs/promises");
const path = require("path");
const {
  ARC_IMAGE_PATTERN,
  DEFAULT_CONTRACT_PREFIXES,
  MAX_PREVIEW_BYTES,
  applyImport,
  buildContractNumber,
  buildImportPlan,
  parseArcImageFileName,
  sha256,
  validateContractPrefixes,
} = require("../lib/arc-kitchen-import-core.cjs");

const DEFAULT_INPUT_DIR = path.resolve(__dirname, "../public/asc jpg");

function parseArgs(argv) {
  const options = { apply: false, inputDir: DEFAULT_INPUT_DIR, contractPrefixes: [...DEFAULT_CONTRACT_PREFIXES] };
  for (const argument of argv) {
    if (argument === "--apply") options.apply = true;
    else if (argument === "--dry-run") options.apply = false;
    else if (argument.startsWith("--input=")) options.inputDir = path.resolve(process.cwd(), argument.slice("--input=".length));
    else if (argument.startsWith("--contract-prefix=")) options.contractPrefixes = [argument.slice("--contract-prefix=".length).trim()];
    else if (argument.startsWith("--contract-prefixes=")) options.contractPrefixes = argument.slice("--contract-prefixes=".length).split(",").map((value) => value.trim()).filter(Boolean);
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  options.contractPrefixes = validateContractPrefixes(options.contractPrefixes);
  return options;
}

function printHelp() {
  console.log(`Import ARC kitchen sketches from JPG files.

Usage:
  npm run import:arc-kitchens                 Preview database changes
  npm run import:arc-kitchens -- --apply      Apply database changes

Options:
  --apply                  Create/update ARC contracts and sketch assets
  --dry-run                Preview changes (default)
  --input=<directory>      Image directory (default: public/asc jpg)
  --contract-prefix=<n>    Import only one prefix
  --contract-prefixes=<n>  Comma-separated prefixes (default: 111,670)
  --help                   Show this help

Expected filename: AB-103796_product.jpg
Resulting contracts: 111103796 and 670103796`);
}

async function readArcImages(inputDir) {
  const directoryEntries = await fs.readdir(inputDir, { withFileTypes: true });
  const images = [];
  for (const entry of directoryEntries) {
    if (!entry.isFile()) continue;
    const parsed = parseArcImageFileName(entry.name);
    if (!parsed) continue;
    const bytes = await fs.readFile(path.join(inputDir, entry.name));
    if (bytes.length > MAX_PREVIEW_BYTES) throw new Error(`${entry.name} exceeds the 8 MB ARC sketch limit.`);
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error(`${entry.name} is not a valid JPEG file.`);
    images.push({ ...parsed, bytes, byteLength: bytes.length, sha256: sha256(bytes), mimeType: "image/jpeg" });
  }
  images.sort((left, right) => left.abCode.localeCompare(right.abCode));
  if (!images.length) throw new Error(`No files matching ${ARC_IMAGE_PATTERN} were found in ${inputDir}.`);
  return images;
}

function printPlan(plan, apply) {
  console.log(`${apply ? "Applying" : "Dry run for"} ${plan.entries.length} ARC kitchen sketch(es):`);
  for (const row of plan.entries) console.log(`  ${row.action.toUpperCase()} ${row.contractNumber} <- ${row.fileName}${row.reason ? ` (${row.reason})` : ""}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const images = await readArcImages(options.inputDir);
    const plan = await buildImportPlan(prisma, images, options.contractPrefixes);
    printPlan(plan, options.apply);
    if (plan.summary.conflict) throw new Error("Resolve conflicting non-ARC contract numbers before importing.");
    if (!options.apply) {
      console.log("Dry run only. Re-run with --apply to write these changes.");
      return;
    }
    const result = await applyImport(prisma, images, options.contractPrefixes);
    const verification = await buildImportPlan(prisma, images, options.contractPrefixes);
    if (verification.entries.some((entry) => entry.action !== "unchanged")) throw new Error("Verification failed after the ARC kitchen import.");
    console.log(`ARC kitchen import complete. Created: ${result.summary.create}. Updated: ${result.summary.update}. Unchanged: ${result.summary.unchanged}. Verified: ${verification.entries.length}.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`ARC kitchen import failed: ${error.message || error}`);
    process.exitCode = 1;
  });
}

module.exports = { ARC_IMAGE_PATTERN, DEFAULT_CONTRACT_PREFIXES, buildContractNumber, parseArcImageFileName, parseArgs, readArcImages };
