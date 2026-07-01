import { mapAdminMutationError, redirectWithFlash, validateCatalogArticleInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

function moneyToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function centsToMoney(cents) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function getBlendeTotalCents(item) {
  if (item.blendePrice == null || !item.catalogBlendeId) return 0;
  const quantity = Math.max(1, Number.parseInt(String(item.catalogBlendeQuantity || 1), 10) || 1);
  return moneyToCents(item.blendePrice) * quantity;
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;

  try {
    const formData = await request.formData();
    const data = validateCatalogArticleInput(formData);

    const updatedCount = await prisma.$transaction(async (tx) => {
      const article = await tx.catalogArticle.update({
        where: { id },
        data,
      });
      const linkedItems = await tx.kitchenItem.findMany({
        where: { catalogArticleId: id },
        select: {
          id: true,
          blendePrice: true,
          catalogBlendeId: true,
          catalogBlendeQuantity: true,
        },
      });
      const articlePriceCents = moneyToCents(article.price);

      await Promise.all(linkedItems.map((item) => (
        tx.kitchenItem.update({
          where: { id: item.id },
          data: {
            price: centsToMoney(articlePriceCents + getBlendeTotalCents(item)),
          },
        })
      )));

      return linkedItems.length;
    });

    return redirectWithFlash(request, "/admin/catalog/articles", "success", `Article updated. ${updatedCount} linked kitchen item(s) repriced.`);
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Article"));
  }
}
