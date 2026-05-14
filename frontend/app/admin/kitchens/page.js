import Link from "next/link";
import {
  ActionLink,
  AdminSection,
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
import { AdminDateTime, AdminKitchenDisplayName, AdminStatusBadge, AdminText } from "../../../components/admin-i18n";
import { listKitchensForAdmin } from "../../../lib/catalog";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminKitchensPage() {
  const admin = await requireAdminPage();
  const kitchens = await listKitchensForAdmin();

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="adminShellLogin.kitchens" fallback="Kitchens" />}
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
                    <td style={tdStyle}>{kitchen.slug}</td>
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
                      <span>{kitchen.slug}</span>
                      <span><AdminDateTime value={kitchen.updatedAt.toISOString()} /></span>
                    </div>
                  </div>
                  <AdminStatusBadge status={kitchen.status} />
                </div>
                <div style={subMetaStyle}>
                  <span>{kitchen._count.items} <AdminText i18nKey="kitchensAdmin.itemCount" fallback="item(s)" /></span>
                  <span>{kitchen._count.orders} <AdminText i18nKey="kitchensAdmin.orderCount" fallback="order(s)" /></span>
                  <span>{kitchen._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" /></span>
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
