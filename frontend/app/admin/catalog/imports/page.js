import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  PageHero,
  actionRowStyle,
  emptyStateStyle,
  formGridStyle,
  inputStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
  textareaStyle,
} from "../../../../components/admin-ui";
import { Fragment } from "react";
import { AdminShell } from "../../../../components/admin-shell";
import AdminConfirmSubmitButton from "../../../../components/admin-confirm-submit-button";
import AdminSelect from "../../../../components/admin-select";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { applyDueScheduledCatalogPriceListImports } from "../../../../lib/catalog-price-list-import";
import { listCatalogPrograms } from "../../../../lib/catalog-programs";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatDateOnly(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
  }).format(value);
}

function todayInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function formatMoney(value) {
  if (value == null) return "-";
  return Number(value || 0).toFixed(2);
}

function getImportChangeRows(entry) {
  return [
    ...(entry.articleHistory || []).map((row) => ({
      type: "Article",
      identifier: row.articleNumber,
      oldPrice: row.oldPrice,
      newPrice: row.newPrice,
    })),
    ...(entry.blendeHistory || []).map((row) => ({
      type: "Blende",
      identifier: row.code,
      oldPrice: row.oldPrice,
      newPrice: row.newPrice,
    })),
    ...(entry.serviceHistory || []).map((row) => ({
      type: "Service",
      identifier: row.code,
      oldPrice: row.oldPrice,
      newPrice: row.newPrice,
    })),
  ];
}

function isMissingCatalogImportTable(error) {
  const message = String(error?.message || "");
  return error?.code === "P2021"
    || error?.code === "P2022"
    || /table .*CatalogPriceListImport.* does not exist/i.test(message)
    || /The table .*CatalogPriceListImport.* does not exist/i.test(message)
    || /CatalogPriceListImport.*(effectiveFrom|syncLinkedKitchenItemsRequested|syncAppliedAt)/i.test(message);
}

async function listCatalogImportHistory() {
  try {
    await applyDueScheduledCatalogPriceListImports(prisma);
    return {
      imports: await prisma.catalogPriceListImport.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          articleHistory: { orderBy: { changedAt: "asc" } },
          blendeHistory: { orderBy: { changedAt: "asc" } },
          serviceHistory: { orderBy: { changedAt: "asc" } },
        },
      }),
      migrationMissing: false,
    };
  } catch (error) {
    if (!isMissingCatalogImportTable(error)) {
      throw error;
    }

    return {
      imports: [],
      migrationMissing: true,
    };
  }
}

