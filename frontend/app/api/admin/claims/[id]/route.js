import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { deleteServiceClaimAttachments } from "../../../../../../lib/service-claim-attachments-storage";

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let returnPath = `/admin/claims/${id}`;

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "");

    if (intent === "delete") {
      returnPath = "/admin/claims";
      await deleteServiceClaimAttachments(id).catch(() => {});
      await prisma.$executeRaw`
        DELETE FROM "ServiceClaim"
        WHERE "id" = ${id}
      `;
      return redirectWithFlash(request, returnPath, "success", "Claim deleted.");
    }

    return redirectWithFlash(request, returnPath, "error", "Unsupported action.");
  } catch (error) {
    return redirectWithFlash(request, returnPath, "error", mapAdminMutationError(error, "Claim"));
  }
}
