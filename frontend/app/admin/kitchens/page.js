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
          title="Kitchens"
          description="Database-backed kitchen definitions used by the public configurator."
        >
          <div className="admin-list-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Kitchen</th>
                  <th style={thStyle}>Slug</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Items</th>
                  <th style={thStyle}>Orders</th>
                  <th style={thStyle}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {!kitchens.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={6}>No kitchens found.</td>
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
                        {kitchen.description || "No description"}
                      </div>
                    </td>
                    <td style={tdStyle}>{kitchen.slug}</td>
                    <td style={tdStyle}><StatusBadge status={kitchen.status} /></td>
                    <td style={tdStyle}>{kitchen._count.items}</td>
                    <td style={tdStyle}>{kitchen._count.orders}</td>
                    <td style={tdStyle}>{formatDate(kitchen.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={cardListStyle}>
            {!kitchens.length ? <p style={{ margin: 0, color: "var(--app-text-muted)" }}>No kitchens found.</p> : null}
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
                  {kitchen.description || "No description"}
                </p>
                <div style={subMetaStyle}>
                  <span>{kitchen._count.items} item(s)</span>
                  <span>{kitchen._count.orders} order(s)</span>
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
