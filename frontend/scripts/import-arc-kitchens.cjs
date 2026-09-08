const fs = require("fs/promises");
const path = require("path");

const DEFAULT_INPUT_DIR = path.resolve(__dirname, "../public/asc jpg");
const DEFAULT_CONTRACT_PREFIXES = ["111", "670"];
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;
const ARC_IMAGE_PATTERN = /^AB[-_ ](\d{6})_product\.(jpe?g)$/i;

function parseArgs(argv) {
  const options = {
    apply: false,
    inputDir: DEFAULT_INPUT_DIR,
    contractPrefixes: [...DEFAULT_CONTRACT_PREFIXES],
  };

  for (const argument of argv) {
    if (argument === "--apply") {
      options.apply = true;
    } else if (argument === "--dry-run") {
      options.apply = false;
    } else if (argument.startsWith("--input=")) {
      options.inputDir = path.resolve(process.cwd(), argument.slice("--input=".length));
    } else if (argument.startsWith("--contract-prefix=")) {
      options.contractPrefixes = [argument.slice("--contract-prefix=".length).trim()];
    } else if (argument.startsWith("--contract-prefixes=")) {
      options.contractPrefixes = argument
        .slice("--contract-prefixes=".length)
        .split(",")
        .map((prefix) => prefix.trim())
        .filter(Boolean);
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (
    !options.contractPrefixes.length
    || options.contractPrefixes.some((prefix) => !/^\d+$/.test(prefix))
  ) {
    throw new Error("Contract prefixes must contain digits only.");
  }
  options.contractPrefixes = [...new Set(options.contractPrefixes)];

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

function parseArcImageFileName(fileName) {
  const match = ARC_IMAGE_PATTERN.exec(fileName);
  return match ? { abCode: match[1], fileName } : null;
}

function buildContractNumber(contractPrefix, abCode) {
  return `${contractPrefix}${abCode}`;
}

async function readArcImages(inputDir, contractPrefixes) {
  const directoryEntries = await fs.readdir(inputDir, { withFileTypes: true });
  const images = [];

  for (const entry of directoryEntries) {
    if (!entry.isFile()) continue;
    const parsed = parseArcImageFileName(entry.name);
    if (!parsed) continue;

    const filePath = path.join(inputDir, entry.name);
    const bytes = await fs.readFile(filePath);
    if (bytes.length > MAX_PREVIEW_BYTES) {
      throw new Error(`${entry.name} exceeds the 8 MB ARC sketch limit.`);
    }
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      throw new Error(`${entry.name} is not a valid JPEG file.`);
    }

    for (const contractPrefix of contractPrefixes) {
      images.push({
        ...parsed,
        bytes,
        filePath,
        mimeType: "image/jpeg",
        contractPrefix,
        contractNumber: buildContractNumber(contractPrefix, parsed.abCode),
      });
    }
  }

  images.sort((left, right) => left.abCode.localeCompare(right.abCode));
  if (!images.length) {
    throw new Error(`No files matching ${ARC_IMAGE_PATTERN} were found in ${inputDir}.`);
  }

  const contractNumbers = new Set();
  for (const image of images) {
    if (contractNumbers.has(image.contractNumber)) {
      throw new Error(`More than one image maps to contract ${image.contractNumber}.`);
    }
    contractNumbers.add(image.contractNumber);
  }

  return images;
}

async function buildImportPlan(prisma, images) {
  const existingContracts = await prisma.kitchenContract.findMany({
    where: { contractNumber: { in: images.map((image) => image.contractNumber) } },
    select: {
      id: true,
      contractNumber: true,
      contractType: true,
      projectId: true,
      claimPlanPdfPath: true,
      claimPlanPreviewPath: true,
      isActive: true,
      building: true,
      floor: true,
      unitNumber: true,
      notes: true,
      kitchen: { select: { slug: true } },
      claimPlanAsset: {
        select: {
          previewBytes: true,
          previewMimeType: true,
          previewFileName: true,
        },
      },
    },
  });
  const existingByNumber = new Map(
    existingContracts.map((contract) => [contract.contractNumber, contract]),
  );

  return images.map((image) => {
    const existing = existingByNumber.get(image.contractNumber) || null;
    if (existing && existing.contractType !== "ARC") {
      throw new Error(
        `Contract ${image.contractNumber} already exists as ${existing.contractType}; no data was changed.`,
      );
    }

    const alreadyCurrent = Boolean(
      existing
      && existing.kitchen.slug === "pdf-only-kitchen"
      && existing.projectId === null
      && existing.claimPlanPdfPath === null
      && existing.claimPlanPreviewPath === null
      && existing.isActive
      && existing.building === null
      && existing.floor === null
      && existing.unitNumber === null
      && existing.notes === null
      && existing.claimPlanAsset?.previewMimeType === image.mimeType
      && existing.claimPlanAsset?.previewFileName === image.fileName
      && Buffer.from(existing.claimPlanAsset?.previewBytes || []).equals(image.bytes)
    );

    return {
      ...image,
      action: alreadyCurrent ? "unchanged" : existing ? "update" : "create",
      existingFileName: existing?.claimPlanAsset?.previewFileName || "",
    };
  });
}

function printPlan(plan, apply) {
  console.log(`${apply ? "Applying" : "Dry run for"} ${plan.length} ARC kitchen sketch(es):`);
  for (const row of plan) {
    const replacement = row.action === "update" && row.existingFileName
      ? ` (replaces ${row.existingFileName})`
      : "";
    console.log(`  ${row.action.toUpperCase()} ${row.contractNumber} <- ${row.fileName}${replacement}`);
  }
}

async function applyImport(prisma, plan) {
  return prisma.$transaction(async (tx) => {
    const pdfOnlyKitchen = await tx.kitchen.upsert({
      where: { slug: "pdf-only-kitchen" },
      update: {},
      create: {
        slug: "pdf-only-kitchen",
        name: "Archived kitchen plan",
        status: "DRAFT",
        description: "Reference-only kitchen shell for contracts that have a PDF plan but no item data.",
      },
    });

    for (const row of plan) {
      if (row.action === "unchanged") continue;

      const contract = await tx.kitchenContract.upsert({
        where: { contractNumber: row.contractNumber },
        update: {
          contractType: "ARC",
          kitchenId: pdfOnlyKitchen.id,
          projectId: null,
          claimPlanPdfPath: null,
          claimPlanPreviewPath: null,
          isActive: true,
          building: null,
          floor: null,
          unitNumber: null,
          notes: null,
        },
        create: {
          contractNumber: row.contractNumber,
          contractType: "ARC",
          kitchenId: pdfOnlyKitchen.id,
          isActive: true,
        },
      });

      await tx.kitchenContractClaimPlanAsset.upsert({
        where: { kitchenContractId: contract.id },
        update: {
          previewBytes: row.bytes,
          previewMimeType: row.mimeType,
          previewFileName: row.fileName,
        },
        create: {
          kitchenContractId: contract.id,
          previewBytes: row.bytes,
          previewMimeType: row.mimeType,
          previewFileName: row.fileName,
        },
      });
    }

    return {
      created: plan.filter((row) => row.action === "create").length,
      updated: plan.filter((row) => row.action === "update").length,
      unchanged: plan.filter((row) => row.action === "unchanged").length,
    };
  }, { timeout: 60_000 });
}

async function verifyImport(prisma, plan) {
  const contracts = await prisma.kitchenContract.findMany({
    where: { contractNumber: { in: plan.map((row) => row.contractNumber) } },
    select: {
      contractNumber: true,
      contractType: true,
      isActive: true,
      kitchen: { select: { slug: true } },
      claimPlanAsset: {
        select: {
          previewBytes: true,
          previewMimeType: true,
          previewFileName: true,
        },
      },
    },
  });
  const contractByNumber = new Map(
    contracts.map((contract) => [contract.contractNumber, contract]),
  );

  for (const row of plan) {
    const contract = contractByNumber.get(row.contractNumber);
    const asset = contract?.claimPlanAsset;
    if (
      contract?.contractType !== "ARC"
      || !contract.isActive
      || contract.kitchen?.slug !== "pdf-only-kitchen"
      || asset?.previewMimeType !== row.mimeType
      || asset?.previewFileName !== row.fileName
      || !Buffer.from(asset?.previewBytes || []).equals(row.bytes)
    ) {
      throw new Error(`Verification failed for ARC contract ${row.contractNumber}.`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const images = await readArcImages(options.inputDir, options.contractPrefixes);
    const plan = await buildImportPlan(prisma, images);
    printPlan(plan, options.apply);

    if (!options.apply) {
      console.log("Dry run only. Re-run with --apply to write these changes.");
      return;
    }

    const result = await applyImport(prisma, plan);
    await verifyImport(prisma, plan);
    console.log(
      `ARC kitchen import complete. Created: ${result.created}. Updated: ${result.updated}. Unchanged: ${result.unchanged}. Verified: ${plan.length}.`,
    );
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

module.exports = {
  ARC_IMAGE_PATTERN,
  DEFAULT_CONTRACT_PREFIXES,
  buildContractNumber,
  parseArcImageFileName,
  parseArgs,
  readArcImages,
};
