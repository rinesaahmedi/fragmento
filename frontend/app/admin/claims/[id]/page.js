import {
  ActionLink,
  AdminSection,
  FlashMessage,
  dangerButtonStyle,
  itemCardStyle,
  pageGridStyle,
  splitGridStyle,
  subMetaStyle,
} from "../../../../components/admin-ui";
import { AdminClaimUploadsPanel } from "../../../../components/admin-claim-uploads-panel";
import { AdminText } from "../../../../components/admin-i18n";
import { AdminShell } from "../../../../components/admin-shell";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { queryServiceClaimById } from "../../../../lib/service-claim-admin-query";

export const dynamic = "force-dynamic";

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function contactSummary(claim) {
  return [claim.phone, claim.email].filter(Boolean).join(" / ") || "No contact provided";
}

function parseClaimAttachments(raw) {
  if (raw == null || raw === "") {
    return [];
  }
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter(
      (entry) => entry && typeof entry.filename === "string" && typeof entry.size === "number",
    );
  } catch {
    return [];
  }
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) {
    return "—";
  }
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminClaimDetailPage({ params, searchParams }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  const claims = await queryServiceClaimById(prisma, id);

  const claim = claims[0];

  if (!claim) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="claimsAdmin.claimNotFound" fallback="Claim not found" />}
            description={<AdminText i18nKey="claimsAdmin.requestedClaimDoesNotExist" fallback="The requested claim does not exist." />}
          >
            <ActionLink href="/admin/claims"><AdminText i18nKey="claimsAdmin.backToClaims" fallback="Back to claims" /></ActionLink>
          </AdminSection>
        </div>
      </AdminShell>
    );
  }

  const uploadedAttachments = parseClaimAttachments(claim.attachmentsJson);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={`${claim.contractNumber}`}
          description={<AdminText i18nKey="claimsAdmin.claimDetailDescription" fallback="Complaint request details from the service form." />}
          actions={
            <ActionLink href="/admin/claims"><AdminText i18nKey="claimsAdmin.backToClaims" fallback="Back to claims" /></ActionLink>
          }
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action={`/api/admin/claims/${claim.id}`} method="post" style={actionPanelStyle}>
            <div style={subMetaStyle}>
              <span>{claim.fullName}</span>
              <span>{claim.requestType}</span>
              <span>{formatDate(claim.createdAt)}</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" name="_intent" value="delete" style={dangerButtonStyle}>
                <AdminText i18nKey="ordersAdmin.confirmDelete" fallback="Confirm delete" />
              </button>
            </div>
          </form>

          <div style={splitGridStyle}>
            <article style={itemCardStyle}>
              <strong style={sectionTitleStyle}><AdminText i18nKey="claimsAdmin.customer" fallback="Customer" /></strong>
              <div style={detailGridStyle}>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.customer" fallback="Customer" /></span>
                  <span>{claim.fullName}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.contact" fallback="Contact" /></span>
                  <span>{contactSummary(claim)}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}>Client address</span>
                  <p style={detailTextStyle}>{claim.clientAddress || "-"}</p>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.contractNumber" fallback="Contract number" /></span>
                  <span>{claim.contractNumber}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.serialNumber" fallback="Serial number" /></span>
                  <span>{claim.serialNumber}</span>
                </div>
              </div>
            </article>

            <article style={itemCardStyle}>
              <strong style={sectionTitleStyle}><AdminText i18nKey="claimsAdmin.requestDetails" fallback="Request details" /></strong>
              <div style={detailGridStyle}>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.requestType" fallback="Request type" /></span>
                  <span>{claim.requestType}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.created" fallback="Created" /></span>
                  <span>{formatDate(claim.createdAt)}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}>Landlord</span>
                  <p style={detailTextStyle}>
                    {[
                      claim.landlordName || "-",
                      claim.landlordPhone ? `Phone: ${claim.landlordPhone}` : null,
                      claim.landlordEmail ? `Email: ${claim.landlordEmail}` : null,
                    ].filter(Boolean).join("\n")}
                  </p>
                </div>
                <div>
                  <span style={detailLabelStyle}>Hausmeister</span>
                  <p style={detailTextStyle}>
                    {[
                      claim.hausmeisterName || "-",
                      claim.hausmeisterPhone ? `Phone: ${claim.hausmeisterPhone}` : null,
                      claim.hausmeisterEmail ? `Email: ${claim.hausmeisterEmail}` : null,
                    ].filter(Boolean).join("\n")}
                  </p>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.issue" fallback="Issue" /></span>
                  <p style={detailTextStyle}>{claim.problemDescription}</p>
                </div>
                <div>
                  <span style={detailLabelStyle}>
                    <AdminText i18nKey="claimsAdmin.uploadedFiles" fallback="Uploaded files" />
                  </span>
                  <AdminClaimUploadsPanel
                    claimId={claim.id}
                    files={uploadedAttachments.map((file, index) => ({
                      index,
                      filename: file.filename,
                      contentType: file.contentType || "",
                      meta: `${file.contentType || "file"} · ${formatBytes(file.size)}`,
                    }))}
                  />
                  {uploadedAttachments.length ? (
                    <p
                      style={{
                        margin: "12px 0 0",
                        fontSize: 13,
                        color: "var(--app-text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      <AdminText
                        i18nKey="claimsAdmin.uploadedFilesEmailNote"
                        fallback="Original files are also attached to the notification email when SMTP is configured."
                      />
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const actionPanelStyle = {
  display: "grid",
  gap: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,248,242,0.74))",
  padding: 18,
};

const sectionTitleStyle = {
  fontSize: "1.1rem",
};

const detailGridStyle = {
  display: "grid",
  gap: 14,
};

const detailLabelStyle = {
  display: "block",
  marginBottom: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const detailTextStyle = {
  margin: 0,
  color: "var(--app-text)",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
};
