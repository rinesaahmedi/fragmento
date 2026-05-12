import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../../../../lib/auth";
import { prisma } from "../../../../../../../lib/prisma";
import { queryServiceClaimById } from "../../../../../../../lib/service-claim-admin-query";
import { readServiceClaimAttachmentBytes } from "../../../../../../../lib/service-claim-attachments-storage";

function parseAttachmentsJson(raw) {
  if (raw == null || raw === "") {
    return [];
  }
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function asciiDispositionFilename(name) {
  const s = String(name || "file").replace(/[^\x20-\x7E]+/g, "_");
  return s.replace(/"/g, "_") || "file";
}

function wantsInlineView(request) {
  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  if (view === "1" || view === "true") {
    return true;
  }
  const disposition = url.searchParams.get("disposition");
  return String(disposition || "").toLowerCase() === "inline";
}

export async function GET(request, { params }) {
  try {
    await requireAdminApi();
  } catch (error) {
    const status = error.status || 401;
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status },
    );
  }

  const { id, index: indexParam } = await params;
  const index = Number.parseInt(String(indexParam), 10);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Invalid attachment index." }, { status: 400 });
  }

  const rows = await queryServiceClaimById(prisma, id);
  const claim = rows[0];
  if (!claim) {
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  }

  const attachments = parseAttachmentsJson(claim.attachmentsJson);
  if (index >= attachments.length) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  const meta = attachments[index] || {};
  const buffer = await readServiceClaimAttachmentBytes(id, index);
  if (!buffer) {
    return NextResponse.json(
      {
        error:
          "File data is not available for this attachment (older submission or storage unavailable).",
      },
      { status: 404 },
    );
  }

  const filename = typeof meta.filename === "string" ? meta.filename : `attachment-${index}`;
  const contentType =
    typeof meta.contentType === "string" && meta.contentType.trim()
      ? meta.contentType.trim()
      : "application/octet-stream";
  const asciiName = asciiDispositionFilename(filename);
  const starName = encodeURIComponent(filename);
  const inline = wantsInlineView(request);
  const dispositionType = inline ? "inline" : "attachment";

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${dispositionType}; filename="${asciiName}"; filename*=UTF-8''${starName}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
