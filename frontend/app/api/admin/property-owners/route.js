import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mapAdminMutationError, redirectWithFlash, validatePropertyOwnerInput } from "../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../lib/auth";
import { listPropertyOwnersForAdmin } from "../../../../lib/catalog";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  await requireAdminApi();
  return NextResponse.json(await listPropertyOwnersForAdmin());
}

export async function POST(request) {
  await requireAdminApi();
  try {
    const formData = await request.formData();
    const data = validatePropertyOwnerInput(formData);
    await prisma.$executeRaw`
      INSERT INTO "HousingCompany" ("id", "name", "email", "phone", "notes", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${data.name}, ${data.email}, ${data.phone}, ${data.notes}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    return redirectWithFlash(request, "/admin/property-owners", "success", "Housing company created.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/property-owners", "error", mapAdminMutationError(error, "Housing company"));
  }
}
