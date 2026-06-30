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

export default async function AdminCatalogServicesPage() {
  const admin = await requireAdminPage();
  const services = await prisma.catalogService.findMany({
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
          title="Catalog Services"
          description="Reusable service price records. These rows are visible for audit only; checkout still uses KitchenItem.price."
        />

        <AdminSection title="Services">
          {!services.length ? <p style={emptyStateStyle}>No catalog services found.</p> : (
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
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td style={tdStyle}><span style={codePillStyle}>{service.code}</span></td>
                      <td style={tdStyle}>{service.name}</td>
                      <td style={tdStyle}>{service.nameDe || ""}</td>
                      <td style={tdStyle}>{formatMoney(service.price)}</td>
                      <td style={tdStyle}>{formatBoolean(service.isActive)}</td>
                      <td style={tdStyle}>{service._count.kitchenItems}</td>
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
