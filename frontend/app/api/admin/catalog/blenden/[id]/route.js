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
        where: { catalogBlendeId: id },
      });
      if (linkedCount > 0) {
        return redirectWithFlash(request, "/admin/catalog/articles", "error", `Blende is linked to ${linkedCount} kitchen item(s). Remove those links before deleting it.`);
      }

      await prisma.catalogBlende.delete({
        where: { id },
      });
      return redirectWithFlash(request, "/admin/catalog/articles", "success", "Blende deleted.");
    }

    const data = validateCatalogAddonInput(formData, "Blende");

    const syncedCount = await prisma.$transaction(async (tx) => {
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

      const linkedItems = await tx.kitchenItem.findMany({
        where: { catalogBlendeId: id },
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

    return redirectWithFlash(request, "/admin/catalog/articles", "success", `Blende updated. ${syncedCount} linked kitchen item(s) synced.`);
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Blende"));
  }
}
