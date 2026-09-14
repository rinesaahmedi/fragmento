const crypto = require("crypto");

const DEFAULT_CONTRACT_PREFIXES = ["111", "670"];
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;
const ARC_IMAGE_PATTERN = /^AB[-_ ](\d{6})_product\.(jpe?g)$/i;

function parseArcImageFileName(fileName) {
  const normalized = String(fileName || "").trim();
  const match = ARC_IMAGE_PATTERN.exec(normalized);
  return match ? { abCode: match[1], fileName: normalized } : null;
}

function buildContractNumber(contractPrefix, abCode) {
  return `${contractPrefix}${abCode}`;
}

function validateContractPrefixes(value) {
  if (!Array.isArray(value) || !value.length) {
    throw new Error("Select at least one ARC contract prefix.");
  }
  const prefixes = [...new Set(value.map((prefix) => String(prefix || "").trim()))];
  if (prefixes.some((prefix) => !DEFAULT_CONTRACT_PREFIXES.includes(prefix))) {
    throw new Error("ARC contract prefixes must be 111 or 670.");
  }
  return prefixes;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function validateImageMetadata(image) {
  const parsed = parseArcImageFileName(image?.fileName);
  if (!parsed || parsed.abCode !== String(image?.abCode || "")) {
    throw new Error(`Invalid ARC product image filename: ${image?.fileName || "missing filename"}.`);
  }
  const byteLength = Number(image?.byteLength);
  if (!Number.isInteger(byteLength) || byteLength <= 0 || byteLength > MAX_PREVIEW_BYTES) {
    throw new Error(`${parsed.fileName} exceeds the 8 MB ARC sketch limit or has an invalid size.`);
  }
  const digest = String(image?.sha256 || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error(`${parsed.fileName} has an invalid SHA-256 digest.`);
  }
  return { ...parsed, byteLength, sha256: digest };
}

function validateImageBytes(image) {
  const metadata = validateImageMetadata(image);
  const bytes = Buffer.from(image?.bytes || []);
  if (bytes.length !== metadata.byteLength || bytes.length > MAX_PREVIEW_BYTES) {
    throw new Error(`${metadata.fileName} size does not match its import manifest.`);
  }
  if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new Error(`${metadata.fileName} is not a valid JPEG file.`);
  }
  if (sha256(bytes) !== metadata.sha256) {
    throw new Error(`${metadata.fileName} does not match its SHA-256 digest.`);
  }
  return { ...metadata, bytes, mimeType: "image/jpeg" };
}

function normalizeImages(images, { requireBytes = false } = {}) {
  if (!Array.isArray(images) || !images.length) {
    throw new Error("No ARC product images were supplied.");
  }
  const normalized = images.map((image) => (
    requireBytes ? validateImageBytes(image) : validateImageMetadata(image)
  ));
  const seen = new Set();
  for (const image of normalized) {
    if (seen.has(image.abCode)) {
      throw new Error(`More than one image maps to AB ${image.abCode}.`);
    }
    seen.add(image.abCode);
  }
  return normalized;
}

function summarizeEntries(entries) {
  return entries.reduce((summary, entry) => {
    summary[entry.action] = (summary[entry.action] || 0) + 1;
    return summary;
  }, { create: 0, update: 0, unchanged: 0, conflict: 0 });
}

async function buildImportPlan(client, rawImages, rawPrefixes) {
  const images = normalizeImages(rawImages);
  const prefixes = validateContractPrefixes(rawPrefixes);
  const requested = images.flatMap((image) => prefixes.map((prefix) => ({
    ...image,
    prefix,
    contractNumber: buildContractNumber(prefix, image.abCode),
  })));
  const existingContracts = await client.kitchenContract.findMany({
    where: { contractNumber: { in: requested.map((entry) => entry.contractNumber) } },
    select: {
      id: true,
      contractNumber: true,
      contractType: true,
      claimPlanAsset: {
        select: {
          previewBytes: true,
          previewMimeType: true,
          previewFileName: true,
        },
      },
    },
  });
  const existingByNumber = new Map(existingContracts.map((contract) => [contract.contractNumber, contract]));

  const entries = requested.map((entry) => {
    const existing = existingByNumber.get(entry.contractNumber) || null;
    let action = "create";
    let reason = "";
    if (existing?.contractType !== undefined && existing.contractType !== "ARC") {
      action = "conflict";
      reason = `Contract ${entry.contractNumber} already exists as ${existing.contractType}.`;
    } else if (existing) {
      const currentBytes = Buffer.from(existing.claimPlanAsset?.previewBytes || []);
      const isCurrent = existing.claimPlanAsset?.previewMimeType === "image/jpeg"
        && existing.claimPlanAsset?.previewFileName === entry.fileName
        && currentBytes.length === entry.byteLength
        && sha256(currentBytes) === entry.sha256;
      action = isCurrent ? "unchanged" : "update";
    }
    return {
      abCode: entry.abCode,
      fileName: entry.fileName,
      prefix: entry.prefix,
      contractNumber: entry.contractNumber,
      action,
      reason,
    };
  });
  return { entries, summary: summarizeEntries(entries) };
}

async function applyImport(prisma, rawImages, rawPrefixes) {
  const images = normalizeImages(rawImages, { requireBytes: true });
  const prefixes = validateContractPrefixes(rawPrefixes);

  return prisma.$transaction(async (tx) => {
    const plan = await buildImportPlan(tx, images, prefixes);
    const imageByAbCode = new Map(images.map((image) => [image.abCode, image]));
    const needsCreate = plan.entries.some((entry) => entry.action === "create");
    const pdfOnlyKitchen = needsCreate
      ? await tx.kitchen.upsert({
          where: { slug: "pdf-only-kitchen" },
          update: {},
          create: {
            slug: "pdf-only-kitchen",
            name: "Archived kitchen plan",
            status: "DRAFT",
            description: "Reference-only kitchen shell for contracts that have a PDF plan but no item data.",
          },
        })
      : null;

    for (const entry of plan.entries) {
      if (entry.action === "unchanged" || entry.action === "conflict") continue;
      const image = imageByAbCode.get(entry.abCode);
      let contract;
      if (entry.action === "create") {
        contract = await tx.kitchenContract.create({
          data: {
            contractNumber: entry.contractNumber,
            contractType: "ARC",
            kitchenId: pdfOnlyKitchen.id,
            isActive: true,
          },
          select: { id: true },
        });
      } else {
        contract = await tx.kitchenContract.findUnique({
          where: { contractNumber: entry.contractNumber },
          select: { id: true },
        });
      }
      await tx.kitchenContractClaimPlanAsset.upsert({
        where: { kitchenContractId: contract.id },
        update: {
          previewBytes: image.bytes,
          previewMimeType: "image/jpeg",
          previewFileName: image.fileName,
        },
        create: {
          kitchenContractId: contract.id,
          previewBytes: image.bytes,
          previewMimeType: "image/jpeg",
          previewFileName: image.fileName,
        },
      });
    }
    return plan;
  }, { timeout: 60_000 });
}

module.exports = {
  ARC_IMAGE_PATTERN,
  DEFAULT_CONTRACT_PREFIXES,
  MAX_PREVIEW_BYTES,
  applyImport,
  buildContractNumber,
  buildImportPlan,
  normalizeImages,
  parseArcImageFileName,
  sha256,
  summarizeEntries,
  validateContractPrefixes,
};
