import { mapAdminMutationError, redirectWithFlash, validatePropertyObjectInput } from "../../../../../lib/admin-forms";
import { isAddressVerificationRecordValid } from "../../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../../lib/auth";
import { upsertProjectForObject } from "../../../../../lib/property-projects";
import { prisma } from "../../../../../lib/prisma";

function parseAddressVerificationRecord(formData) {
  const rawValue = String(formData.get("addressVerification") || "").trim();
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let detailPath = "/admin/property-owners";

  try {
    const [propertyObject] = await prisma.$queryRaw`
      SELECT "housingCompanyId" FROM "PropertyObject" WHERE "id" = ${id} LIMIT 1
    `;
    if (propertyObject?.housingCompanyId) {
      detailPath = `/admin/property-owners/${propertyObject.housingCompanyId}`;
    }

    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "").trim();

    if (intent === "delete") {
      await prisma.$executeRaw`DELETE FROM "PropertyObject" WHERE "id" = ${id}`;
      return redirectWithFlash(request, detailPath, "success", "Property object deleted.");
    }

    const data = validatePropertyObjectInput(formData);
    const addressVerification = parseAddressVerificationRecord(formData);
    if (!isAddressVerificationRecordValid(addressVerification, { ...data, contractNumber: data.name })) {
      throw new Error("Verify the object address before saving.");
    }
    if (!propertyObject?.housingCompanyId) {
      throw new Error("Property object not found.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "PropertyObject"
        SET
          "name" = ${data.name},
          "contactPhone" = ${data.contactPhone},
          "country" = ${data.country},
          "city" = ${data.city},
          "postalCode" = ${data.postalCode},
          "address1" = ${data.address1},
          "address2" = ${data.address2},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
      `;
      await upsertProjectForObject(tx, {
        housingCompanyId: propertyObject.housingCompanyId,
        propertyObjectId: id,
        projectName: data.projectName,
        projectCode: data.projectCode,
        projectStatus: data.projectStatus,
        projectDescription: data.projectDescription,
        projectManagerName: data.projectManagerName,
      });
    });

    return redirectWithFlash(request, detailPath, "success", "Property object updated.");
  } catch (error) {
    return redirectWithFlash(request, detailPath, "error", mapAdminMutationError(error, "Property object"));
  }
}
