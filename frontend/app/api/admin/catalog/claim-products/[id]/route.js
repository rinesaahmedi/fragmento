import { mapAdminMutationError, redirectWithFlash, validateClaimProductInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;

  try {
    const formData = await request.formData();
    const data = validateClaimProductInput(formData);
    const submittedIds = String(formData.get("claimProductIds") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const ids = submittedIds.includes(id) ? submittedIds : [id];

    const result = await prisma.kitchenClaimPart.updateMany({
      where: { id: { in: ids } },
      data,
    });

    if (!result.count) {
      throw new Error("Claim product was not found.");
    }

    return redirectWithFlash(
      request,
      "/admin/catalog/articles",
      "success",
      `Claim product updated for ${result.count} linked kitchen${result.count === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Claim product"));
  }
}
