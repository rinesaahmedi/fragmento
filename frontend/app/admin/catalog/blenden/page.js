import {
  AdminSection,
  PageHero,
  codePillStyle,
  emptyStateStyle,
  pageGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import { requireAdminPage } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatBoolean(value) {
  return value ? "Yes" : "No";
}

export default async function AdminCatalogBlendenPage() {
  const admin = await requireAdminPage();
  const blenden = await prisma.catalogBlende.findMany({
    include: {
      _count: { select: { kitchenItems: true } },
    },
    orderBy: [
      { code: "asc" },
    ],
  });

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow="Read-only"
          title="Catalog Blenden"
          description="Reusable blende price records. These rows are visible for audit only; checkout still uses KitchenItem.price."
        />

        <AdminSection title="Blenden">
          {!blenden.length ? <p style={emptyStateStyle}>No catalog blenden found.</p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>German name</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Active</th>
                    <th style={thStyle}>Linked KitchenItems</th>
                  </tr>
                </thead>
                <tbody>
                  {blenden.map((blende) => (
                    <tr key={blende.id}>
                      <td style={tdStyle}><span style={codePillStyle}>{blende.code}</span></td>
                      <td style={tdStyle}>{blende.name}</td>
                      <td style={tdStyle}>{blende.nameDe || ""}</td>
                      <td style={tdStyle}>{formatMoney(blende.price)}</td>
                      <td style={tdStyle}>{formatBoolean(blende.isActive)}</td>
                      <td style={tdStyle}>{blende._count.kitchenItems}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </div>
    </AdminShell>
  );
}
