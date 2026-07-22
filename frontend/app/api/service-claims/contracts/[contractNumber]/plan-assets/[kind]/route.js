import { getPublicContractClaimPlanAsset } from "../../../../../../../lib/contract-claim-plan-assets";
import { prisma } from "../../../../../../../lib/prisma";

export const runtime = "nodejs";

function safeHeaderFileName(value, fallback) {
  return String(value || fallback)
    .replace(/[\r\n"\\]/g, "-")
    .slice(0, 180);
}

export async function GET(_request, { params }) {
  const { contractNumber, kind } = await params;
  if (!["preview", "pdf"].includes(kind)) {
    return new Response("Not found", { status: 404 });
  }

  const asset = await getPublicContractClaimPlanAsset(prisma, contractNumber, kind);
  if (!asset?.bytes) {
    return new Response("Not found", { status: 404 });
  }

  const fallbackMimeType = kind === "preview" ? "image/jpeg" : "application/pdf";
  const fallbackFileName = kind === "preview" ? "kitchen-sketch.jpg" : "kitchen-plan.pdf";
  const bytes = Buffer.from(asset.bytes);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType || fallbackMimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${safeHeaderFileName(asset.fileName, fallbackFileName)}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
