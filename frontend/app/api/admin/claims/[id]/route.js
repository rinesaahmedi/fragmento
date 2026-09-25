import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminClaimsApi } from "../../../../../lib/admin-claims-access";
import { prisma } from "../../../../../lib/prisma";
import { deleteServiceClaimAttachments } from "../../../../../lib/service-claim-attachments-storage";
import { isTestContractNumber } from "../../../../../lib/order-kind";

export async function POST(request, { params }) {
  await requireAdminClaimsApi();
  const { id } = await params;
  let returnPath = `/admin/claims/${id}`;

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "");

    if (intent === "delete") {
      returnPath = String(formData.get("_returnPath") || "") === "/admin/px-claims"
        ? "/admin/px-claims"
        : "/admin/claims";
      const claims = await prisma.$queryRaw`
        SELECT "contractNumber"
        FROM "ServiceClaim"
        WHERE "id" = ${id}
        LIMIT 1
      `;
      const claim = claims[0];

      if (!claim || !isTestContractNumber(claim.contractNumber)) {
        return redirectWithFlash(
          request,
          returnPath,
          "error",
          "Nur PX-Reklamationen mit Vertragsnummern, die mit 111 beginnen, können gelöscht werden.",
        );
      }

      const deletedCount = await prisma.$executeRaw`
        DELETE FROM "ServiceClaim"
        WHERE "id" = ${id}
          AND REGEXP_REPLACE(COALESCE("contractNumber", ''), '[[:space:]]+', '', 'g') LIKE '111%'
      `;

      if (!deletedCount) {
        return redirectWithFlash(request, returnPath, "error", "Die PX-Reklamation konnte nicht gelöscht werden.");
      }

      await deleteServiceClaimAttachments(id).catch(() => {});
      return redirectWithFlash(request, returnPath, "success", "Reklamation gelöscht.");
    }

    return redirectWithFlash(request, returnPath, "error", "Aktion wird nicht unterstützt.");
  } catch (error) {
    return redirectWithFlash(request, returnPath, "error", mapAdminMutationError(error, "Reklamation"));
  }
}
