import { mapAdminMutationError, redirectWithFlash, validateCatalogAddonInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { buildSyncedKitchenItemPrice, shouldSyncKitchenItemPrice } from "../../../../../../lib/catalog-pricing";
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

    const syncedCount = await prisma.$transaction(async (tx) => {
      await tx.catalogService.update({
        where: { id },
        data,
      });

      const linkedItems = await tx.kitchenItem.findMany({
        where: { catalogServiceId: id },
        include: {
          kitchen: { select: { slug: true } },
          catalogArticle: true,
          catalogBlende: true,
          catalogService: true,
        },
      });

      let count = 0;
      for (const item of linkedItems) {
        if (!shouldSyncKitchenItemPrice(item, { requireMatched: false })) continue;
        const price = buildSyncedKitchenItemPrice(item);
        if (price == null) continue;
        await tx.kitchenItem.update({
          where: { id: item.id },
          data: { price },
        });
        count += 1;
      }

      return count;
    });

    return redirectWithFlash(request, "/admin/catalog/articles", "success", `Service updated. ${syncedCount} linked kitchen item(s) synced.`);
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Service"));
  }
}
