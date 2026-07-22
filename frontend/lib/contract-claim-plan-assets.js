import { randomUUID } from "crypto";
import path from "path";

const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizeContractNumber(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function isUploadedFile(value) {
  return Boolean(value && typeof value.arrayBuffer === "function" && Number(value.size) > 0);
}

function safeFileName(value, fallback) {
  const fileName = path.basename(String(value || fallback))
    .normalize("NFKD")
    .replace(/[^\w. -]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return fileName || fallback;
}

async function readPreviewFile(file) {
  if (!isUploadedFile(file)) return null;
  if (file.size > MAX_PREVIEW_BYTES) {
    throw new Error("Sketch image is too large. Maximum size is 8 MB.");
  }

  const fileName = safeFileName(file.name, "kitchen-sketch.jpg");
  const extension = path.extname(fileName).toLowerCase();
  const mimeType = String(file.type || "").toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension) || (mimeType && !IMAGE_MIME_TYPES.has(mimeType))) {
    throw new Error("Sketch must be a JPG, PNG, or WebP image.");
  }

  const resolvedMimeType = mimeType || (extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg");
  return {
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: resolvedMimeType,
    fileName,
  };
}

async function readPdfFile(file) {
  if (!isUploadedFile(file)) return null;
  if (file.size > MAX_PDF_BYTES) {
    throw new Error("Kitchen plan PDF is too large. Maximum size is 20 MB.");
  }

  const fileName = safeFileName(file.name, "kitchen-plan.pdf");
  const mimeType = String(file.type || "").toLowerCase();
  if (!/\.pdf$/i.test(fileName) || (mimeType && mimeType !== "application/pdf")) {
    throw new Error("Kitchen plan must be a PDF file.");
  }

  return {
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: "application/pdf",
    fileName,
  };
}

export async function readContractClaimPlanUploads(formData) {
  const [preview, pdf] = await Promise.all([
    readPreviewFile(formData.get("claimPlanPreviewFile")),
    readPdfFile(formData.get("claimPlanPdfFile")),
  ]);
  return { preview, pdf };
}

export function hasContractClaimPlanUpload(uploads) {
  return Boolean(uploads?.preview || uploads?.pdf);
}

export async function upsertContractClaimPlanUploads(client, kitchenContractId, uploads) {
  if (!kitchenContractId || !hasContractClaimPlanUpload(uploads)) return;

  const preview = uploads.preview || {};
  const pdf = uploads.pdf || {};
  await client.$executeRaw`
    INSERT INTO "KitchenContractClaimPlanAsset" (
      "id",
      "kitchenContractId",
      "previewBytes",
      "previewMimeType",
      "previewFileName",
      "pdfBytes",
      "pdfMimeType",
      "pdfFileName",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${kitchenContractId},
      ${preview.bytes || null},
      ${preview.mimeType || null},
      ${preview.fileName || null},
      ${pdf.bytes || null},
      ${pdf.mimeType || null},
      ${pdf.fileName || null},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("kitchenContractId") DO UPDATE SET
      "previewBytes" = COALESCE(EXCLUDED."previewBytes", "KitchenContractClaimPlanAsset"."previewBytes"),
      "previewMimeType" = COALESCE(EXCLUDED."previewMimeType", "KitchenContractClaimPlanAsset"."previewMimeType"),
      "previewFileName" = COALESCE(EXCLUDED."previewFileName", "KitchenContractClaimPlanAsset"."previewFileName"),
      "pdfBytes" = COALESCE(EXCLUDED."pdfBytes", "KitchenContractClaimPlanAsset"."pdfBytes"),
      "pdfMimeType" = COALESCE(EXCLUDED."pdfMimeType", "KitchenContractClaimPlanAsset"."pdfMimeType"),
      "pdfFileName" = COALESCE(EXCLUDED."pdfFileName", "KitchenContractClaimPlanAsset"."pdfFileName"),
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export async function getPublicContractClaimPlanAsset(client, contractNumber, kind) {
  const normalizedContractNumber = normalizeContractNumber(contractNumber);
  if (!normalizedContractNumber || !["preview", "pdf"].includes(kind)) return null;

  const rows = kind === "preview"
    ? await client.$queryRaw`
        SELECT asset."previewBytes" AS "bytes", asset."previewMimeType" AS "mimeType", asset."previewFileName" AS "fileName"
        FROM "KitchenContractClaimPlanAsset" asset
        JOIN "KitchenContract" contract ON contract."id" = asset."kitchenContractId"
        WHERE contract."contractNumber" = ${normalizedContractNumber}
          AND contract."isActive" = true
          AND asset."previewBytes" IS NOT NULL
        LIMIT 1
      `
    : await client.$queryRaw`
        SELECT asset."pdfBytes" AS "bytes", asset."pdfMimeType" AS "mimeType", asset."pdfFileName" AS "fileName"
        FROM "KitchenContractClaimPlanAsset" asset
        JOIN "KitchenContract" contract ON contract."id" = asset."kitchenContractId"
        WHERE contract."contractNumber" = ${normalizedContractNumber}
          AND contract."isActive" = true
          AND asset."pdfBytes" IS NOT NULL
        LIMIT 1
      `;
  return rows[0] || null;
}
