import {
  AdminSection,
  MetricCard,
  PageHero,
  codePillStyle,
  emptyStateStyle,
  pageGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { requireAdminPage } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

const TEST_KITCHEN_SLUG = "test-3d-kitchen";
const LEGACY_MARKERS = ["DEFAULT + UPK20", "UPK20(0.16CM)", "HPK2002(0.5CM)"];

function formatMoney(value) {
  if (value == null) return null;
  return Number(value).toFixed(2);
}

function nullableString(value) {
  if (value == null || value === "") return null;
  return String(value);
}

function normalizeBlendeCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (code.startsWith("UPK20")) return "UPK20";
  if (code.startsWith("UPEF65")) return "UPEF65";
  if (code.startsWith("HPK2002")) return "HPK2002";
  return "";
}

function isDefaultIncluded(item) {
  const code = String(item.code || "").toUpperCase();
  const iconKey = String(item.iconKey || "").toLowerCase();
  const componentKey = String(item.componentKey || "").toLowerCase();

  return Boolean(item.isLocked) && (
    code === "OVEN-B-600-HOB"
    || code === "SINKBASE-B-600"
    || code === "SINK-WORKTOP"
    || code.startsWith("TOP-")
    || iconKey === "worktop"
    || componentKey === "worktop"
  );
}

function getCompositeMarkerWarnings(item) {
  const values = [
    ["articleNumber", item.articleNumber],
    ["blendeCode", item.blendeCode],
    ["blendeLabel", item.blendeLabel],
    ["name", item.name],
    ["nameDe", item.nameDe],
  ];
  const warnings = [];

  for (const marker of LEGACY_MARKERS) {
    for (const [field, value] of values) {
      if (String(value || "").includes(marker)) {
        warnings.push(`${field}: ${marker}`);
      }
    }
  }

  for (const [field, value] of values) {
    const text = String(value || "");
    if (!text) continue;
    if ((field === "articleNumber" || field === "blendeCode" || field === "blendeLabel") && /\s\+\s|\([^)]*\)/.test(text)) {
      warnings.push(`${field}: composite article/blende string`);
    }
  }

  return warnings;
}

function compactItem(item, extra = {}) {
  return {
    kitchenSlug: item.kitchen.slug,
    code: item.code,
    name: item.name,
    itemType: item.itemType,
    price: formatMoney(item.price),
    articleNumber: nullableString(item.articleNumber),
    blendeCode: nullableString(item.blendeCode),
    blendePrice: formatMoney(item.blendePrice),
    catalogLinkStatus: nullableString(item.catalogLinkStatus),
    ...extra,
  };
}

function getCatalogExpectedPrice(item) {
  if (item.catalogService) {
    return Number(item.catalogService.price);
  }

  if (!item.catalogArticle) {
    return null;
  }

  let expected = Number(item.catalogArticle.price);
  if (item.catalogBlende) {
    expected += Number(item.catalogBlende.price) * Number(item.catalogBlendeQuantity || 1);
  }
  return expected;
}

function hasAnyCatalogLink(item) {
  return Boolean(
    item.catalogArticleId
    || item.catalogBlendeId
    || item.catalogBlendeQuantity != null
    || item.catalogServiceId
    || item.catalogLinkStatus,
  );
}

