import { mapAdminMutationError, redirectWithFlash, validateCatalogAddonInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;

  try {
    const formData = await request.formData();
    const data = validateCatalogAddonInput(formData, "Blende");

    await prisma.$transaction(async (tx) => {
      const blende = await tx.catalogBlende.update({
        where: { id },
        data,
      });

      await tx.kitchenItem.updateMany({
        where: { catalogBlendeId: id },
        data: {
          blendeCode: blende.code,
          blendeLabel: blende.nameDe || blende.name,
          blendePrice: blende.price,
        },
      });
    });

    return redirectWithFlash(request, "/admin/catalog/articles", "success", "Blende updated.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Blende"));
  }
}
