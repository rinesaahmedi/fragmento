import Link from "next/link";
import {
  AdminSection,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import {
  AdminCountryName,
  AdminDateTime,
  AdminStatusBadge,
  AdminText,
} from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import {
  ORDER_REPORT_STATUSES,
  buildOrderReportQuery,
  loadOrderReportData,
  normalizeOrderReportFilters,
} from "../../../lib/admin-order-reports";
import { loadPublicVisitReportData } from "../../../lib/public-visit-reports";
import { requireAdminPage } from "../../../lib/auth";
import { getPriceBreakdown } from "../../../lib/price-utils";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getExportHref(filters) {
  const query = buildOrderReportQuery(filters);
  return query
    ? `/api/admin/reports/orders/export?${query}`
    : "/api/admin/reports/orders/export";
}

function KpiCard({ label, value, detail, tone = "default" }) {
  const palette = tone === "success"
    ? { border: "rgba(42, 145, 85, 0.22)", background: "rgba(42, 145, 85, 0.1)", color: "#1f6f43" }
    : tone === "warning"
      ? { border: "rgba(207, 145, 36, 0.24)", background: "rgba(207, 145, 36, 0.1)", color: "#8a5a13" }
      : tone === "danger"
        ? { border: "rgba(217, 92, 92, 0.24)", background: "rgba(217, 92, 92, 0.1)", color: "var(--app-danger-text)" }
        : { border: "var(--app-border)", background: "rgba(255,255,255,0.84)", color: "var(--app-text)" };

  return (
    <div style={{ ...kpiCardStyle, borderColor: palette.border, background: palette.background }}>
      <span style={kpiLabelStyle}>{label}</span>
      <strong style={{ ...kpiValueStyle, color: palette.color }}>{value}</strong>
      {detail ? <span style={kpiDetailStyle}>{detail}</span> : null}
    </div>
  );
}

function OrderCountCard({ total, done, notDone }) {
  return (
    <div className="admin-reports-order-count-card" style={orderCountCardStyle}>
      <div style={orderCountItemStyle}>
        <span style={kpiLabelStyle}><AdminText i18nKey="reportsAdmin.totalOrders" fallback="Total orders" /></span>
        <strong style={kpiValueStyle}>{total}</strong>
      </div>
      <div style={orderCountItemStyle}>
        <span style={kpiLabelStyle}><AdminText i18nKey="reportsAdmin.doneOrders" fallback="Done orders" /></span>
        <strong style={{ ...kpiValueStyle, color: "#1f6f43" }}>{done}</strong>
      </div>
      <div style={orderCountItemStyle}>
        <span style={kpiLabelStyle}><AdminText i18nKey="reportsAdmin.notDone" fallback="Not done" /></span>
        <strong style={{ ...kpiValueStyle, color: "#8a5a13" }}>{notDone}</strong>
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  const value = String(status || "UNPAID").toUpperCase();
  const style = value === "PAID"
    ? paymentPaidStyle
    : value === "PENDING"
      ? paymentPendingStyle
      : value === "FAILED" || value === "CANCELLED"
        ? paymentFailedStyle
        : paymentUnpaidStyle;

  return <span style={style}>{value}</span>;
}

function BreakdownPanel({ title, rows, renderLabel }) {
  return (
    <div style={breakdownPanelStyle}>
      <strong style={breakdownTitleStyle}>{title}</strong>
      {!rows.length ? <span style={mutedLineStyle}>-</span> : null}
      {rows.slice(0, 8).map((row, index) => (
        <div key={`${JSON.stringify(row)}-${index}`} style={breakdownRowStyle}>
          <span>{renderLabel(row)}</span>
          <strong>{row.count}</strong>
        </div>
      ))}
    </div>
  );
}

export default async function AdminReportsPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = normalizeOrderReportFilters(resolvedSearchParams);
  const [{ orders, summary }, visitReport] = await Promise.all([
    loadOrderReportData(filters),
    loadPublicVisitReportData(filters),
  ]);
  const {
    summary: visitSummary,
    countries: visitCountries,
    sources: visitSources,
    devices: visitDevices,
  } = visitReport;
  const exportHref = getExportHref(filters);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="reportsAdmin.reports" fallback="Reports" />}
          description={<AdminText i18nKey="reportsAdmin.description" fallback="Order reports with confirmed totals, VAT, open order counts, and Excel export." />}
          actions={(
            <Link href={exportHref} prefetch={false} style={exportButtonStyle}>
              <AdminText i18nKey="reportsAdmin.exportExcel" fallback="Export Excel" />
            </Link>
          )}
        >
          <form action="/admin/reports" method="get" style={filterPanelStyle}>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span>
              <input name="dateFrom" type="date" defaultValue={filters.dateFrom} style={filterInputStyle} />
            </label>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span>
              <input name="dateTo" type="date" defaultValue={filters.dateTo} style={filterInputStyle} />
            </label>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="dashboard.status" fallback="Status" /></span>
              <AdminSelect name="status" defaultValue={filters.status} style={filterInputStyle}>
                <option value=""><AdminText i18nKey="dashboard.allStatuses" fallback="All statuses" /></option>
                {ORDER_REPORT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </AdminSelect>
            </label>
            <div style={filterActionsStyle}>
              <button type="submit" style={filterApplyButtonStyle}>
                <AdminText i18nKey="dashboard.apply" fallback="Apply" />
              </button>
              <Link href="/admin/reports" scroll={false} style={filterClearLinkStyle}>
                <AdminText i18nKey="dashboard.clearFilters" fallback="Clear filters" />
              </Link>
            </div>
          </form>

          <div className="admin-reports-kpi-grid" style={kpiGridStyle}>
            <OrderCountCard
              total={summary.totalOrders}
              done={summary.doneOrders}
              notDone={summary.notDoneUnpaidOrders}
            />
            <KpiCard
              label={<AdminText i18nKey="reportsAdmin.netWithoutVat" fallback="Net without VAT" />}
              value={formatCurrency(summary.confirmedNet)}
            />
            <KpiCard
              label={<AdminText i18nKey="reportsAdmin.vatTotal" fallback="VAT total (19%)" />}
              value={formatCurrency(summary.confirmedVat)}
            />
            <KpiCard
              tone="success"
              label={<AdminText i18nKey="reportsAdmin.totalWithVat" fallback="Total with VAT" />}
              value={formatCurrency(summary.confirmedGross)}
            />
          </div>

          <div style={visitReportBlockStyle}>
            <h3 style={subsectionTitleStyle}>
              <AdminText i18nKey="reportsAdmin.siteVisits" fallback="Site visits" />
            </h3>
            <div className="admin-reports-visit-grid" style={visitGridStyle}>
              <KpiCard
                label={<AdminText i18nKey="reportsAdmin.uniqueVisitors" fallback="Estimated daily visitors" />}
                value={visitSummary.uniqueVisitors}
              />
              <KpiCard
                label={<AdminText i18nKey="reportsAdmin.openedSite" fallback="Opened site" />}
                value={visitSummary.opened}
              />
              <KpiCard
                label={<AdminText i18nKey="reportsAdmin.enteredContract" fallback="Entered contract" />}
                value={visitSummary.submitted}
              />
              <KpiCard
                tone="success"
                label={<AdminText i18nKey="reportsAdmin.contractWorked" fallback="Worked" />}
                value={visitSummary.accepted}
              />
              <KpiCard
                label={<AdminText i18nKey="reportsAdmin.contractTest" fallback="Test" />}
                value={visitSummary.testAccepted}
              />
              <KpiCard
                tone="warning"
                label={<AdminText i18nKey="reportsAdmin.contractDidNotWork" fallback="Did not work" />}
                value={visitSummary.rejected}
              />
              <KpiCard
                label={<AdminText i18nKey="reportsAdmin.contractSuccessRate" fallback="Success rate" />}
                value={formatPercent(visitSummary.successRate)}
              />
            </div>
            <div className="admin-reports-breakdown-grid" style={breakdownGridStyle}>
              <BreakdownPanel
                title={<AdminText i18nKey="reportsAdmin.visitsByCountry" fallback="Visits by country" />}
                rows={visitCountries}
                renderLabel={(row) => <AdminCountryName code={row.countryCode} />}
              />
              <BreakdownPanel
                title={<AdminText i18nKey="reportsAdmin.visitsBySource" fallback="Visits by source" />}
                rows={visitSources}
                renderLabel={(row) => row.source === "direct"
                  ? <AdminText i18nKey="reportsAdmin.directVisit" fallback="Direct visit" />
                  : row.source}
              />
              <BreakdownPanel
                title={<AdminText i18nKey="reportsAdmin.visitsByDevice" fallback="Visits by device" />}
                rows={visitDevices}
                renderLabel={(row) => row.deviceType === "unknown"
                  ? <AdminText i18nKey="reportsAdmin.notCaptured" fallback="Not captured" />
                  : row.deviceType}
              />
            </div>
            <p style={privacyNoteStyle}>
              <AdminText
                i18nKey="reportsAdmin.privacyNote"
                fallback="Privacy-first analytics: country only; raw IP addresses, exact locations and full user-agent strings are not stored. Detailed events are retained for 90 days by default."
              />
            </p>
          </div>

          <style>{`
            @media (max-width: 1180px) {
              .admin-reports-kpi-grid {
                grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)) !important;
              }

              .admin-reports-order-count-card {
                grid-column: 1 / -1;
              }
            }

            @media (max-width: 640px) {
              .admin-reports-order-count-card {
                grid-template-columns: 1fr !important;
              }
            }

            @media (max-width: 900px) {
              .admin-reports-visit-grid {
                grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)) !important;
              }

              .admin-reports-breakdown-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="reportsAdmin.orderRows" fallback="Order rows" />}
        >
          <div className="admin-reports-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.order" fallback="Order" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.customer" fallback="Customer" /></th>
                  <th style={thStyle}><AdminText i18nKey="reportsAdmin.orderDate" fallback="Order date" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.status" fallback="Status" /></th>
                  <th style={thStyle}>Payment</th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.items" fallback="Items" /></th>
                  <th style={thStyle}><AdminText i18nKey="reportsAdmin.netWithoutVat" fallback="Net without VAT" /></th>
                  <th style={thStyle}><AdminText i18nKey="reportsAdmin.totalWithVat" fallback="Total with VAT" /></th>
                </tr>
              </thead>
              <tbody>
                {!orders.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={8}><AdminText i18nKey="ordersAdmin.noOrdersFound" fallback="No orders found." /></td>
                  </tr>
                ) : null}
                {orders.map((order) => {
                  const breakdown = getPriceBreakdown(order.totalPrice);
                  return (
                    <tr key={order.id}>
                      <td style={tdStyle}>
                        <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>{order.orderNumber}</Link>
                      </td>
                      <td style={tdStyle}>
                        <strong>{order.firstName} {order.lastName}</strong>
                        <span style={mutedLineStyle}>{order.email}</span>
                      </td>
                      <td style={tdStyle}><AdminDateTime value={order.createdAt} /></td>
                      <td style={tdStyle}><AdminStatusBadge status={order.status} /></td>
                      <td style={tdStyle}><PaymentStatusBadge status={order.paymentStatus} /></td>
                      <td style={tdStyle}>{order.items.reduce((count, item) => count + Number(item.quantity || 0), 0)}</td>
                      <td style={tdStyle}>{formatCurrency(breakdown.net)}</td>
                      <td style={tdStyle}><strong>{formatCurrency(breakdown.total)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
};

const filterFieldStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  ...inputStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "0.92rem",
  boxShadow: "none",
};

const filterActionsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "end",
  flexWrap: "nowrap",
};

const filterApplyButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "0.92rem",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 20px rgba(143, 62, 44, 0.16)",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 12px",
  background: "rgba(255,255,255,0.88)",
  color: "var(--app-accent)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  fontWeight: 800,
  fontSize: "0.92rem",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};

const exportButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "10px 14px",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const kpiGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(360px, 1.35fr) repeat(3, minmax(190px, 1fr))",
  gap: 12,
};

const visitReportBlockStyle = {
  display: "grid",
  gap: 12,
  marginTop: 4,
};

const subsectionTitleStyle = {
  margin: "0",
  fontSize: 18,
  fontWeight: 900,
  color: "var(--app-text)",
};

const visitGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(130px, 1fr))",
  gap: 12,
};

const breakdownGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
  gap: 12,
};

const breakdownPanelStyle = {
  display: "grid",
  alignContent: "start",
  gap: 9,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.84)",
  padding: "14px 16px",
};

const breakdownTitleStyle = {
  fontSize: 13,
  fontWeight: 900,
  color: "var(--app-text)",
  marginBottom: 2,
};

const breakdownRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "var(--app-text-muted)",
  fontSize: 13,
};

const privacyNoteStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.6,
};

const orderCountCardStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.84)",
  padding: "16px 17px",
  boxShadow: "var(--app-shadow-soft)",
};

const orderCountItemStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const kpiCardStyle = {
  display: "grid",
  gap: 8,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  padding: "16px 17px",
  boxShadow: "var(--app-shadow-soft)",
};

const kpiLabelStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const kpiValueStyle = {
  fontSize: "clamp(1.45rem, 2.4vw, 2.1rem)",
  lineHeight: 1,
  letterSpacing: 0,
};

const kpiDetailStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const orderLinkStyle = {
  color: "var(--app-text)",
  textDecoration: "none",
  fontWeight: 900,
};

const mutedLineStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: 13,
  marginTop: 5,
};

const paymentBaseStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "7px 10px",
  border: "1px solid transparent",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: 0,
  whiteSpace: "nowrap",
};

const paymentPaidStyle = {
  ...paymentBaseStyle,
  color: "#1f6f43",
  background: "rgba(42, 145, 85, 0.12)",
  borderColor: "rgba(42, 145, 85, 0.22)",
};

const paymentPendingStyle = {
  ...paymentBaseStyle,
  color: "#8a5a13",
  background: "rgba(207, 145, 36, 0.12)",
  borderColor: "rgba(207, 145, 36, 0.22)",
};

const paymentFailedStyle = {
  ...paymentBaseStyle,
  color: "var(--app-danger-text)",
  background: "rgba(217, 92, 92, 0.12)",
  borderColor: "rgba(217, 92, 92, 0.22)",
};

const paymentUnpaidStyle = {
  ...paymentBaseStyle,
  color: "var(--app-text-muted)",
  background: "rgba(115, 80, 55, 0.07)",
  borderColor: "rgba(115, 80, 55, 0.12)",
};