function auditCatalogItems(items) {
  const productionItems = items.filter((item) => item.kitchen.slug !== TEST_KITCHEN_SLUG);
  const testItems = items.filter((item) => item.kitchen.slug === TEST_KITCHEN_SLUG);
  const matchedItems = productionItems.filter((item) => item.catalogLinkStatus === "MATCHED");
  const defaultIncludedRows = productionItems.filter((item) => isDefaultIncluded(item));
  const defaultIncludedUnlinkedRows = defaultIncludedRows.filter((item) => !hasAnyCatalogLink(item));
  const testLinkedRows = testItems.filter(hasAnyCatalogLink);

  const priceMismatches = [];
  const missingCatalogRows = [];
  const inactiveCatalogLinks = [];
  const linkStateIssues = [];
  const markerWarnings = [];

  for (const item of productionItems) {
    const warnings = getCompositeMarkerWarnings(item);
    if (warnings.length) {
      markerWarnings.push(compactItem(item, { warnings }));
    }

    if (item.catalogLinkStatus === "MATCHED") {
      const hasCatalogTarget = Boolean(item.catalogArticle || item.catalogService);
      const expectedPrice = getCatalogExpectedPrice(item);

      if (!hasCatalogTarget) {
        missingCatalogRows.push(compactItem(item, { reason: "MATCHED row has no catalog article/service target" }));
      } else if (expectedPrice != null && formatMoney(expectedPrice) !== formatMoney(item.price)) {
        priceMismatches.push(compactItem(item, {
          expectedPrice: formatMoney(expectedPrice),
          reason: "catalog-derived price differs from KitchenItem.price",
        }));
      }

      if (item.catalogArticle?.isActive === false) {
        inactiveCatalogLinks.push(compactItem(item, { catalogType: "CatalogArticle", catalogKey: item.catalogArticle.articleNumber }));
      }
      if (item.catalogBlende?.isActive === false) {
        inactiveCatalogLinks.push(compactItem(item, { catalogType: "CatalogBlende", catalogKey: item.catalogBlende.code }));
      }
      if (item.catalogService?.isActive === false) {
        inactiveCatalogLinks.push(compactItem(item, { catalogType: "CatalogService", catalogKey: item.catalogService.code }));
      }

      if (item.catalogBlendeId && !item.catalogArticleId) {
        linkStateIssues.push(compactItem(item, { reason: "blende link without article link" }));
      }
      if (item.catalogBlendeId && !item.catalogBlendeQuantity) {
        linkStateIssues.push(compactItem(item, { reason: "blende link without quantity" }));
      }
      if (item.catalogArticleId && item.catalogServiceId) {
        linkStateIssues.push(compactItem(item, { reason: "article and service links are both set" }));
      }
    }

    if (isDefaultIncluded(item) && hasAnyCatalogLink(item)) {
      linkStateIssues.push(compactItem(item, { reason: "default included row should remain unlinked" }));
    }
  }

  const problemKeys = new Set(
    [...priceMismatches, ...missingCatalogRows, ...inactiveCatalogLinks, ...linkStateIssues]
      .map((item) => `${item.kitchenSlug}|${item.code}`),
  );
  const markerProblems = markerWarnings.filter((item) => problemKeys.has(`${item.kitchenSlug}|${item.code}`));

  const matchedArticleOnlyRows = matchedItems.filter((item) => item.catalogArticleId && !item.catalogBlendeId && !item.catalogServiceId && !item.catalogArticle?.isFixedPricePackage);
  const matchedArticleBlendeRows = matchedItems.filter((item) => item.catalogArticleId && item.catalogBlendeId);
  const matchedServiceRows = matchedItems.filter((item) => item.catalogServiceId);
  const fixedPackageRows = matchedItems.filter((item) => item.catalogArticle?.isFixedPricePackage);

  return {
    productionItems,
    testItems,
    matchedItems,
    matchedArticleOnlyRows,
    matchedArticleBlendeRows,
    matchedServiceRows,
    fixedPackageRows,
    defaultIncludedRows,
    defaultIncludedUnlinkedRows,
    testLinkedRows,
    priceMismatches,
    missingCatalogRows,
    inactiveCatalogLinks,
    linkStateIssues,
    markerWarnings,
    markerProblems,
  };
}

async function loadCatalogAuditData() {
  const [catalogCounts, items] = await Promise.all([
    Promise.all([
      prisma.catalogArticle.count(),
      prisma.catalogBlende.count(),
      prisma.catalogService.count(),
    ]),
    prisma.kitchenItem.findMany({
      include: {
        kitchen: { select: { slug: true, kitchenCode: true, name: true } },
        catalogArticle: { select: { articleNumber: true, price: true, isActive: true, isFixedPricePackage: true } },
        catalogBlende: { select: { code: true, price: true, isActive: true } },
        catalogService: { select: { code: true, price: true, isActive: true } },
      },
      orderBy: [
        { kitchen: { slug: "asc" } },
        { sortOrder: "asc" },
        { code: "asc" },
      ],
    }),
  ]);

  const audit = auditCatalogItems(items);

  return {
    counts: {
      catalogArticles: catalogCounts[0],
      catalogBlenden: catalogCounts[1],
      catalogServices: catalogCounts[2],
      totalKitchenItems: items.length,
      seededKitchenItems: audit.productionItems.length,
      matchedRows: audit.matchedItems.length,
      defaultIncludedUnlinkedRows: audit.defaultIncludedUnlinkedRows.length,
      testUnlinkedRows: audit.testItems.length - audit.testLinkedRows.length,
      priceMismatches: audit.priceMismatches.length,
      missingCatalogRows: audit.missingCatalogRows.length,
      inactiveCatalogLinks: audit.inactiveCatalogLinks.length,
      catalogLinkStateIssues: audit.linkStateIssues.length,
      compositeMarkerWarnings: audit.markerWarnings.length,
      compositeMarkerProblems: audit.markerProblems.length,
    },
    audit,
  };
}

