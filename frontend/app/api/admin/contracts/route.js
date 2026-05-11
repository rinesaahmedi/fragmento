import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mapAdminMutationError, redirectWithFlash, validateKitchenContractInput, validatePropertyObjectInput } from "../../../../lib/admin-forms";
import { isAddressVerificationRecordValid } from "../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../lib/auth";
import { listKitchenContractsForAdmin } from "../../../../lib/catalog";
import { upsertProjectForObject } from "../../../../lib/property-projects";
import { prisma } from "../../../../lib/prisma";

export async function GET(request) {
  await requireAdminApi();
  const { searchParams } = new URL(request.url);
  return NextResponse.json(await listKitchenContractsForAdmin({
    kitchenId: searchParams.get("kitchenId") || "",
    housingCompanyId: searchParams.get("housingCompanyId") || searchParams.get("ownerId") || "",
    projectId: searchParams.get("projectId") || "",
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
    projectName: "inlineProjectName",
    projectCode: "inlineProjectCode",
    projectStatus: "inlineProjectStatus",
    projectDescription: "inlineProjectDescription",
    projectManagerName: "inlineProjectManagerName",
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
  const hasAnyValue = [
    fields.name,
    fields.projectName,
    fields.projectCode,
    fields.projectStatus,
    fields.projectDescription,
    fields.projectManagerName,
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

  const data = validatePropertyObjectInput(formData, fields);
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

    let projectId = data.projectId;
    await prisma.$transaction(async (tx) => {
      if (data.housingCompanyId) {
        if (inlineObject) {
          const propertyObjectId = randomUUID();
          await tx.$executeRaw`
            INSERT INTO "PropertyObject" ("id", "name", "housingCompanyId", "contactPhone", "country", "city", "postalCode", "address1", "address2", "createdAt", "updatedAt")
            VALUES (${propertyObjectId}, ${inlineObject.name}, ${data.housingCompanyId}, ${inlineObject.contactPhone}, ${inlineObject.country}, ${inlineObject.city}, ${inlineObject.postalCode}, ${inlineObject.address1}, ${inlineObject.address2}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
          const project = await upsertProjectForObject(tx, {
            housingCompanyId: data.housingCompanyId,
            propertyObjectId,
            projectName: inlineObject.projectName,
            projectCode: inlineObject.projectCode,
            projectStatus: inlineObject.projectStatus,
            projectDescription: inlineObject.projectDescription,
            projectManagerName: inlineObject.projectManagerName,
          });
          projectId = project.id;
        } else if (projectId) {
          const [project] = await tx.$queryRaw`
            SELECT "id"
            FROM "Project"
            WHERE "id" = ${data.projectId}
              AND "housingCompanyId" = ${data.housingCompanyId}
            LIMIT 1
          `;
          if (!project) {
            throw new Error("Select a valid project for the housing company.");
          }
        }
      } else if (projectId) {
        const [project] = await tx.$queryRaw`
          SELECT "id"
          FROM "Project"
          WHERE "id" = ${projectId}
          LIMIT 1
        `;
        if (!project) {
          throw new Error("Select a valid project.");
        }
      }

      await tx.kitchenContract.create({
        data: {
          contractNumber: data.contractNumber,
          kitchenId,
          projectId,
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
