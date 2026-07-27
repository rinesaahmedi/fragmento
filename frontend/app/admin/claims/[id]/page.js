import {
  ActionLink,
  AdminSection,
  FlashMessage,
  itemCardStyle,
  pageGridStyle,
  splitGridStyle,
  subMetaStyle,
} from "../../../../components/admin-ui";
import { AdminClaimUploadsPanel } from "../../../../components/admin-claim-uploads-panel";
import AdminConfirmSubmitButton from "../../../../components/admin-confirm-submit-button";
import { AdminClaimLocalizedText } from "../../../../components/admin-claim-localized-text";
import { AdminDateTime, AdminText } from "../../../../components/admin-i18n";
import { AdminShell } from "../../../../components/admin-shell";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminClaimsPage } from "../../../../lib/admin-claims-access";
import { renderClaimKitchenPreviewSvg } from "../../../../lib/claim-kitchen-preview";
import { prisma } from "../../../../lib/prisma";
import { formatServiceClaimProblemArea, formatServiceClaimProblemAreaList, parseServiceClaimProblemAreas } from "../../../../lib/service-claim-problem-areas";
import { queryServiceClaimById } from "../../../../lib/service-claim-admin-query";

export const dynamic = "force-dynamic";

function contactSummary(claim) {
  return [claim.phone, claim.email].filter(Boolean).join(" / ");
}

function formatClaimCustomerName(value) {
  return String(value || "").replace(/\s*\((female|male|diverse|other)\)\s*$/i, "").trim();
}

function getClaimCustomerGender(value) {
  const match = String(value || "").match(/\((female|male|diverse|other)\)\s*$/i);
  return match?.[1]?.toLowerCase() || "";
}

