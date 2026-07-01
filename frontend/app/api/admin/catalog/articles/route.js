import { mapAdminMutationError, redirectWithFlash, validateCatalogArticleInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request) {
  await requireAdminApi();

  try {
    const formData = await request.formData();
    const data = validateCatalogArticleInput(formData);

    await prisma.catalogArticle.create({ data });

    return redirectWithFlash(request, "/admin/catalog/articles", "success", "Article created.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Article"));
  }
}
