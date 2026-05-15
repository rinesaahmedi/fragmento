import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  inputStyle,
  itemCardStyle,
  pageGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminDateTime, AdminPluralText, AdminText, AdminTranslatedInput } from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import AdminConfirmSubmitButton from "../../../components/admin-confirm-submit-button";
import { AdminClaimLocalizedText } from "../../../components/admin-claim-localized-text";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { queryServiceClaimsList } from "../../../lib/service-claim-admin-query";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function formatContact(claim) {
  return [claim.phone, claim.email].filter(Boolean).join(" / ");
}

function formatClaimCustomerName(value) {
  return String(value || "").replace(/\s*\((female|male|diverse|other)\)\s*$/i, "").trim();
}

function truncate(value, max = 140) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

export default async function AdminClaimsPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    q: normalizeParam(resolvedSearchParams.q).trim(),
    city: normalizeParam(resolvedSearchParams.city).trim(),
    dateFrom: normalizeParam(resolvedSearchParams.dateFrom).trim(),
    dateTo: normalizeParam(resolvedSearchParams.dateTo).trim(),
  };
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  const [claims, cityOptions] = await Promise.all([
    queryServiceClaimsList(prisma, filters),
    listClaimCities(),
  ]);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="claimsAdmin.claims" fallback="Claims" />}
          description={
            <AdminPluralText
              count={claims.length}
              singularKey="claimsAdmin.claimMatchesCurrentFilters"
              pluralKey="claimsAdmin.claimsMatchCurrentFilters"
              singularFallback="{count} claim matches the current filters."
              pluralFallback="{count} claims match the current filters."
            />
          }
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action="/admin/claims" method="get" style={filterPanelStyle}>
            <div style={filterHeaderStyle}>
              <span style={filterEyebrowStyle}><AdminText i18nKey="contractsAdmin.filters" fallback="Filters" /></span>
              <span style={filterHintStyle}>
                <AdminText
                  i18nKey="claimsAdmin.filterClaimsByContractNameContactIssueAndDate"
                  fallback="Filter by customer, contract, product, issue, status, or date."
                />
              </span>
            </div>
            <div style={filterGridStyle}>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="contractsAdmin.search" fallback="Search" /></span>
                <AdminTranslatedInput
                  name="q"
                  defaultValue={filters.q}
                  placeholderKey="claimsAdmin.searchPlaceholder"
                  placeholderFallback="Search by contract, name, phone, email, issue..."
                  style={filterInputStyle}
                />
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="claimsAdmin.city" fallback="City" /></span>
                <AdminSelect name="city" defaultValue={filters.city} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="claimsAdmin.allCities" fallback="All cities" /></option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </AdminSelect>
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span>
                <input name="dateFrom" type="date" defaultValue={filters.dateFrom} style={filterInputStyle} />
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span>
                <input name="dateTo" type="date" defaultValue={filters.dateTo} style={filterInputStyle} />
              </label>
              <div style={filterActionsStyle}>
                <button type="submit" style={filterApplyButtonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
                <Link href="/admin/claims" style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
              </div>
            </div>
          </form>

          <div className="admin-claims-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.claim" fallback="Claim" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.customer" fallback="Customer" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.contact" fallback="Contact" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.serialNumber" fallback="Serial number" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.issue" fallback="Issue" /></th>
                  <th className="claims-table-date" style={thStyle}><AdminText i18nKey="claimsAdmin.createdAt" fallback="Created" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!claims.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={7}>
                      <AdminText i18nKey="claimsAdmin.noClaimsFound" fallback="No claims found." />
                    </td>
                  </tr>
                ) : null}
                {claims.map((claim) => (
                  <tr key={claim.id} className="claims-table-row">
                    <td style={tdStyle}>
                      <strong>{claim.contractNumber}</strong>
                      <div style={rowMetaStyle}><ClaimRequestTypeText requestType={claim.requestType} /></div>
                    </td>
                    <td style={tdStyle}>
                      <div style={customerNameStyle}>{formatClaimCustomerName(claim.fullName)}</div>
                      <div style={rowMetaStyle}>{truncate(claim.clientAddress || claim.landlordContact, 90)}</div>
                    </td>
                    <td style={tdStyle}><span style={mutedValueStyle}>{formatContact(claim) || <AdminText i18nKey="claimsAdmin.noContactProvided" fallback="No contact provided" />}</span></td>
                    <td style={tdStyle}>{claim.serialNumber}</td>
                    <td style={tdStyle}>
                      <AdminClaimLocalizedText text={truncate(claim.problemDescription, 220)} style={issueClampStyle} />
                    </td>
                    <td className="claims-table-date" style={tdStyle}><AdminDateTime value={claim.createdAt} /></td>
                    <td style={{ ...tdStyle, width: 220 }}>
                      <div style={actionCellStyle}>
                        <Link href={`/admin/claims/${claim.id}`} style={detailsLinkStyle}>
                          <AdminText i18nKey="ordersAdmin.openDetails" fallback="Open details" />
                        </Link>
                        <DeleteClaimAction claimId={claim.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-claims-cards" style={{ display: "none", gap: 12 }}>
            {!claims.length ? <p style={{ margin: 0, color: "var(--app-text-muted)" }}><AdminText i18nKey="claimsAdmin.noClaimsFound" fallback="No claims found." /></p> : null}
            {claims.map((claim) => (
              <article key={claim.id} style={itemCardStyle}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <strong>
                      <AdminText i18nKey="claimsAdmin.claim" fallback="Claim" /> {claim.contractNumber}
                    </strong>
                    <div style={rowMetaStyle}>
                      <ClaimRequestTypeText requestType={claim.requestType} /> · <AdminText i18nKey="claimsAdmin.createdAt" fallback="Created" /> <AdminDateTime value={claim.createdAt} />
                    </div>
                  </div>
                  <div>
                    <div style={customerNameStyle}>{formatClaimCustomerName(claim.fullName)}</div>
                    <div style={rowMetaStyle}><AdminText i18nKey="claimsAdmin.contractNumber" fallback="Contract" /> {claim.contractNumber}</div>
                  </div>
                  <AdminClaimLocalizedText text={truncate(claim.problemDescription, 160)} style={issueClampStyle} />
                  <div style={actionCellStyle}>
                    <Link href={`/admin/claims/${claim.id}`} style={detailsLinkStyle}>
                      <AdminText i18nKey="ordersAdmin.openDetails" fallback="Open details" />
                    </Link>
                    <DeleteClaimAction claimId={claim.id} compact />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <style>{`
            .admin-claims-cards {
              display: none;
            }

            .claims-table-row {
              transition: background 160ms ease;
            }

            .claims-table-row:hover {
              background: rgba(143, 62, 44, 0.045);
            }

            .admin-claims-table a:focus-visible,
            .admin-claims-cards a:focus-visible,
            .admin-claims-table button:focus-visible,
            .admin-claims-cards button:focus-visible {
              outline: 3px solid rgba(143, 62, 44, 0.24);
              outline-offset: 2px;
            }

            @media (max-width: 980px) {
              .claims-table-date {
                display: none;
              }
            }

            @media (max-width: 760px) {
              .admin-claims-table {
                display: none;
              }

              .admin-claims-cards {
                display: grid !important;
              }
            }
          `}</style>

        </AdminSection>
      </div>
    </AdminShell>
  );
}

async function listClaimCities() {
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT NULLIF(BTRIM("clientCity"), '') AS "city"
    FROM "ServiceClaim"
    WHERE NULLIF(BTRIM("clientCity"), '') IS NOT NULL
    ORDER BY "city" ASC
  `;

  return rows.map((row) => row.city).filter(Boolean);
}

function ClaimRequestTypeText({ requestType }) {
  if (requestType === "complaint") {
    return <AdminText i18nKey="claimsAdmin.complaint" fallback="Complaint" />;
  }

  return requestType || "-";
}

function DeleteClaimAction({ claimId, compact = false }) {
  return (
    <form action={`/api/admin/claims/${claimId}`} method="post" style={deleteFormStyle}>
      <AdminConfirmSubmitButton
        name="_intent"
        value="delete"
        style={compact ? compactDeleteButtonStyle : deleteButtonStyle}
        confirmKey="claimsAdmin.deleteConfirmMessage"
        confirmFallback={"Delete this claim?\nThis action cannot be undone."}
      >
        <AdminText i18nKey="ordersAdmin.delete" fallback="Delete" />
      </AdminConfirmSubmitButton>
    </form>
  );
}

const rowMetaStyle = {
  marginTop: 6,
  color: "var(--app-text-muted)",
  fontSize: 13,
  lineHeight: 1.5,
};

const detailsLinkStyle = {
  border: "1px solid var(--color-primary)",
  borderRadius: 8,
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  textDecoration: "none",
  fontWeight: 800,
  minHeight: 38,
  padding: "9px 12px",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  fontSize: 13,
};

const actionCellStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const deleteFormStyle = {
  margin: 0,
};

const deleteButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.24)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.72)",
  color: "var(--app-danger-text)",
  minHeight: 38,
  padding: "9px 12px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "none",
  whiteSpace: "nowrap",
};

const compactDeleteButtonStyle = {
  ...deleteButtonStyle,
};

const customerNameStyle = {
  fontWeight: 800,
};

const mutedValueStyle = {
  color: "var(--app-text-muted)",
};

const issueClampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: 1.5,
};

const filterGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
};

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
  marginBottom: 16,
};

const filterHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const filterEyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(143, 62, 44, 0.1)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  color: "var(--app-accent)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const filterHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const filterFieldStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  ...inputStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "0.92rem",
  boxShadow: "none",
};

const filterActionsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "end",
  flexWrap: "nowrap",
};

const filterApplyButtonStyle = {
  border: "1px solid var(--color-primary)",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 14px",
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  fontWeight: 800,
  fontSize: "0.92rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 20px rgba(143, 62, 44, 0.16)",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 12px",
  background: "rgba(255,255,255,0.88)",
  color: "var(--app-accent)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  fontWeight: 800,
  fontSize: "0.92rem",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};
