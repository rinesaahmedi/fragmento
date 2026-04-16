import Link from "next/link";
import {
  AdminSection,
  StatusBadge,
  cardListStyle,
  itemCardStyle,
  pageGridStyle,
  subMetaStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText } from "../../../components/admin-i18n";
import { AdminKitchenDescription } from "../../../components/admin-kitchen-description";
import { listKitchensForAdmin } from "../../../lib/catalog";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminKitchensPage() {
  const admin = await requireAdminPage();
  const kitchens = await listKitchensForAdmin();

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="adminShellLogin.kitchens" fallback="Kitchens" />}
          description={<AdminText i18nKey="kitchensAdmin.databaseBackedKitchenDefinitionsUsedByPublicConfigurator" fallback="Database-backed kitchen definitions used by the public configurator." />}
        >
          <div className="admin-list-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.kitchen" fallback="Kitchen" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.slug" fallback="Slug" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.status" fallback="Status" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.items" fallback="Items" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.orders" fallback="Orders" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.contracts" fallback="Contracts" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.updated" fallback="Updated" /></th>
                </tr>
              </thead>
              <tbody>
                {!kitchens.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={7}><AdminText i18nKey="kitchensAdmin.noKitchensFound" fallback="No kitchens found." /></td>
                  </tr>
                ) : null}
                {kitchens.map((kitchen) => (
                  <tr key={kitchen.id}>
                    <td style={tdStyle}>
                      <Link
                        href={`/admin/kitchens/${kitchen.id}`}
                        style={{ color: "var(--app-accent)", fontWeight: 800, textDecoration: "none" }}
                      >
                        {kitchen.name}
                      </Link>
                      <div style={{ color: "var(--app-text-muted)", marginTop: 6 }}>
                        <AdminKitchenDescription
                          kitchen={kitchen}
                          fallback={<AdminText i18nKey="kitchensAdmin.noDescription" fallback="No description" />}
                        />
                      </div>
                    </td>
                    <td style={tdStyle}>{kitchen.slug}</td>
                    <td style={tdStyle}><StatusBadge status={kitchen.status} /></td>
                    <td style={tdStyle}>{kitchen._count.items}</td>
                    <td style={tdStyle}>{kitchen._count.orders}</td>
                    <td style={tdStyle}>{kitchen._count.contracts}</td>
                    <td style={tdStyle}>{formatDate(kitchen.updatedAt)}</td>
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
                      {kitchen.name}
                    </Link>
                    <div style={subMetaStyle}>
                      <span>{kitchen.slug}</span>
                      <span>{formatDate(kitchen.updatedAt)}</span>
                    </div>
                  </div>
                  <StatusBadge status={kitchen.status} />
                </div>
                <p style={{ margin: 0, color: "var(--app-text-muted)", lineHeight: 1.6 }}>
                  <AdminKitchenDescription
                    kitchen={kitchen}
                    fallback={<AdminText i18nKey="kitchensAdmin.noDescription" fallback="No description" />}
                  />
                </p>
                <div style={subMetaStyle}>
                  <span>{kitchen._count.items} <AdminText i18nKey="kitchensAdmin.itemCount" fallback="item(s)" /></span>
                  <span>{kitchen._count.orders} <AdminText i18nKey="kitchensAdmin.orderCount" fallback="order(s)" /></span>
                  <span>{kitchen._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" /></span>
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
