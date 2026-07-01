import { mapAdminMutationError, redirectWithFlash, validateCatalogAddonInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;

  try {
    const formData = await request.formData();
    const data = validateCatalogAddonInput(formData, "Service");

    await prisma.catalogService.update({
      where: { id },
      data,
    });

    return redirectWithFlash(request, "/admin/catalog/articles", "success", "Service updated.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Service"));
  }
}
