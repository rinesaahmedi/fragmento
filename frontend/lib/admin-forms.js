import { ItemType, KitchenStatus, Prisma } from "@prisma/client";

function requiredString(value, label) {
  const nextValue = String(value || "").trim();
  if (!nextValue) {
    throw new Error(`${label} is required.`);
  }
  return nextValue;
}

function optionalString(value) {
  const nextValue = String(value || "").trim();
  return nextValue || null;
}

function optionalId(value) {
  const nextValue = String(value || "").trim();
  return nextValue || null;
}

function optionalStringList(value) {
  const items = String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim().replace(/^-\s*/, ""))
    .filter(Boolean);
  return items.length ? items : null;
}

const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed", "archived"];

function parseKitchenStatus(value) {
  return Object.values(KitchenStatus).includes(value) ? value : KitchenStatus.DRAFT;
}

function parseItemType(value) {
  return Object.values(ItemType).includes(value) ? value : ItemType.COMPONENT;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateSlug(value) {
  const slug = slugify(value);
  if (!slug) {
    throw new Error("Kitchen name or code is required to create a URL.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must use lowercase letters, numbers, and hyphens only.");
  }
  return slug;
}

function validatePrice(value) {
  const rawValue = requiredString(value, "Price");
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawValue)) {
    throw new Error("Price must be a number with up to 2 decimals.");
  }
  return rawValue;
}

function validateOptionalPrice(value, label) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawValue)) {
    throw new Error(`${label} must be a number with up to 2 decimals.`);
  }
  return rawValue;
}

function validateSortOrder(value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return 0;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error("Sort order must be a whole number.");
  }
  return parsed;
}

function validateOptionalPositiveInteger(value, label) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return null;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive whole number.`);
  }
  return parsed;
}

function validateOptionalNonNegativeInteger(value, label) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return null;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a whole number.`);
  }
  return parsed;
}

function validateOptionalNonNegativeCentimetersAsMillimeters(value, label) {
  const rawValue = String(value ?? "").trim().replace(",", ".");
  if (!rawValue) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawValue)) {
    throw new Error(`${label} must be a number in centimeters.`);
  }
  const centimeters = Number(rawValue);
  if (!Number.isFinite(centimeters) || centimeters < 0) {
    throw new Error(`${label} must be a number in centimeters.`);
  }
  return Math.round(centimeters * 10);
}

export const DEFAULT_KITCHEN_PROGRAMM_ID = "IP 2200";

export function validateKitchenInput(formData, options = {}) {
  const name = requiredString(formData.get("name"), "Kitchen name");
  const kitchenCode = optionalString(formData.get("kitchenCode"));
  const programmId = optionalString(formData.get("programmId")) || DEFAULT_KITCHEN_PROGRAMM_ID;
  const slugSource = formData.get("slug") || options.fallbackSlug || kitchenCode || name;

  return {
    name,
    slug: validateSlug(slugSource),
    kitchenCode,
    programmId,
    status: parseKitchenStatus(String(formData.get("status") || "")),
    description: optionalString(formData.get("description")),
  };
}

export function validateKitchenItemInput(formData) {
  return {
    itemType: parseItemType(String(formData.get("itemType") || "")),
    code: requiredString(formData.get("code"), "Item code"),
    articleNumber: optionalString(formData.get("articleNumber")),
    name: requiredString(formData.get("name"), "Item name"),
    nameDe: optionalString(formData.get("nameDe")),
    price: validatePrice(formData.get("price")),
    articleBasePrice: validateOptionalPrice(formData.get("articleBasePrice"), "Article price"),
    iconKey: optionalString(formData.get("iconKey")),
    colorKey: optionalString(formData.get("colorKey")),
    componentKey: optionalString(formData.get("componentKey")),
    sortOrder: validateSortOrder(formData.get("sortOrder")),
    infoText: optionalString(formData.get("infoText")),
    productImagePath: optionalString(formData.get("productImagePath")),
    productInfoPdfPath: optionalString(formData.get("productInfoPdfPath")),
    productInfoSummary: optionalString(formData.get("productInfoSummary")),
    productInfoKeyFacts: optionalStringList(formData.get("productInfoKeyFacts")),
    productInfoExtractedText: optionalString(formData.get("productInfoExtractedText")),
    productInfoUpdatedAt: optionalString(formData.get("productInfoPdfPath")) ? new Date() : null,
    catalogArticleId: optionalId(formData.get("catalogArticleId")),
    catalogBlendeId: optionalId(formData.get("catalogBlendeId")),
    catalogBlendeQuantity: validateOptionalPositiveInteger(formData.get("catalogBlendeQuantity"), "Blende quantity"),
    catalogServiceId: optionalId(formData.get("catalogServiceId")),
    isLocked: formData.get("isLocked") === "true",
    isActive: formData.get("isActive") === "true",
  };
}

