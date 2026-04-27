import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mapAdminMutationError, redirectWithFlash, validateKitchenContractInput } from "../../../../lib/admin-forms";
import { isAddressVerificationRecordValid } from "../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../lib/auth";
import { listKitchenContractsForAdmin } from "../../../../lib/catalog";
import { prisma } from "../../../../lib/prisma";

export async function GET(request) {
  await requireAdminApi();
  const { searchParams } = new URL(request.url);
  return NextResponse.json(await listKitchenContractsForAdmin({
    kitchenId: searchParams.get("kitchenId") || "",
    housingCompanyId: searchParams.get("housingCompanyId") || searchParams.get("ownerId") || "",
    propertyObjectId: searchParams.get("propertyObjectId") || "",
    status: searchParams.get("status") || "",
    usage: searchParams.get("usage") || "",
    query: searchParams.get("q") || "",
  }));
}

function getReturnPath(formData, fallback) {
  const rawPath = String(formData.get("returnTo") || "").trim();
  return rawPath.startsWith("/admin/") ? rawPath : fallback;
}

function appendQueryParam(pathname, key, value) {
  const [basePath, existingQuery = ""] = String(pathname || "/").split("?");
  const searchParams = new URLSearchParams(existingQuery);
  searchParams.set(key, value);
  return `${basePath || "/"}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
}

function parseAddressVerificationRecord(rawValue) {
  const nextValue = String(rawValue || "").trim();
  if (!nextValue) return null;

  try {
    return JSON.parse(nextValue);
  } catch {
    return null;
  }
}

function inlineObjectFieldNames() {
  return {
    name: "inlineObjectName",
    contactPhone: "inlineObjectContactPhone",
    country: "inlineObjectCountry",
    city: "inlineObjectCity",
    postalCode: "inlineObjectPostalCode",
    address1: "inlineObjectAddress1",
    address2: "inlineObjectAddress2",
    addressVerification: "inlineObjectAddressVerification",
  };
}

function validateInlineObjectInput(formData) {
  const fields = inlineObjectFieldNames();
  const name = String(formData.get(fields.name) || "").trim();
  const hasAnyValue = [
    fields.name,
    fields.contactPhone,
    fields.country,
    fields.city,
    fields.postalCode,
    fields.address1,
    fields.address2,
  ].some((fieldName) => String(formData.get(fieldName) || "").trim());

  if (!hasAnyValue) {
    return null;
  }

  const data = {
    name,
    contactPhone: String(formData.get(fields.contactPhone) || "").trim() || null,
    country: String(formData.get(fields.country) || "").trim() || null,
    city: String(formData.get(fields.city) || "").trim() || null,
    postalCode: String(formData.get(fields.postalCode) || "").trim() || null,
    address1: String(formData.get(fields.address1) || "").trim() || null,
    address2: String(formData.get(fields.address2) || "").trim() || null,
  };
  if (!data.name) {
    throw new Error("Object name is required.");
  }

  const addressVerification = parseAddressVerificationRecord(formData.get(fields.addressVerification));
  if (!isAddressVerificationRecordValid(addressVerification, { ...data, contractNumber: data.name })) {
    throw new Error("Verify the object address before saving.");
  }

  return data;
}

export async function POST(request) {
  await requireAdminApi();
  let returnPath = "/admin/contracts";

  try {
    const formData = await request.formData();
    returnPath = getReturnPath(formData, "/admin/contracts");
    const kitchenId = String(formData.get("kitchenId") || "").trim();
    if (!kitchenId) {
      throw new Error("Kitchen is required.");
    }

    const inlineObject = validateInlineObjectInput(formData);
    const data = validateKitchenContractInput(formData, {
      allowInlineObject: true,
      hasInlineObject: Boolean(inlineObject),
    });

    let propertyObjectId = data.propertyObjectId;
    await prisma.$transaction(async (tx) => {
      if (data.housingCompanyId) {
        if (inlineObject) {
          propertyObjectId = randomUUID();
          await tx.$executeRaw`
            INSERT INTO "PropertyObject" ("id", "name", "housingCompanyId", "contactPhone", "country", "city", "postalCode", "address1", "address2", "createdAt", "updatedAt")
            VALUES (${propertyObjectId}, ${inlineObject.name}, ${data.housingCompanyId}, ${inlineObject.contactPhone}, ${inlineObject.country}, ${inlineObject.city}, ${inlineObject.postalCode}, ${inlineObject.address1}, ${inlineObject.address2}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
        } else {
          const [propertyObject] = await tx.$queryRaw`
            SELECT "id"
            FROM "PropertyObject"
            WHERE "id" = ${data.propertyObjectId}
              AND "housingCompanyId" = ${data.housingCompanyId}
            LIMIT 1
          `;
          if (!propertyObject) {
            throw new Error("Select a valid property object for the housing company.");
          }
        }
      }

      await tx.kitchenContract.create({
        data: {
          contractNumber: data.contractNumber,
          kitchenId,
          propertyObjectId,
          isActive: true,
          building: data.building,
          floor: data.floor,
          unitNumber: data.unitNumber,
          notes: data.notes,
        },
      });
    });

    return redirectWithFlash(request, returnPath, "success", "Contract number created.");
  } catch (error) {
    const errorPath = returnPath.includes("/admin/property-owners/")
      ? appendQueryParam(returnPath, "createContract", "1")
      : returnPath;
    return redirectWithFlash(request, errorPath, "error", mapAdminMutationError(error, "Contract number"));
  }
}
