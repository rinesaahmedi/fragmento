const PDF_PATH_PREFIX = "/pdfs/";
const PREVIEW_PATH_PREFIXES = ["/jpg/", "/img/"];

export const PDF_ONLY_KITCHEN_SLUG = "pdf-only-kitchen";
export const PDF_ONLY_KITCHEN_NAME = "Archived kitchen plan";

export function normalizeServiceClaimPlanPdfPath(value) {
  const path = String(value || "").trim();
  if (!path) return "";

  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return "";
  }

  const isUploadedAssetPath = /^\/api\/service-claims\/contracts\/[^/]+\/plan-assets\/pdf$/.test(path);
  if (
    !(isUploadedAssetPath || (path.startsWith(PDF_PATH_PREFIX) && /\.pdf$/i.test(decodedPath)))
    || decodedPath.includes("..")
    || /[?#]/.test(path)
  ) {
    return "";
  }

  return path;
}

export function normalizeServiceClaimPlanPreviewPath(value) {
  const path = String(value || "").trim();
  if (!path) return "";

  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return "";
  }

  const isUploadedAssetPath = /^\/api\/service-claims\/contracts\/[^/]+\/plan-assets\/preview$/.test(path);
  if (
    !(isUploadedAssetPath || (
      PREVIEW_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
      && /\.(?:png|jpe?g|webp)$/i.test(decodedPath)
    ))
    || decodedPath.includes("..")
    || /[?#]/.test(path)
  ) {
    return "";
  }

  return path;
}

export function buildServiceClaimReferencePlan(contract) {
  const pdfPath = normalizeServiceClaimPlanPdfPath(contract?.claimPlanPdfPath);
  const previewImagePath = normalizeServiceClaimPlanPreviewPath(contract?.claimPlanPreviewPath);
  if (!pdfPath && !previewImagePath) return null;

  const kitchenSlug = String(contract?.kitchen?.slug || "").trim();
  const storedKitchenName = String(contract?.kitchen?.name || "").trim();

  return {
    selectionMode: "reference-pdf",
    referenceOnly: true,
    kitchenName: kitchenSlug === PDF_ONLY_KITCHEN_SLUG ? "" : storedKitchenName,
    kitchenSlug,
    pdfPath,
    previewImagePath,
    selectableComponentIds: [],
    selectableComponents: [],
    visibleComponentIds: [],
    claimParts: [],
  };
}

export async function ensurePdfOnlyKitchen(client) {
  return client.kitchen.upsert({
    where: { slug: PDF_ONLY_KITCHEN_SLUG },
    update: {},
    create: {
      slug: PDF_ONLY_KITCHEN_SLUG,
      name: PDF_ONLY_KITCHEN_NAME,
      status: "DRAFT",
      description: "Reference-only kitchen shell for contracts that have a PDF plan but no item data.",
    },
  });
}
