import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  dangerButtonStyle,
  inputStyle,
  pageGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText } from "../../../components/admin-i18n";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatContact(claim) {
  return [claim.phone, claim.email].filter(Boolean).join(" / ") || "No contact provided";
}

function truncate(value, max = 140) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function buildWhere(filters) {
  const conditions = [];

  if (filters.q) {
    const query = `%${filters.q}%`;
    conditions.push(Prisma.sql`(
      "contractNumber" ILIKE ${query}
      OR "fullName" ILIKE ${query}
      OR COALESCE("phone", '') ILIKE ${query}
      OR COALESCE("email", '') ILIKE ${query}
      OR "landlordContact" ILIKE ${query}
      OR "problemDescription" ILIKE ${query}
      OR "serialNumber" ILIKE ${query}
    )`);
  }

  if (filters.requestType) {
    conditions.push(Prisma.sql`"requestType" = ${filters.requestType}`);
  }

  if (filters.dateFrom) {
    conditions.push(Prisma.sql`"createdAt" >= ${new Date(`${filters.dateFrom}T00:00:00.000Z`)}`);
  }

  if (filters.dateTo) {
    conditions.push(Prisma.sql`"createdAt" <= ${new Date(`${filters.dateTo}T23:59:59.999Z`)}`);
  }

  if (!conditions.length) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export default async function AdminClaimsPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    q: normalizeParam(resolvedSearchParams.q).trim(),
    requestType: normalizeParam(resolvedSearchParams.requestType).trim(),
    dateFrom: normalizeParam(resolvedSearchParams.dateFrom).trim(),
    dateTo: normalizeParam(resolvedSearchParams.dateTo).trim(),
  };
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  const claims = await prisma.$queryRaw`
    SELECT
      "id",
      "contractNumber",
      "fullName",
      "phone",
      "email",
      "landlordContact",
      "problemDescription",
      "serialNumber",
      "requestType",
      "createdAt"
    FROM "ServiceClaim"
    ${buildWhere(filters)}
    ORDER BY "createdAt" DESC
  `;

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="claimsAdmin.claims" fallback="Claims" />}
          description={
            <>
              {claims.length} <AdminText i18nKey="claimsAdmin.claimsMatchCurrentFilters" fallback="claim(s) match the current filters." />
            </>
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
                  fallback="Filter claims by contract, name, contact info, issue text, and date."
                />
              </span>
            </div>
            <div style={filterGridStyle}>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="contractsAdmin.search" fallback="Search" /></span>
                <input
                  name="q"
                  defaultValue={filters.q}
                  placeholder="Contract, name, phone, email, issue..."
                  style={filterInputStyle}
                />
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="claimsAdmin.requestType" fallback="Request type" /></span>
                <select name="requestType" defaultValue={filters.requestType} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="claimsAdmin.allRequestTypes" fallback="All request types" /></option>
                  <option value="complaint"><AdminText i18nKey="claimsAdmin.complaint" fallback="Complaint" /></option>
                </select>
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
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.contractNumber" fallback="Contract" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.customer" fallback="Customer" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.contact" fallback="Contact" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.serialNumber" fallback="Serial number" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.issue" fallback="Issue" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.created" fallback="Created" /></th>
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
                  <tr key={claim.id}>
                    <td style={tdStyle}>
                      <strong>{claim.contractNumber}</strong>
                      <div style={rowMetaStyle}>{claim.requestType}</div>
                    </td>
                    <td style={tdStyle}>
                      <div>{claim.fullName}</div>
                      <div style={rowMetaStyle}>{truncate(claim.landlordContact, 90)}</div>
                    </td>
                    <td style={tdStyle}>{formatContact(claim)}</td>
                    <td style={tdStyle}>{claim.serialNumber}</td>
                    <td style={tdStyle}>{truncate(claim.problemDescription, 160)}</td>
                    <td style={tdStyle}>{formatDate(claim.createdAt)}</td>
                    <td style={{ ...tdStyle, width: 180 }}>
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

        </AdminSection>
      </div>
    </AdminShell>
  );
}

function DeleteClaimAction({ claimId, compact = false }) {
  return (
    <details style={compact ? cardDeleteDetailsStyle : tableDeleteDetailsStyle}>
      <summary style={deleteSummaryStyle}>
        <AdminText i18nKey="ordersAdmin.delete" fallback="Delete" />
      </summary>
      <form action={`/api/admin/claims/${claimId}`} method="post" style={deleteFormStyle}>
        <button type="submit" name="_intent" value="delete" style={deleteButtonStyle}>
          <AdminText i18nKey="ordersAdmin.confirmDelete" fallback="Confirm delete" />
        </button>
      </form>
    </details>
  );
}

const rowMetaStyle = {
  marginTop: 6,
  color: "var(--app-text-muted)",
  fontSize: 13,
  lineHeight: 1.5,
};

const detailsLinkStyle = {
  color: "var(--app-accent)",
  textDecoration: "none",
  fontWeight: 700,
};

const actionCellStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const tableDeleteDetailsStyle = {
  display: "grid",
  gap: 8,
  justifyItems: "start",
};

const cardDeleteDetailsStyle = {
  display: "grid",
  gap: 8,
};

const deleteSummaryStyle = {
  color: "var(--app-danger-text)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
};

const deleteFormStyle = {
  paddingTop: 8,
};

const deleteButtonStyle = {
  ...dangerButtonStyle,
  minHeight: 38,
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
