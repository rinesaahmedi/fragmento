import { mapAdminMutationError, redirectWithFlash, validatePropertyObjectInput } from "../../../../../lib/admin-forms";
import { isAddressVerificationRecordValid } from "../../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../../lib/auth";
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

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "").trim();

    if (intent === "delete") {
      await prisma.$executeRaw`DELETE FROM "PropertyObject" WHERE "id" = ${id}`;
      return redirectWithFlash(request, "/admin/property-owners", "success", "Property object deleted.");
    }

    const data = validatePropertyObjectInput(formData);
    const addressVerification = parseAddressVerificationRecord(formData);
    if (!isAddressVerificationRecordValid(addressVerification, { ...data, contractNumber: data.name })) {
      throw new Error("Verify the object address before saving.");
    }

    await prisma.$executeRaw`
      UPDATE "PropertyObject"
      SET
        "name" = ${data.name},
        "country" = ${data.country},
        "city" = ${data.city},
        "postalCode" = ${data.postalCode},
        "address1" = ${data.address1},
        "address2" = ${data.address2},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;

    return redirectWithFlash(request, "/admin/property-owners", "success", "Property object updated.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/property-owners", "error", mapAdminMutationError(error, "Property object"));
  }
}