function SampleTable({ title, rows, columns }) {
  return (
    <AdminSection title={title}>
      {!rows.length ? <p style={emptyStateStyle}>No rows.</p> : (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} style={thStyle}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((row, index) => (
                <tr key={`${row.kitchenSlug}-${row.code}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key} style={tdStyle}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSection>
  );
}

const rowColumns = [
  { key: "kitchenSlug", label: "Kitchen" },
  { key: "code", label: "Code", render: (row) => <span style={codePillStyle}>{row.code}</span> },
  { key: "name", label: "Name" },
  { key: "articleNumber", label: "Article" },
  { key: "price", label: "Price" },
];

export default async function AdminCatalogAuditPage() {
  const admin = await requireAdminPage();
  const { counts, audit } = await loadCatalogAuditData();

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow="Read-only"
          title="Catalog Audit"
          description="Catalog visibility for linked kitchen items. This page does not edit catalog records, KitchenItem prices, checkout, or order data."
          stats={[
            <MetricCard key="articles" label="CatalogArticle" value={counts.catalogArticles} detail="Reusable articles" />,
            <MetricCard key="matched" label="MATCHED rows" value={counts.matchedRows} detail="Linked KitchenItems" />,
            <MetricCard key="defaults" label="Default unlinked" value={counts.defaultIncludedUnlinkedRows} detail="Intentionally no catalog link" />,
            <MetricCard key="warnings" label="Composite warnings" value={counts.compositeMarkerWarnings} detail={`${counts.compositeMarkerProblems} real problems`} />,
          ]}
        />

        <AdminSection title="Status Summary" description="Counts are read from the live database. KitchenItem.price remains the checkout source of truth.">
          <div style={summaryGridStyle}>
            <SummaryItem label="CatalogBlende" value={counts.catalogBlenden} />
            <SummaryItem label="CatalogService" value={counts.catalogServices} />
            <SummaryItem label="Total KitchenItem rows" value={counts.totalKitchenItems} />
            <SummaryItem label="Seeded KitchenItem rows" value={counts.seededKitchenItems} />
            <SummaryItem label="test-3d-kitchen unlinked rows" value={counts.testUnlinkedRows} />
            <SummaryItem label="Price mismatches" value={counts.priceMismatches} tone={counts.priceMismatches ? "bad" : "good"} />
            <SummaryItem label="Missing catalog rows" value={counts.missingCatalogRows} tone={counts.missingCatalogRows ? "bad" : "good"} />
            <SummaryItem label="Inactive catalog links" value={counts.inactiveCatalogLinks} tone={counts.inactiveCatalogLinks ? "bad" : "good"} />
            <SummaryItem label="Catalog link state issues" value={counts.catalogLinkStateIssues} tone={counts.catalogLinkStateIssues ? "bad" : "good"} />
            <SummaryItem label="Composite marker real problems" value={counts.compositeMarkerProblems} tone={counts.compositeMarkerProblems ? "bad" : "good"} />
          </div>
        </AdminSection>

        <SampleTable
          title="MATCHED Article-Only Rows"
          rows={audit.matchedArticleOnlyRows.map((item) => compactItem(item, { articleNumber: item.catalogArticle?.articleNumber || item.articleNumber }))}
          columns={rowColumns}
        />
        <SampleTable
          title="MATCHED Article + Blende Rows"
          rows={audit.matchedArticleBlendeRows.map((item) => compactItem(item, {
            articleNumber: item.catalogArticle?.articleNumber || item.articleNumber,
            blendeCode: normalizeBlendeCode(item.blendeCode),
          }))}
          columns={[...rowColumns, { key: "blendeCode", label: "Blende" }]}
        />
        <SampleTable
          title="MATCHED Service Rows"
          rows={audit.matchedServiceRows.map((item) => compactItem(item, { articleNumber: item.catalogService?.code || item.code }))}
          columns={rowColumns}
        />
        <SampleTable
          title="Fixed-Price Package Rows"
          rows={audit.fixedPackageRows.map((item) => compactItem(item, { articleNumber: item.catalogArticle?.articleNumber || item.articleNumber }))}
          columns={rowColumns}
        />
        <SampleTable
          title="Default Included Rows Intentionally Unlinked"
          rows={audit.defaultIncludedUnlinkedRows.map((item) => compactItem(item))}
          columns={rowColumns}
        />
        <SampleTable
          title="Composite Marker Warning Examples"
          rows={audit.markerWarnings.map((row) => ({
            ...row,
            warningText: row.warnings.join("; "),
          }))}
          columns={[...rowColumns, { key: "warningText", label: "Warning" }]}
        />
      </div>
    </AdminShell>
  );
}

function SummaryItem({ label, value, tone }) {
  const color = tone === "bad"
    ? "var(--app-danger-text)"
    : tone === "good"
      ? "var(--app-success-text)"
      : "var(--app-text)";

  return (
    <div style={summaryItemStyle}>
      <span style={{ color: "var(--app-text-muted)", fontSize: 13, fontWeight: 700 }}>{label}</span>
      <strong style={{ color, fontSize: 24 }}>{value}</strong>
    </div>
  );
}

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const summaryItemStyle = {
  display: "grid",
  gap: 6,
  padding: 16,
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  background: "var(--app-surface)",
};