export default async function AdminCatalogImportsPage({ searchParams }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = await searchParams;
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const { imports, migrationMissing } = await listCatalogImportHistory();
  const programs = await listCatalogPrograms();

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow="Catalog"
          title="Price List Imports"
          description="Upload supplier price lists, preserve price history, and optionally sync linked kitchen item prices."
          actions={(
            <div style={actionRowStyle}>
              <ActionLink href="/api/admin/catalog/export" secondary>Export Excel</ActionLink>
              <ActionLink href="/admin/catalog/articles">Back to catalog</ActionLink>
            </div>
          )}
        />
        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}
        {migrationMissing ? (
          <FlashMessage
            tone="error"
            message="Catalog price-list import tables are not available yet. Run prisma migrate deploy before using this page."
          />
        ) : null}

        <AdminSection
          title="Import master price list"
          description="Use the exported workbook format with Articles, Blenden, and Services sheets. Records are matched by article number or code."
        >
          <form action="/api/admin/catalog/import" method="post" encType="multipart/form-data" style={importFormStyle}>
            <div style={formGridStyle}>
              <FormField label="Import label">
                <input name="label" placeholder="Supplier July 2026" style={inputStyle} />
              </FormField>
              <FormField label="Programm ID">
                <AdminSelect name="programmId" defaultValue={programs[0]?.programmId || "IP 2200"} required style={inputStyle}>
                  {programs.map((program) => (
                    <option key={program.programmId} value={program.programmId}>
                      {program.programmId}{program.name && program.name !== program.programmId ? ` - ${program.name}` : ""} ({program.kitchenCount} kitchen{program.kitchenCount === 1 ? "" : "s"})
                    </option>
                  ))}
                </AdminSelect>
              </FormField>
              <FormField label="Start date">
                <input name="effectiveFrom" type="date" defaultValue={todayInputValue()} required style={inputStyle} />
              </FormField>
              <FormField label="Price list file">
                <input name="catalogFile" type="file" accept=".xlsx" required style={inputStyle} />
              </FormField>
              <FormField label="Notes" wide>
                <textarea name="notes" rows={2} style={textareaStyle} />
              </FormField>
            </div>

            <div style={optionPanelStyle}>
              <strong>What should happen after import?</strong>
              <p style={mutedTextStyle}>
                The uploaded file always updates the master price list. Choose whether those new prices should also be copied to the kitchen items customers can order.
              </p>
              <p style={syncRecommendationStyle}>
                The start date controls when customer-visible kitchen item prices may be updated. Future-dated imports are stored as scheduled until that date.
              </p>
              <p style={syncRecommendationStyle}>
                Prices are applied only to kitchens with the same Programm ID. A list for IP 2200 will not update kitchens from another program.
              </p>
              <div style={syncOptionGridStyle}>
                <label style={syncOptionStyle}>
                  <input type="checkbox" name="syncLinkedKitchenItems" value="true" style={syncOptionCheckboxStyle} />
                  <span style={syncOptionContentStyle}>
                    <strong>Update prices shown to customers</strong>
                    <span style={syncOptionHelpStyle}>
                      Copies the imported supplier prices to matching products in kitchen configurators with this Programm ID. New customer orders use the new prices; existing orders stay unchanged.
                    </span>
                  </span>
                </label>
              </div>
              <p style={syncRecommendationStyle}>
                Fixed included kitchen items are not changed by price-list imports. If a fixed item should become price-managed later, unlock it first and then apply the new customer prices.
              </p>
            </div>

            <div style={actionRowStyle}>
              <button type="submit" name="_intent" value="preview" formTarget="_blank" style={secondaryButtonStyle}>
                Preview JSON
              </button>
              <AdminConfirmSubmitButton
                name="_intent"
                value="apply"
                style={primaryButtonStyle}
                confirmFallback="Apply this catalog price list import? Existing orders will not be recalculated."
              >
                Apply import
              </AdminConfirmSubmitButton>
            </div>
          </form>
        </AdminSection>

        <AdminSection
          title="Programm IDs"
          description="Create a Programm ID first, then assign kitchens to it from the kitchen create/edit pages. Price lists are imported against one Programm ID."
        >
          <form action="/api/admin/catalog/programs" method="post" style={programFormStyle}>
            <input type="hidden" name="returnTo" value="/admin/catalog/imports" />
            <FormField label="New Programm ID">
              <input name="programmId" placeholder="IP 2400" style={programInputStyle} required />
            </FormField>
            <div style={{ alignSelf: "end" }}>
              <button type="submit" style={secondaryButtonStyle}>Save Programm ID</button>
            </div>
          </form>
          <div style={programListStyle}>
            {programs.map((program) => (
              <span key={program.programmId} style={programPillStyle}>
                {program.programmId}
                <span style={programPillMetaStyle}>{program.kitchenCount} kitchen{program.kitchenCount === 1 ? "" : "s"}</span>
              </span>
            ))}
          </div>
        </AdminSection>

        <AdminSection
          title="Price list history"
          description="Every applied price-list import is kept here. Existing order prices are not recalculated when a new list is imported."
        >
          {!imports.length ? <p style={emptyStateStyle}>No price list imports yet.</p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Starts</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Label</th>
                    <th style={thStyle}>Source</th>
                    <th style={thStyle}>Programm ID</th>
                    <th style={thStyle}>By</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Updated</th>
                    <th style={thStyle}>Unchanged</th>
                    <th style={thStyle}>Synced KitchenItems</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((entry) => {
                    const changeRows = getImportChangeRows(entry);
                    return (
                      <Fragment key={entry.id}>
                        <tr>
                          <td style={tdStyle}>{formatDate(entry.appliedAt || entry.createdAt)}</td>
                          <td style={tdStyle}>{formatDateOnly(entry.effectiveFrom || entry.appliedAt || entry.createdAt)}</td>
                          <td style={tdStyle}>{entry.status || "APPLIED"}</td>
                          <td style={tdStyle}>{entry.label || "-"}</td>
                          <td style={tdStyle}>{entry.sourceName || "-"}</td>
                          <td style={tdStyle}>{entry.programmId || "-"}</td>
                          <td style={tdStyle}>{entry.importedBy || "-"}</td>
                          <td style={tdStyle}>{entry.createdCount}</td>
                          <td style={tdStyle}>{entry.updatedCount}</td>
                          <td style={tdStyle}>{entry.unchangedCount}</td>
                          <td style={tdStyle}>{entry.syncedKitchenItemCount}</td>
                          <td style={tdStyle}>
                            <a href={`/api/admin/catalog/imports/${entry.id}/export`} style={historyDownloadLinkStyle}>
                              Download list
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={12} style={historyDetailCellStyle}>
                            <details>
                              <summary style={historySummaryStyle}>
                                View price-list changes ({changeRows.length})
                              </summary>
                              <p style={historySnapshotNoteStyle}>
                                Use Download list to export a full price-list workbook for this import.
                              </p>
                              {!changeRows.length ? (
                                <p style={historyEmptyStyle}>No price changes were recorded for this import.</p>
                              ) : (
                                <div style={historyChangeGridStyle}>
                                  <div style={historyHeaderStyle}>Type</div>
                                  <div style={historyHeaderStyle}>Identifier</div>
                                  <div style={historyHeaderStyle}>Old price</div>
                                  <div style={historyHeaderStyle}>New price</div>
                                  {changeRows.map((row, index) => (
                                    <Fragment key={`${row.type}-${row.identifier}-${index}`}>
                                      <div style={historyCellStyle}>{row.type}</div>
                                      <div style={historyCellStyle}>{row.identifier}</div>
                                      <div style={historyCellStyle}>{formatMoney(row.oldPrice)}</div>
                                      <div style={historyCellStyle}>{formatMoney(row.newPrice)}</div>
                                    </Fragment>
                                  ))}
                                </div>
                              )}
                            </details>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const importFormStyle = {
  display: "grid",
  gap: 16,
};

const optionPanelStyle = {
  display: "grid",
  gap: 12,
  padding: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  background: "var(--app-surface)",
};

const syncOptionGridStyle = {
  display: "grid",
  gap: 10,
};

const syncOptionStyle = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  alignItems: "start",
  gap: 10,
  padding: 12,
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  background: "var(--color-card)",
};

const syncOptionCheckboxStyle = {
  marginTop: 3,
};

const syncOptionContentStyle = {
  display: "grid",
  gap: 4,
  minWidth: 0,
  fontWeight: 700,
  color: "var(--app-text)",
};

const syncOptionHelpStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 600,
};

const syncRecommendationStyle = {
  ...mutedTextStyle,
  margin: 0,
  fontSize: 13,
};

const programFormStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(160px, 260px) auto",
  gap: 12,
  alignItems: "start",
};

const programInputStyle = {
  ...inputStyle,
  maxWidth: 260,
};

const programListStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 14,
};

const programPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface)",
  color: "var(--app-text)",
  fontSize: 13,
  fontWeight: 800,
};

const programPillMetaStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
};

const historyDetailCellStyle = {
  ...tdStyle,
  paddingTop: 0,
  background: "var(--app-surface)",
};

const historySummaryStyle = {
  width: "fit-content",
  cursor: "pointer",
  color: "var(--app-accent)",
  fontWeight: 800,
  padding: "8px 0",
};

const historyEmptyStyle = {
  ...mutedTextStyle,
  margin: "4px 0 10px",
};

const historySnapshotNoteStyle = {
  ...mutedTextStyle,
  margin: "0 0 10px",
  fontSize: 13,
};

const historyDownloadLinkStyle = {
  ...secondaryButtonStyle,
  minHeight: 34,
  padding: "7px 10px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
};

const historyChangeGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(90px, 0.6fr) minmax(160px, 1.4fr) minmax(90px, 0.7fr) minmax(90px, 0.7fr)",
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  background: "var(--color-card)",
  overflowX: "auto",
};

const historyHeaderStyle = {
  padding: "9px 10px",
  color: "var(--app-text-muted)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderBottom: "1px solid var(--app-border)",
};

const historyCellStyle = {
  padding: "9px 10px",
  borderTop: "1px solid rgba(115, 80, 55, 0.08)",
  color: "var(--app-text)",
  fontSize: 13,
  fontWeight: 650,
  overflowWrap: "anywhere",
};
