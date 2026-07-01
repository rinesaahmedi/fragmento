import { mapAdminMutationError, redirectWithFlash, validateCatalogAddonInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;

  try {
    const formData = await request.formData();
    const intentValues = formData.getAll("_intent");
    const intent = String(intentValues[intentValues.length - 1] || "update");

    if (intent === "delete") {
      const linkedCount = await prisma.kitchenItem.count({
        where: { catalogServiceId: id },
      });
      if (linkedCount > 0) {
        return redirectWithFlash(request, "/admin/catalog/articles", "error", `Service is linked to ${linkedCount} kitchen item(s). Remove those links before deleting it.`);
      }

      await prisma.catalogService.delete({
        where: { id },
      });
      return redirectWithFlash(request, "/admin/catalog/articles", "success", "Service deleted.");
    }

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