export function validateCatalogAddonInput(formData, entityLabel = "Catalog item") {
  return {
    code: requiredString(formData.get("code"), `${entityLabel} code`),
    name: requiredString(formData.get("name"), `${entityLabel} name`),
    nameDe: optionalString(formData.get("nameDe")),
    description: optionalString(formData.get("description")),
    price: validatePrice(formData.get("price")),
    isActive: formData.get("isActive") === "true",
  };
}

export function validateCatalogArticleInput(formData) {
  return {
    articleNumber: requiredString(formData.get("articleNumber"), "Article number"),
    name: requiredString(formData.get("name"), "Article name"),
    nameDe: optionalString(formData.get("nameDe")),
    description: optionalString(formData.get("description")),
    widthMm: validateOptionalNonNegativeCentimetersAsMillimeters(formData.get("widthMm"), "Width"),
    heightMm: validateOptionalNonNegativeCentimetersAsMillimeters(formData.get("heightMm"), "Height"),
    depthMm: validateOptionalNonNegativeCentimetersAsMillimeters(formData.get("depthMm"), "Depth"),
    price: validatePrice(formData.get("price")),
    itemType: parseItemType(String(formData.get("itemType") || "")),
    isFixedPricePackage: formData.get("isFixedPricePackage") === "true",
    isActive: formData.get("isActive") === "true",
  };
}

export function validateKitchenContractInput(formData, options = {}) {
  const contractNumber = requiredString(formData.get("contractNumber"), "Contract number");
  const housingCompanyId = optionalString(formData.get("housingCompanyId"));
  const projectId = optionalString(formData.get("projectId"));

  return {
    contractNumber,
    housingCompanyId,
    projectId,
    building: optionalString(formData.get("building")),
    floor: optionalString(formData.get("floor")),
    unitNumber: optionalString(formData.get("unitNumber")),
    notes: optionalString(formData.get("notes")),
  };
}

export function validatePropertyOwnerInput(formData) {
  return {
    name: requiredString(formData.get("name"), "Company name"),
    address: optionalString(formData.get("address")),
    email: optionalString(formData.get("email")),
    phone: optionalString(formData.get("phone")),
    notes: optionalString(formData.get("notes")),
  };
}

function propertyObjectFieldName(fieldNames, key) {
  return fieldNames?.[key] || key;
}

export function validatePropertyObjectInput(formData, fieldNames = {}) {
  const projectStatus = optionalString(formData.get(propertyObjectFieldName(fieldNames, "projectStatus")));
  if (projectStatus && !PROJECT_STATUSES.includes(projectStatus)) {
    throw new Error("Project status is invalid.");
  }

  return {
    name: requiredString(formData.get(propertyObjectFieldName(fieldNames, "name")), "Object name"),
    projectName: requiredString(formData.get(propertyObjectFieldName(fieldNames, "projectName")), "Project name"),
    projectCode: optionalString(formData.get(propertyObjectFieldName(fieldNames, "projectCode"))),
    projectStatus: projectStatus || "active",
    projectDescription: optionalString(formData.get(propertyObjectFieldName(fieldNames, "projectDescription"))),
    projectManagerName: optionalString(formData.get(propertyObjectFieldName(fieldNames, "projectManagerName"))),
    contactPhone: optionalString(formData.get(propertyObjectFieldName(fieldNames, "contactPhone"))),
    country: optionalString(formData.get(propertyObjectFieldName(fieldNames, "country"))),
    city: optionalString(formData.get(propertyObjectFieldName(fieldNames, "city"))),
    postalCode: optionalString(formData.get(propertyObjectFieldName(fieldNames, "postalCode"))),
    address1: optionalString(formData.get(propertyObjectFieldName(fieldNames, "address1"))),
    address2: optionalString(formData.get(propertyObjectFieldName(fieldNames, "address2"))),
  };
}

export function redirectWithFlash(request, pathname, type, message) {
  const [basePath, existingQuery = ""] = String(pathname || "/").split("?");
  const searchParams = new URLSearchParams(existingQuery);
  searchParams.set(type, message);
  const location = `${basePath || "/"}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
    },
  });
}

export function getFormMessage(searchParams, key) {
  const value = searchParams?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function mapAdminMutationError(error, entityLabel) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return `${entityLabel} conflicts with an existing record.`;
    }
    if (error.code === "P2025") {
      return `${entityLabel} was not found.`;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return `Could not save ${entityLabel.toLowerCase()}.`;
}
