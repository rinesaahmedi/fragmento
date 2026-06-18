import { KitchenStatus } from "@prisma/client";
import Link from "next/link";
import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  actionRowStyle,
  cardListStyle,
  formGridStyle,
  inputStyle,
  itemCardStyle,
  pageGridStyle,
  primaryButtonStyle,
  subMetaStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
  textareaStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminDateTime, AdminKitchenDisplayName, AdminPluralText, AdminStatusBadge, AdminText } from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import { listKitchensForAdmin } from "../../../lib/catalog";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

function formatKitchenCode(kitchen) {
  return kitchen.kitchenCode || "No code";
}

const KITCHEN_STATUS_OPTIONS = Object.values(KitchenStatus);

export default async function AdminKitchensPage({ searchParams }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const kitchens = await listKitchensForAdmin();

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="kitchensAdmin.addKitchen" fallback="Add Kitchen" />}
          description={<AdminText i18nKey="kitchensAdmin.addKitchenDescription" fallback="Create a kitchen record with the three default catalog items. Add the remaining items from the kitchen detail page." />}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action="/api/admin/kitchens" method="post" style={formGridStyle}>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.kitchenName" fallback="Kitchen name" />}>
              <input name="name" placeholder="AB 105807 Kitchen" style={inputStyle} required />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.kitchenCode" fallback="Kitchen code" />}>
              <input name="kitchenCode" placeholder="105 807" style={inputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.status" fallback="Status" />}>
              <AdminSelect name="status" defaultValue={KitchenStatus.DRAFT} style={inputStyle}>
                {KITCHEN_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.description" fallback="Description" />} wide>
              <textarea
                name="description"
                placeholder="Kitchen configuration based on frontend/public/pdfs/AB 105807.pdf"
                rows={2}
                style={textareaStyle}
              />
            </FormField>
            <div style={{ gridColumn: "1 / -1", ...actionRowStyle }}>
              <button type="submit" style={primaryButtonStyle}>
                <AdminText i18nKey="kitchensAdmin.createKitchen" fallback="Create kitchen" />
              </button>
              <span style={defaultItemsHintStyle}>
                <AdminText i18nKey="kitchensAdmin.defaultItemsHint" fallback="Defaults added: waste separation, cutlery insert, LED lighting." />
              </span>
            </div>
          </form>
        </AdminSection>

        <AdminSection
          title="Import Kitchen from PDF + Excel"
          description="Upload the AB plan PDF and supplier Excel sheet. NR in Excel must match the numbered callouts on the PDF. Slots, hotspots, and catalog items are assigned automatically from article codes (US60, H6002, A-EGSPV…, DEFAULT rows). Layout template is optional and only used for product names when PDF callouts are missing."
        >
          <form action="/api/admin/kitchens/import" method="post" encType="multipart/form-data" style={formGridStyle}>
            <FormField label="Plan PDF">
              <input name="pdfFile" type="file" accept="application/pdf,.pdf" style={inputStyle} required />
            </FormField>
            <FormField label="Supplier Excel">
              <input
                name="excelFile"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                style={inputStyle}
                required
              />
            </FormField>
            <FormField label="Layout template kitchen (optional)">
              <AdminSelect name="layoutTemplateKitchenId" style={inputStyle}>
                <option value="">No template — use componentKey column or auto-detect</option>
                {kitchens.map((kitchen) => (
                  <option key={`template-${kitchen.id}`} value={kitchen.id}>
                    {formatKitchenCode(kitchen)} - {kitchen.name}
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.kitchenName" fallback="Kitchen name" />}>
              <input name="name" placeholder="AB 105813 Kitchen" style={inputStyle} required />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.kitchenCode" fallback="Kitchen code" />}>
              <input name="kitchenCode" placeholder="105 813" style={inputStyle} />
            </FormField>
            <FormField label="Contract number">
              <input name="contractNumber" placeholder="736277" style={inputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.status" fallback="Status" />}>
              <AdminSelect name="status" defaultValue={KitchenStatus.DRAFT} style={inputStyle}>
                {KITCHEN_STATUS_OPTIONS.map((status) => (
                  <option key={`import-${status}`} value={status}>
                    {status}
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.description" fallback="Description" />} wide>
              <textarea
                name="description"
                placeholder="Optional description. Defaults to the uploaded file names."
                rows={2}
                style={textareaStyle}
              />
            </FormField>
            <input type="hidden" name="startCodexAgent" value="false" />
            <label style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", color: "var(--app-text)", fontWeight: 800 }}>
              <input type="checkbox" name="startCodexAgent" value="true" defaultChecked />
              <span>Start Codex finisher automatically after import</span>
            </label>
            <div style={{ gridColumn: "1 / -1", ...actionRowStyle }}>
              <button type="submit" style={primaryButtonStyle}>Import kitchen</button>
              <span style={defaultItemsHintStyle}>
                Preferred: add componentKey per row (e.g. wall-cabinet-2, oven-module). Requires Python 3 and local Codex CLI on the server.
              </span>
            </div>
          </form>
        </AdminSection>

        <AdminSection
          title="Duplicate Kitchen"
          description="Copy an existing kitchen, its catalog items, plan metadata, and optional contract number. Use this for repeated AB PDF kitchens with the same layout."
        >
          <form action="/api/admin/kitchens/duplicate" method="post" style={formGridStyle}>
            <FormField label="Source kitchen">
              <AdminSelect name="sourceKitchenId" style={inputStyle} required>
                <option value="">Choose source</option>
                {kitchens.map((kitchen) => (
                  <option key={kitchen.id} value={kitchen.id}>
                    {formatKitchenCode(kitchen)} - {kitchen.name}
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.kitchenName" fallback="Kitchen name" />}>
              <input name="name" placeholder="AB 105812 Kitchen" style={inputStyle} required />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.kitchenCode" fallback="Kitchen code" />}>
              <input name="kitchenCode" placeholder="105 812" style={inputStyle} />
            </FormField>
            <FormField label="Contract number">
              <input name="contractNumber" placeholder="736276" style={inputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.status" fallback="Status" />}>
              <AdminSelect name="status" defaultValue={KitchenStatus.DRAFT} style={inputStyle}>
                {KITCHEN_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label="Plan image path">
              <input name="planImagePath" placeholder="/plans/AB%20105812.svg" style={inputStyle} />
            </FormField>
            <FormField label="Plan PDF path">
              <input name="planPdfPath" placeholder="/pdfs/AB%20105812.pdf" style={inputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.description" fallback="Description" />} wide>
              <textarea
                name="description"
                placeholder="Kitchen configuration based on frontend/public/jpg/AB 105812_page-0001.jpg"
                rows={2}
                style={textareaStyle}
              />
            </FormField>
            <div style={{ gridColumn: "1 / -1", ...actionRowStyle }}>
              <button type="submit" style={primaryButtonStyle}>Duplicate kitchen</button>
              <span style={defaultItemsHintStyle}>Blank plan paths inherit from the source kitchen.</span>
            </div>
          </form>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="adminShellLogin.kitchens" fallback="Kitchens" />}
        >
          <div className="admin-list-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.kitchen" fallback="Kitchen" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.kitchenCode" fallback="Kitchen code" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.status" fallback="Status" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.items" fallback="Items" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.orders" fallback="Orders" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.contracts" fallback="Contracts" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.updated" fallback="Updated" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!kitchens.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={8}><AdminText i18nKey="kitchensAdmin.noKitchensFound" fallback="No kitchens found." /></td>
                  </tr>
                ) : null}
                {kitchens.map((kitchen) => (
                  <tr key={kitchen.id}>
                    <td style={tdStyle}>
                      <Link
                        href={`/admin/kitchens/${kitchen.id}`}
                        style={{ color: "var(--app-accent)", fontWeight: 800, textDecoration: "none" }}
                      >
                        <AdminKitchenDisplayName slug={kitchen.slug} name={kitchen.name} />
                      </Link>
                    </td>
                    <td style={tdStyle}>{formatKitchenCode(kitchen)}</td>
                    <td style={tdStyle}><AdminStatusBadge status={kitchen.status} /></td>
                    <td style={tdStyle}>{kitchen._count.items}</td>
                    <td style={tdStyle}>{kitchen._count.orders}</td>
                    <td style={tdStyle}>{kitchen._count.contracts}</td>
                    <td style={tdStyle}><AdminDateTime value={kitchen.updatedAt.toISOString()} /></td>
                    <td style={tdStyle}>
                      <ActionLink href={`/admin/kitchens/${kitchen.id}`}>
                        <AdminText i18nKey="kitchensAdmin.manage" fallback="Manage" />
                      </ActionLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={{ gap: cardListStyle.gap }}>
            {!kitchens.length ? <p style={{ margin: 0, color: "var(--app-text-muted)" }}><AdminText i18nKey="kitchensAdmin.noKitchensFound" fallback="No kitchens found." /></p> : null}
            {kitchens.map((kitchen) => (
              <article key={kitchen.id} style={itemCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <Link
                      href={`/admin/kitchens/${kitchen.id}`}
                      style={{ color: "var(--app-accent)", fontWeight: 800, textDecoration: "none" }}
                    >
                      <AdminKitchenDisplayName slug={kitchen.slug} name={kitchen.name} />
                    </Link>
                    <div style={subMetaStyle}>
                      <span>{formatKitchenCode(kitchen)}</span>
                      <span><AdminDateTime value={kitchen.updatedAt.toISOString()} /></span>
                    </div>
                  </div>
                  <AdminStatusBadge status={kitchen.status} />
                </div>
                <div style={subMetaStyle}>
                  <span>{kitchen._count.items} <AdminText i18nKey="kitchensAdmin.itemCount" fallback="item(s)" /></span>
                  <span>{kitchen._count.orders} <AdminText i18nKey="kitchensAdmin.orderCount" fallback="order(s)" /></span>
                  <span>
                    <AdminPluralText
                      count={kitchen._count.contracts}
                      singularKey="kitchensAdmin.contractCountSingular"
                      pluralKey="kitchensAdmin.contractCountPlural"
                      singularFallback="{count} contract"
                      pluralFallback="{count} contracts"
                    />
                  </span>
                </div>
                <div>
                  <ActionLink href={`/admin/kitchens/${kitchen.id}`}>
                    <AdminText i18nKey="kitchensAdmin.manage" fallback="Manage" />
                  </ActionLink>
                </div>
              </article>
            ))}
          </div>

          <style>{`
            .admin-list-cards {
              display: none;
            }

            @media (max-width: 760px) {
              .admin-list-table {
                display: none;
              }

              .admin-list-cards {
                display: grid;
              }
            }
          `}</style>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const defaultItemsHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};
