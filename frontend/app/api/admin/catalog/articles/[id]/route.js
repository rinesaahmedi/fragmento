import { mapAdminMutationError, redirectWithFlash, validateCatalogArticleInput } from "../../../../../../lib/admin-forms";
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
        where: { catalogArticleId: id },
      });
      if (linkedCount > 0) {
        return redirectWithFlash(request, "/admin/catalog/articles", "error", `Article is linked to ${linkedCount} kitchen item(s). Remove those links before deleting it.`);
      }

      await prisma.catalogArticle.delete({
        where: { id },
      });
      return redirectWithFlash(request, "/admin/catalog/articles", "success", "Article deleted.");
    }

    const data = validateCatalogArticleInput(formData);

    const updatedCount = await prisma.$transaction(async (tx) => {
      const article = await tx.catalogArticle.update({
        where: { id },
        data,
      });
      const linkedItems = await tx.kitchenItem.findMany({
        where: { catalogArticleId: id },
        include: {
          kitchen: { select: { slug: true } },
          catalogArticle: true,
          catalogBlende: true,
          catalogService: true,
        },
      });

      let syncedCount = 0;
      for (const item of linkedItems) {
        if (!shouldSyncKitchenItemPrice(item, { requireMatched: false })) continue;
        const price = buildSyncedKitchenItemPrice(item);
        if (price == null) continue;
        await tx.kitchenItem.update({
          where: { id: item.id },
          data: {
            articleNumber: article.articleNumber,
            name: article.name,
            nameDe: article.nameDe || null,
            widthMm: article.widthMm ?? null,
            heightMm: article.heightMm ?? null,
            depthMm: article.depthMm ?? null,
            price,
          },
        });
        syncedCount += 1;
      }

      return syncedCount;
    });

    return redirectWithFlash(request, "/admin/catalog/articles", "success", `Article updated. ${updatedCount} linked kitchen item(s) synced.`);
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Article"));
  }
}
