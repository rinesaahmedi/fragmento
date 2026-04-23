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

function parseKitchenStatus(value) {
  return Object.values(KitchenStatus).includes(value) ? value : KitchenStatus.DRAFT;
}

function parseItemType(value) {
  return Object.values(ItemType).includes(value) ? value : ItemType.COMPONENT;
}

function normalizeSlug(value) {
  return requiredString(value, "Slug").toLowerCase();
}

function validateSlug(value) {
  const slug = normalizeSlug(value);
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

function validateSortOrder(value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return 0;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error("Sort order must be a whole number.");
  }
  return parsed;
}

export function validateKitchenInput(formData) {
  return {
    name: requiredString(formData.get("name"), "Kitchen name"),
    slug: validateSlug(formData.get("slug")),
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
    price: validatePrice(formData.get("price")),
    iconKey: optionalString(formData.get("iconKey")),
    colorKey: optionalString(formData.get("colorKey")),
    componentKey: optionalString(formData.get("componentKey")),
    sortOrder: validateSortOrder(formData.get("sortOrder")),
    infoText: optionalString(formData.get("infoText")),
    isLocked: formData.get("isLocked") === "true",
    isActive: formData.get("isActive") === "true",
  };
}

export function validateKitchenContractInput(formData) {
  return {
    contractNumber: requiredString(formData.get("contractNumber"), "Contract number"),
    ownerId: optionalString(formData.get("ownerId")),
    country: optionalString(formData.get("country")),
    city: optionalString(formData.get("city")),
    postalCode: optionalString(formData.get("postalCode")),
    address1: optionalString(formData.get("address1")),
    address2: optionalString(formData.get("address2")),
    building: optionalString(formData.get("building")),
    floor: optionalString(formData.get("floor")),
    unitNumber: optionalString(formData.get("unitNumber")),
    notes: optionalString(formData.get("notes")),
  };
}

export function validatePropertyOwnerInput(formData) {
  return {
    firstName: requiredString(formData.get("firstName"), "First name"),
    lastName: requiredString(formData.get("lastName"), "Last name"),
    email: optionalString(formData.get("email")),
    phone: optionalString(formData.get("phone")),
    notes: optionalString(formData.get("notes")),
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
