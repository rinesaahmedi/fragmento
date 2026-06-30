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

export default async function AdminCatalogArticlesPage() {
  const admin = await requireAdminPage();
  const articles = await prisma.catalogArticle.findMany({
    include: {
      _count: { select: { kitchenItems: true } },
    },
    orderBy: [
      { itemType: "asc" },
      { articleNumber: "asc" },
    ],
  });

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow="Read-only"
          title="Catalog Articles"
          description="Reusable sellable articles and fixed-price packages. These rows are visible for audit only; checkout still uses KitchenItem.price."
        />

        <AdminSection title="Articles">
          {!articles.length ? <p style={emptyStateStyle}>No catalog articles found.</p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Article number</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>German name</th>
                    <th style={thStyle}>Item type</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Fixed package</th>
                    <th style={thStyle}>Active</th>
                    <th style={thStyle}>Linked KitchenItems</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id}>
                      <td style={tdStyle}><span style={codePillStyle}>{article.articleNumber}</span></td>
                      <td style={tdStyle}>{article.name}</td>
                      <td style={tdStyle}>{article.nameDe || ""}</td>
                      <td style={tdStyle}>{article.itemType}</td>
                      <td style={tdStyle}>{formatMoney(article.price)}</td>
                      <td style={tdStyle}>{formatBoolean(article.isFixedPricePackage)}</td>
                      <td style={tdStyle}>{formatBoolean(article.isActive)}</td>
                      <td style={tdStyle}>{article._count.kitchenItems}</td>
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
