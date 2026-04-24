import { randomUUID } from "crypto";
import { mapAdminMutationError, redirectWithFlash, validatePropertyObjectInput } from "../../../../../../lib/admin-forms";
import { isAddressVerificationRecordValid } from "../../../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

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

  try {
    const formData = await request.formData();
    const data = validatePropertyObjectInput(formData);
    const addressVerification = parseAddressVerificationRecord(formData);
    if (!isAddressVerificationRecordValid(addressVerification, { ...data, contractNumber: data.name })) {
      throw new Error("Verify the object address before saving.");
    }

    const [company] = await prisma.$queryRaw`
      SELECT "id" FROM "HousingCompany" WHERE "id" = ${id} LIMIT 1
    `;
    if (!company) {
      throw new Error("Housing company not found.");
    }

    await prisma.$executeRaw`
      INSERT INTO "PropertyObject" ("id", "name", "housingCompanyId", "country", "city", "postalCode", "address1", "address2", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${data.name}, ${id}, ${data.country}, ${data.city}, ${data.postalCode}, ${data.address1}, ${data.address2}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    return redirectWithFlash(request, "/admin/property-owners", "success", "Property object created.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/property-owners", "error", mapAdminMutationError(error, "Property object"));
  }
}
