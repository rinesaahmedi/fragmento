import {
  ActionLink,
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

function formatDimensionPart(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : "-";
}

function formatDimensions(article) {
  if (!article.widthMm && !article.heightMm && !article.depthMm) return "";
  return [
    formatDimensionPart(article.widthMm),
    formatDimensionPart(article.heightMm),
    formatDimensionPart(article.depthMm),
  ].join(" x ") + " mm";
}

export default async function AdminCatalogArticlesPage() {
  const admin = await requireAdminPage();
  const [articles, blenden, services] = await Promise.all([
    prisma.$queryRaw`
    SELECT
      ca."id",
      ca."articleNumber",
      ca."name",
      ca."nameDe",
      ca."widthMm",
      ca."heightMm",
      ca."depthMm",
      ca."price",
      ca."itemType",
      ca."isFixedPricePackage",
      ca."isActive",
      COUNT(ki."id")::int AS "linkedKitchenItems"
    FROM "CatalogArticle" ca
    LEFT JOIN "KitchenItem" ki ON ki."catalogArticleId" = ca."id"
    GROUP BY ca."id"
    ORDER BY ca."itemType" ASC, ca."articleNumber" ASC
    `,
    prisma.$queryRaw`
    SELECT
      cb."id",
      cb."code",
      cb."name",
      cb."nameDe",
      cb."description",
      cb."price",
      cb."isActive",
      COUNT(ki."id")::int AS "linkedKitchenItems"
    FROM "CatalogBlende" cb
    LEFT JOIN "KitchenItem" ki ON ki."catalogBlendeId" = cb."id"
    GROUP BY cb."id"
    ORDER BY cb."code" ASC
    `,
    prisma.$queryRaw`
    SELECT
      cs."id",
      cs."code",
      cs."name",
      cs."nameDe",
      cs."description",
      cs."price",
      cs."isActive",
      COUNT(ki."id")::int AS "linkedKitchenItems"
    FROM "CatalogService" cs
    LEFT JOIN "KitchenItem" ki ON ki."catalogServiceId" = cs."id"
    GROUP BY cs."id"
    ORDER BY cs."code" ASC
    `,
  ]);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow="Read-only"
          title="Catalog"
          description="Reusable articles, blenden, and services. These rows are visible for audit only; checkout still uses KitchenItem.price."
          actions={<ActionLink href="/api/admin/catalog/export" secondary>Export Excel</ActionLink>}
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
                    <th style={thStyle}>Dimensions (W x H x D)</th>
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
                      <td style={tdStyle}>{formatDimensions(article)}</td>
                      <td style={tdStyle}>{article.itemType}</td>
                      <td style={tdStyle}>{formatMoney(article.price)}</td>
                      <td style={tdStyle}>{formatBoolean(article.isFixedPricePackage)}</td>
                      <td style={tdStyle}>{formatBoolean(article.isActive)}</td>
                      <td style={tdStyle}>{article.linkedKitchenItems}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection title="Blenden">
          {!blenden.length ? <p style={emptyStateStyle}>No catalog blenden found.</p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>German name</th>
                    <th style={thStyle}>Description</th>
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
                      <td style={tdStyle}>{blende.description || ""}</td>
                      <td style={tdStyle}>{formatMoney(blende.price)}</td>
                      <td style={tdStyle}>{formatBoolean(blende.isActive)}</td>
                      <td style={tdStyle}>{blende.linkedKitchenItems}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection title="Services">
          {!services.length ? <p style={emptyStateStyle}>No catalog services found.</p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>German name</th>
                    <th style={thStyle}>Description</th>
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
                      <td style={tdStyle}>{service.description || ""}</td>
                      <td style={tdStyle}>{formatMoney(service.price)}</td>
                      <td style={tdStyle}>{formatBoolean(service.isActive)}</td>
                      <td style={tdStyle}>{service.linkedKitchenItems}</td>
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