function ClaimGenderText({ gender }) {
  if (gender === "female") {
    return <AdminText i18nKey="claimsAdmin.genderFemale" fallback="Female" />;
  }
  if (gender === "male") {
    return <AdminText i18nKey="claimsAdmin.genderMale" fallback="Male" />;
  }
  if (gender === "diverse") {
    return <AdminText i18nKey="claimsAdmin.genderDiverse" fallback="Diverse" />;
  }
  if (gender === "other") {
    return <AdminText i18nKey="claimsAdmin.genderOther" fallback="Other" />;
  }
  return <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />;
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

function parseClaimProblemAreas(raw) {
  return parseServiceClaimProblemAreas(raw);
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

function buildAttachmentMetaText(file) {
  const parts = [file.contentType || "file", formatBytes(file.size)];
  if (file.role === "serial_number") {
    parts.push("serial number");
  }
  if (file.role === "problem_area") {
    const areaLabel = formatServiceClaimProblemArea({
      name: file.areaName,
      code: file.areaCode,
    }, { includeCode: false });
    if (areaLabel) {
      parts.push(areaLabel);
    }
  }
  return parts.filter(Boolean).join(" · ");
}

export default async function AdminClaimDetailPage({ params, searchParams }) {
  const admin = await requireAdminClaimsPage();
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

  const rawUploadedAttachments = parseClaimAttachments(claim.attachmentsJson);
  const parsedProblemAreas = parseClaimProblemAreas(claim.problemAreasJson);
  const customerGender = getClaimCustomerGender(claim.fullName);
  const claimKitchenName = String(claim.kitchenName || "").trim();
  const claimSelectedAreas = formatServiceClaimProblemAreaList(claim.problemAreasJson, { includeCode: false });
  const claimKitchenPreview = await renderClaimKitchenPreviewSvg({
    kitchenSlug: claim.kitchenSlug,
    selectedAreas: claim.problemAreasJson,
    contractNumber: claim.contractNumber,
  }).catch(() => null);
  const uploadedAttachmentFiles = rawUploadedAttachments.map((file, index) => ({
    index,
    filename: file.filename,
    contentType: file.contentType || "",
    size: file.size,
    role: file.role || "general",
    areaComponentId: file.areaComponentId || "",
    areaName: file.areaName || "",
    areaCode: file.areaCode || "",
    meta: buildAttachmentMetaText(file),
  }));
  const generalUploadedAttachments = uploadedAttachmentFiles.filter((file) => file.role !== "problem_area");
  const uploadedAttachments = generalUploadedAttachments;
  const problemAreaSections = parsedProblemAreas.map((area) => ({
    ...area,
    label: formatServiceClaimProblemArea(area, { includeCode: false }),
    files: uploadedAttachmentFiles.filter(
      (file) => file.role === "problem_area" && file.areaComponentId === area.componentId,
    ),
  }));

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="claimsAdmin.claimTitle" fallback="Claim {claimNumber}" values={{ claimNumber: claim.contractNumber }} />}
          description={<AdminText i18nKey="claimsAdmin.claimDetailDescription" fallback="Details from the submitted service request." />}
          actions={
            <ActionLink href="/admin/claims"><AdminText i18nKey="claimsAdmin.backToClaims" fallback="Back to claims" /></ActionLink>
          }
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action={`/api/admin/claims/${claim.id}`} method="post" style={actionPanelStyle}>
            <div style={subMetaStyle}>
              <span>{formatClaimCustomerName(claim.fullName)}</span>
              <span aria-hidden="true">·</span>
              <span><ClaimRequestTypeText requestType={claim.requestType} /></span>
              <span aria-hidden="true">·</span>
              <span><AdminDateTime value={claim.createdAt} /></span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <AdminConfirmSubmitButton
                name="_intent"
                value="delete"
                style={deleteClaimButtonStyle}
                confirmKey="claimsAdmin.deleteConfirmMessage"
                confirmFallback={"Delete this claim?\nThis action cannot be undone."}
              >
                <AdminText i18nKey="claimsAdmin.deleteClaim" fallback="Delete claim" />
              </AdminConfirmSubmitButton>
            </div>
          </form>

          <div style={splitGridStyle}>
            <article style={itemCardStyle}>
              <strong style={sectionTitleStyle}><AdminText i18nKey="claimsAdmin.customer" fallback="Customer" /></strong>
              <div style={detailGridStyle}>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="kitchenDetailAdmin.name" fallback="Name" /></span>
                  <strong>{formatClaimCustomerName(claim.fullName)}</strong>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.gender" fallback="Gender" /></span>
                  <span><ClaimGenderText gender={customerGender} /></span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.contact" fallback="Contact" /></span>
                  <span>{contactSummary(claim) || <AdminText i18nKey="claimsAdmin.noContactProvided" fallback="No contact provided" />}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.clientAddress" fallback="Client address" /></span>
                  <p style={detailTextStyle}>{claim.clientAddress || "-"}</p>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.contractNumber" fallback="Contract" /></span>
                  <span>{claim.contractNumber}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.kitchen" fallback="Kitchen" /></span>
                  <div style={claimKitchenSectionStyle}>
                    {claimKitchenPreview?.markup ? (
                      <div style={claimKitchenPreviewCardStyle}>
                        <span id={`claim-kitchen-preview-${claim.id}`} style={visuallyHiddenStyle}>
                          <AdminText i18nKey="claimsAdmin.kitchenPreview" fallback="Kitchen preview" />
                        </span>
                        <div
                          role="img"
                          aria-labelledby={`claim-kitchen-preview-${claim.id}`}
                          style={claimKitchenPreviewWrapStyle}
                          dangerouslySetInnerHTML={{ __html: claimKitchenPreview.markup }}
                        />
                      </div>
                    ) : null}
                    <p style={detailTextStyle}>
                      {claimKitchenName ? (
                        <><AdminText i18nKey="claimsAdmin.kitchen" fallback="Kitchen" />: {claimKitchenName}</>
                      ) : null}
                      {claimKitchenName && claimSelectedAreas.length ? "\n" : null}
                      {claimSelectedAreas.length ? (
                        <><AdminText i18nKey="claimsAdmin.selectedPartSingular" fallback="Selected part" />: {claimSelectedAreas.join(", ")}</>
                      ) : null}
                      {!claimKitchenName && !claimSelectedAreas.length ? "-" : null}
                    </p>
                  </div>
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
                  <span><ClaimRequestTypeText requestType={claim.requestType} /></span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.created" fallback="Created" /></span>
                  <span><AdminDateTime value={claim.createdAt} /></span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.landlord" fallback="Landlord" /></span>
                  <div style={detailTextStyle}>
                    <div>{claim.landlordName || "-"}</div>
                    {claim.landlordCompanyPhone ? <div><AdminText i18nKey="claimsAdmin.companyPhone" fallback="Company phone" />: {claim.landlordCompanyPhone}</div> : null}
                    {claim.landlordCompanyEmail ? <div><AdminText i18nKey="claimsAdmin.companyEmail" fallback="Company email" />: {claim.landlordCompanyEmail}</div> : null}
                    {claim.landlordPhone ? <div><AdminText i18nKey="claimsAdmin.contactPhone" fallback="Contact phone" />: {claim.landlordPhone}</div> : null}
                    {claim.landlordEmail ? <div><AdminText i18nKey="claimsAdmin.contactEmail" fallback="Contact email" />: {claim.landlordEmail}</div> : null}
                  </div>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.hausmeister" fallback="Hausmeister" /></span>
                  <p style={detailTextStyle}>
                    {[
                      claim.hausmeisterName || "-",
                      claim.hausmeisterPhone ? `${claim.hausmeisterPhone}` : null,
                      claim.hausmeisterEmail ? `${claim.hausmeisterEmail}` : null,
                    ].filter(Boolean).join("\n")}
                  </p>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.issue" fallback="Issue" /></span>
                  <p style={detailTextStyle}><AdminClaimLocalizedText text={claim.problemDescription} /></p>
                </div>
                {problemAreaSections.length ? (
                  <div>
                    <span style={detailLabelStyle}><AdminText i18nKey="claimsAdmin.selectedPart" fallback="Affected items" /></span>
                    <div style={problemAreaListStyle}>
                      {problemAreaSections.map((area) => (
                        <article key={area.componentId || area.label} style={problemAreaCardStyle}>
                          <strong style={problemAreaTitleStyle}>{area.label || "-"}</strong>
                          <p style={detailTextStyle}>
                            {area.detail ? <AdminClaimLocalizedText text={area.detail} /> : <AdminText i18nKey="claimsAdmin.noItemDescription" fallback="No item-specific description provided." />}
                          </p>
                          {area.files.length ? (
                            <AdminClaimUploadsPanel claimId={claim.id} files={area.files} />
                          ) : (
                            <p style={detailTextStyle}><AdminText i18nKey="claimsAdmin.noItemFiles" fallback="No item-specific files uploaded." /></p>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
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
          <style>{`
            button:focus-visible,
            a:focus-visible {
              outline: 3px solid rgba(143, 62, 44, 0.24);
              outline-offset: 2px;
            }
          `}</style>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

function ClaimRequestTypeText({ requestType }) {
  if (requestType === "complaint") {
    return <AdminText i18nKey="claimsAdmin.complaint" fallback="Complaint" />;
  }

  return requestType || "-";
}

const actionPanelStyle = {
  display: "grid",
  gap: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,248,242,0.74))",
  padding: 18,
};

const deleteClaimButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.24)",
  borderRadius: 10,
  minHeight: 42,
  padding: "10px 14px",
  background: "rgba(255,255,255,0.72)",
  color: "var(--app-danger-text)",
  fontWeight: 800,
  fontSize: "0.92rem",
  cursor: "pointer",
  boxShadow: "none",
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

const visuallyHiddenStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const claimKitchenSectionStyle = {
  display: "grid",
  gap: 12,
};

const claimKitchenPreviewCardStyle = {
  maxWidth: 520,
  padding: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 16,
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,248,242,0.82))",
};

const claimKitchenPreviewWrapStyle = {
  width: "100%",
  margin: 0,
};

const problemAreaListStyle = {
  display: "grid",
  gap: 12,
};

const problemAreaCardStyle = {
  display: "grid",
  gap: 10,
  padding: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.72)",
};

const problemAreaTitleStyle = {
  fontSize: "0.98rem",
};
