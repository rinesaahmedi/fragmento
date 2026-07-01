import { mapAdminMutationError, redirectWithFlash, validateCatalogAddonInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request) {
  await requireAdminApi();

  try {
    const formData = await request.formData();
    const data = validateCatalogAddonInput(formData, "Blende");

    await prisma.catalogBlende.create({ data });

    return redirectWithFlash(request, "/admin/catalog/articles", "success", "Blende created.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Blende"));
  }
}
