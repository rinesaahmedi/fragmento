"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminI18n } from "./admin-i18n";
import { AdminEntitySearch } from "./admin-entity-search";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS = {
  NEW: "#E6A23C",
  EMAILED: "#4A7DDA",
  CONFIRMED: "#3FA66B",
  CANCELLED: "#D95C5C",
};

const SERIES_COLORS = ["#6C8AE4", "#58BFA6", "#F08A5D", "#9B6EF3", "#E07A5F", "#5B8DEF", "#5FBF8F", "#F2A65A"];
const DISTRIBUTION_COLORS = ["#6C8AE4", "#58BFA6", "#F08A5D", "#9B6EF3", "#E07A5F", "#5B8DEF", "#5FBF8F", "#F2A65A"];
const ORDER_STATUSES = ["NEW", "EMAILED", "CONFIRMED", "CANCELLED"];
const MAX_TOP_ITEMS = 12;
const CHART_GRID = "#E5E1DC";
const CHART_TEXT = "#2B2B2B";
const CHART_MUTED = "#6F6F6F";
const CATEGORY_COLORS = {
  COMPONENT: "#5B8DEF",
  ACCESSORY: "#5FBF8F",
  SERVICE: "#F2A65A",
};

export const EXAMPLE_DASHBOARD_MOCK_DATA = {
  kpis: [
    { label: "Total Orders", value: "128", trend: "+12% vs previous period" },
    { label: "Total Revenue", value: "84.230,00 €", trend: "+9% vs previous period" },
    { label: "Average Order Value", value: "658,05 €", trend: "+3% vs previous period" },
    { label: "Conversion Rate", value: "74%", trend: "emailed / total" },
  ],
  dailyStatus: [
    { date: "Apr 01", NEW: 4, EMAILED: 8, CONFIRMED: 2, CANCELLED: 1 },
    { date: "Apr 02", NEW: 2, EMAILED: 5, CONFIRMED: 6, CANCELLED: 0 },
  ],
  kitchenTimeline: [
    { date: "Apr 01", "Kitchen A": 5, "Kitchen B": 3 },
    { date: "Apr 02", "Kitchen A": 2, "Kitchen B": 7 },
  ],
  geography: [
    { country: "Germany", orders: 86, revenue: 54200, orderShare: 67 },
    { country: "Austria", orders: 22, revenue: 14800, orderShare: 17 },
    { country: "Hungary", orders: 20, revenue: 15230, orderShare: 16 },
  ],
};

export function AdminDashboardCharts({
  kpis,
  periodOptions,
  selectedPeriod,
  kitchens,
  selectedKitchenId,
  statusOptions,
  selectedStatus,
  dailyStatusData,
  claimElementData,
  claimCountryData,
  kitchenTimelineData,
  kitchenSeries,
  topItemsByQuantity,
  topItemsByRevenue,
  itemTypeData,
  paymentData,
  geographyData,
  companyAnalytics,
  projectAnalytics,
}) {
  const { translate } = useAdminI18n();
  const [statusMode, setStatusMode] = useState("volume");
  const [isolatedSeries, setIsolatedSeries] = useState("");
  const translateText = (key, fallback, values) => interpolateText(translate(key, fallback), values);

  const statusChartData = useMemo(() => {
    if (statusMode === "volume") return dailyStatusData;

    return dailyStatusData.map((row) => {
      const total = ORDER_STATUSES.reduce((sum, status) => sum + Number(row[status] || 0), 0);
      return {
        ...row,
        ...ORDER_STATUSES.reduce((acc, status) => {
          acc[status] = total ? Math.round((Number(row[status] || 0) / total) * 100) : 0;
          return acc;
        }, {}),
      };
    });
  }, [dailyStatusData, statusMode]);

  const visibleKitchenSeries = isolatedSeries ? kitchenSeries.filter((name) => name === isolatedSeries) : kitchenSeries;

  return (
    <div className="analytics-dashboard">
      <section className="dashboard-toolbar">
        <div>
          <p className="eyebrow">{translate("dashboard.analyticsOverview", "Analytics overview")}</p>
          <h1>{translate("dashboard.orderDashboard", "Order dashboard")}</h1>
          <p>{translate("dashboard.monitorSalesWorkflowMovementKitchenDemandAndItemPerformance", "Monitor sales, workflow movement, kitchen demand, and item performance.")}</p>
        </div>
        <form method="get" className="filter-form">
          <label>
            {translate("dashboard.dateRange", "Date range")}
            <select name="period" defaultValue={selectedPeriod}>
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {translate(option.labelKey || "", option.fallbackLabel || option.value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {translate("dashboard.kitchen", "Kitchen")}
            <select name="kitchenId" defaultValue={selectedKitchenId}>
              <option value="">{translate("dashboard.allKitchens", "All kitchens")}</option>
              {kitchens.map((kitchen) => (
                <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
              ))}
            </select>
          </label>
          <label>
            {translate("dashboard.status", "Status")}
            <select name="status" defaultValue={selectedStatus}>
              <option value="">{translate("dashboard.allStatuses", "All statuses")}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{translateStatus(status, translate)}</option>
              ))}
            </select>
          </label>
          <button type="submit">{translate("dashboard.apply", "Apply")}</button>
          <a href="/admin" className="toolbar-link">{translate("dashboard.clearFilters", "Clear filters")}</a>
        </form>
      </section>

      <section className="kpi-grid" aria-label="Dashboard KPIs">
        {kpis.map((kpi) => (
          <article key={kpi.labelKey || kpi.fallbackLabel || kpi.value} className="kpi-card">
            <span>{translate(kpi.labelKey || "", kpi.fallbackLabel || "")}</span>
            <strong>{kpi.value}</strong>
            <small>{translateText(kpi.trendKey || "", kpi.trendFallback || "", kpi.trendValues)}</small>
          </article>
        ))}
      </section>

      <AdminEntitySearch period={selectedPeriod} kitchenId={selectedKitchenId} status={selectedStatus} />

      <section className="chart-card chart-card--compact chart-card--claims">
        <ChartHeader
          eyebrow={translate("dashboard.claimElementOverview", "Claim element overview")}
          title={translate("dashboard.claimsBySelectedElementAndCountry", "Claims by selected element and country")}
          detail={translate("dashboard.claimsBySelectedElementAndCountryDetail", "Ranked by selected kitchen elements and the country submitted in the service claim form.")}
        />
        <div className="claim-overview-grid">
          <ClaimBreakdownChart
            title={translate("dashboard.selectedElements", "Selected elements")}
            data={claimElementData}
            emptyLabel={translate("dashboard.noClaimElementDataForSelectedFilters", "No selected claim element data for the current filters.")}
            yAxisWidth={126}
          />
          <ClaimBreakdownChart
            title={translate("dashboard.submittedCountries", "Submitted countries")}
            data={claimCountryData}
            emptyLabel={translate("dashboard.noClaimCountryDataForSelectedFilters", "No submitted country data for the current filters.")}
            yAxisWidth={104}
          />
        </div>
      </section>

      <section className="chart-card chart-card--status">
        <ChartHeader
          eyebrow={translate("dashboard.dailyStatusBreakdown", "Daily status breakdown")}
          title={translate("dashboard.ordersByStatus", "Orders by status")}
          detail={translate("dashboard.stackedByWorkflowStateUsingOrderCreationDate", "Stacked by workflow state using order creation date.")}
          actions={(
            <div className="segmented-control" aria-label="Status chart mode">
              <button className={statusMode === "volume" ? "is-active" : ""} type="button" onClick={() => setStatusMode("volume")}>{translate("dashboard.volumeView", "Volume View")}</button>
              <button className={statusMode === "percentage" ? "is-active" : ""} type="button" onClick={() => setStatusMode("percentage")}>{translate("dashboard.percentageView", "Percentage View")}</button>
            </div>
          )}
        />
        <div className="chart-frame">
          {statusChartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusChartData} margin={{ top: 12, right: 20, left: -10, bottom: 4 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} domain={statusMode === "percentage" ? [0, 100] : undefined} tickFormatter={(value) => statusMode === "percentage" ? `${value}%` : value} />
                <Tooltip content={<StatusTooltip mode={statusMode} />} />
                <Legend formatter={(value) => translateStatus(value, translate)} wrapperStyle={{ color: CHART_TEXT }} />
                {ORDER_STATUSES.map((status) => (
                  <Bar key={status} dataKey={status} stackId="orders" fill={STATUS_COLORS[status]} radius={status === "CANCELLED" ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={translate("dashboard.noStatusDataForSelectedFilters", "No status data for the selected filters.")} />
          )}
        </div>
      </section>

      <section className="chart-card chart-card--compact">
        <ChartHeader
          eyebrow={translate("dashboard.kitchenTimeline", "Kitchen timeline")}
          title={translate("dashboard.orderActivityByKitchen", "Order activity by kitchen")}
          detail={translate("dashboard.clickLegendItemToIsolateIt", "Click a legend item to isolate it.")}
        />
        <div className="chart-frame">
          {kitchenTimelineData.length && kitchenSeries.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={kitchenTimelineData} margin={{ top: 10, right: 18, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                <Tooltip />
                <Legend wrapperStyle={{ color: CHART_TEXT }} onClick={(event) => setIsolatedSeries((current) => current === event.dataKey ? "" : event.dataKey)} />
                {visibleKitchenSeries.map((name, index) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={translate("dashboard.noKitchenTimelineDataForSelectedFilters", "No kitchen timeline data for the selected filters.")} />
          )}
        </div>
      </section>

      <section className="dashboard-grid">
        <GeographySection data={geographyData} />

        <DistributionSection
          itemTypeData={itemTypeData}
          paymentData={paymentData}
        />
      </section>

      <TopItemsSection
        topItemsByQuantity={topItemsByQuantity}
        topItemsByRevenue={topItemsByRevenue}
      />

      <CompanyProjectAnalyticsSection companyAnalytics={companyAnalytics} projectAnalytics={projectAnalytics} />

      <style jsx>{`
        .dashboard-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .filter-form {
          display: grid;
          grid-template-columns: repeat(5, minmax(130px, auto));
          gap: 10px;
          align-items: end;
        }

        .chart-card--status {
          min-height: 360px;
        }

        .chart-card--compact {
          min-height: 360px;
        }

        .chart-card--claims {
          gap: 8px;
          min-height: 0;
          padding: 14px 16px 10px;
        }

        .chart-frame {
          min-height: 280px;
          min-width: 0;
        }

        .claim-overview-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
          gap: 14px;
          align-items: start;
        }

        @media (max-width: 1100px) {
          .filter-form {
            grid-template-columns: repeat(2, minmax(150px, 1fr));
          }

          .claim-overview-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .filter-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function ChartHeader({ eyebrow, title, actions }) {
  return (
    <div className="chart-header">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {actions}
      <style jsx>{`
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }

        span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h2 {
          margin: 6px 0 0;
          color: var(--color-text);
          font-size: 1.2rem;
        }

      `}</style>
    </div>
  );
}

function StatusTooltip({ active, payload, label, mode }) {
  const { translate } = useAdminI18n();
  if (!active || !payload?.length) return null;

  return (
    <div className="tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {translateStatus(item.dataKey, translate)}: {item.value}{mode === "percentage" ? "%" : ""}
        </span>
      ))}
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function ClaimElementTooltip({ active, payload, label }) {
  const { translate } = useAdminI18n();
  if (!active || !payload?.length) return null;

  const labels = {
    claims: translate("dashboard.claims", "Claims"),
    claimsWithAttachments: translate("dashboard.claimsWithFiles", "Claims with files"),
  };

  return (
    <div className="tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {labels[item.dataKey] || item.name}: {item.value}
        </span>
      ))}
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function ClaimBreakdownChart({ title, data, emptyLabel, yAxisWidth }) {
  const { translate } = useAdminI18n();
  const visibleData = Array.isArray(data) ? data.slice(0, 10) : [];
  const height = Math.max(170, visibleData.length * 40 + 42);

  return (
    <div className="claim-breakdown">
      <h3>{title}</h3>
      <div className="chart-frame">
        {visibleData.length ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={visibleData} layout="vertical" margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
              <YAxis type="category" dataKey="name" width={yAxisWidth} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} tickFormatter={(value) => truncateLabel(value, 22)} />
              <Tooltip content={<ClaimElementTooltip />} />
              <Bar dataKey="claims" name={translate("dashboard.claims", "Claims")} fill="#8C6D4F" radius={[0, 6, 6, 0]} barSize={48} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label={emptyLabel} />
        )}
      </div>
      <style jsx>{`
        .claim-breakdown {
          min-width: 0;
        }

        .chart-frame {
          min-height: 0;
          min-width: 0;
        }

        h3 {
          margin: 0 0 6px;
          color: var(--color-text);
          font-size: 15px;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}

function CompanyProjectAnalyticsSection({ companyAnalytics, projectAnalytics }) {
  const { translate } = useAdminI18n();
  const [mode, setMode] = useState("company");
  const modeSwitcher = (
    <div className="analytics-mode-switch" aria-label={translate("dashboard.analyticsFocus", "Analytics focus")}>
      <button className={mode === "company" ? "is-active" : ""} type="button" onClick={() => setMode("company")}>
        {translate("dashboard.companyView", "Company")}
      </button>
      <button className={mode === "project" ? "is-active" : ""} type="button" onClick={() => setMode("project")}>
        {translate("dashboard.projectView", "Project")}
      </button>
      <style jsx>{`
        .analytics-mode-switch {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .analytics-mode-switch button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 12px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .analytics-mode-switch button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }
      `}</style>
    </div>
  );

  return mode === "company"
    ? <PropertyOwnerAnalyticsSection analytics={companyAnalytics} modeSwitcher={modeSwitcher} />
    : <ProjectAnalyticsSection analytics={projectAnalytics} modeSwitcher={modeSwitcher} />;
}

function PropertyOwnerAnalyticsSection({ analytics, modeSwitcher = null }) {
  const { translate } = useAdminI18n();
  const companies = analytics?.companies || [];
  const translateText = (key, fallback, values) => interpolateText(translate(key, fallback), values);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [itemMode, setItemMode] = useState("quantity");
  const selectedCompany = useMemo(
    () => companies.find((owner) => owner.id === selectedOwnerId) || companies[0] || null,
    [companies, selectedOwnerId],
  );
  const selectedTimeline = selectedCompany ? (analytics?.timelineByCompany?.[selectedCompany.id] || []) : [];
  const selectedTopItems = useMemo(
    () => selectedCompany ? (analytics?.topItemsByCompany?.[selectedCompany.id] || []) : [],
    [analytics, selectedCompany],
  );

  useEffect(() => {
    if (!companies.length) {
      setSelectedOwnerId("");
      return;
    }

    setSelectedOwnerId((current) => (
      current && companies.some((owner) => owner.id === current)
        ? current
        : analytics?.defaultCompanyId || companies[0].id
    ));
  }, [analytics, companies]);

  const itemConfig = itemMode === "quantity"
    ? {
        formatter: (value) => interpolateText(translate("dashboard.itemCountValue", "{count} item(s)"), { count: String(value) }),
        data: selectedTopItems
          .map((item) => ({
            ...item,
            chartValue: Number(item.quantity || 0),
            axisLabel: item.name || "",
            displayIdentifier: item.articleNumber || item.code || "",
          }))
          .sort((a, b) => b.chartValue - a.chartValue),
      }
    : {
        formatter: formatCurrency,
        data: selectedTopItems
          .map((item) => ({
            ...item,
            chartValue: Number(item.revenue || 0),
            axisLabel: item.name || "",
            displayIdentifier: item.articleNumber || item.code || "",
          }))
          .sort((a, b) => b.chartValue - a.chartValue),
      };
  const topItemChartData = itemConfig.data.slice(0, MAX_TOP_ITEMS);
  const hasCompanyData = Boolean(selectedCompany);
  const topItemsChartHeight = Math.max(250, topItemChartData.length * 34 + 42);
  const topItemsMaxValue = topItemChartData.reduce((max, item) => Math.max(max, item.chartValue), 0);
  const topItemsXAxisMax = itemMode === "quantity"
    ? Math.max(1, Math.ceil(topItemsMaxValue * 1.12))
    : Math.max(1, topItemsMaxValue * 1.12);

  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.ownerPerformance", "Owner performance")}
        title={translate("dashboard.propertyOwnerKitchenActivity", "Property owner kitchen activity")}
        actions={(
          <div className="owner-actions">
            {modeSwitcher}
            <label className="owner-select-wrap">
              <span>{translate("dashboard.selectCompany", "Housing company")}</span>
              <select
                value={selectedCompany?.id || ""}
                onChange={(event) => setSelectedOwnerId(event.target.value)}
                disabled={!companies.length}
                aria-label={translate("dashboard.selectCompany", "Housing company")}
              >
                {companies.length ? companies.map((owner) => (
                  <option key={owner.id} value={owner.id}>{owner.name}</option>
                )) : (
                  <option value="">{translate("dashboard.noCompaniesAvailable", "No companies available")}</option>
                )}
              </select>
            </label>
            <a className="panel-link" href={selectedCompany ? `/admin/property-owners/${selectedCompany.id}` : "/admin/property-owners"}>
              {selectedCompany
                ? translate("dashboard.openCompanyWorkspace", "Open company workspace")
                : translate("dashboard.manageOwners", "Manage owners")}
            </a>
          </div>
        )}
      />
      <div className="owner-stats-grid">
        {hasCompanyData ? (
          <>
            <article className="owner-analytics-panel">
              <div className="owner-stat-header">
                <div>
                  <strong>{selectedCompany.name}</strong>
                </div>
              </div>
              <div className="owner-kpi-grid">
                <article>
                  <span>{translate("dashboard.totalRevenue", "Total revenue")}</span>
                  <strong>{formatCurrency(selectedCompany.totalRevenue)}</strong>
                </article>
                <article>
                  <span>{translate("ordersAdmin.orders", "Orders")}</span>
                  <strong>{selectedCompany.orderCount}</strong>
                </article>
                <article>
                  <span>{translate("propertyOwnersAdmin.contracts", "Contracts")}</span>
                  <strong>{selectedCompany.contractCount}</strong>
                </article>
                <article>
                  <span>{translate("adminShellLogin.kitchens", "Kitchens")}</span>
                  <strong>{selectedCompany.kitchenCount}</strong>
                </article>
                <article>
                  <span>{translate("dashboard.averageOrderShort", "Avg. order")}</span>
                  <strong>{formatCurrency(selectedCompany.averageOrderValue)}</strong>
                </article>
              </div>
              <div className="owner-chart-card owner-chart-card--timeline">
                <div className="owner-chart-heading">
                  <div>
                    <strong>{translate("dashboard.companyTimeline", "Company timeline")}</strong>
                  </div>
                </div>
                <div className="owner-chart-frame">
                  {selectedTimeline.some((row) => row.orders || row.revenue) ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={selectedTimeline} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid stroke={CHART_GRID} vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                        <YAxis yAxisId="orders" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                        <YAxis yAxisId="revenue" orientation="right" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} tickFormatter={compactCurrency} />
                        <Tooltip content={<CompanyTimelineTooltip />} />
                        <Legend wrapperStyle={{ color: CHART_TEXT }} />
                        <Line yAxisId="orders" type="monotone" dataKey="orders" name={translate("ordersAdmin.orders", "Orders")} stroke="#5B8DEF" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                        <Line yAxisId="revenue" type="monotone" dataKey="revenue" name={translate("dashboard.revenueLabel", "Revenue")} stroke="#3FA66B" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label={translate("dashboard.noCompanyTimelineData", "No timeline data for the selected housing company.")} />
                  )}
                </div>
              </div>

              <div className="owner-chart-card">
                <div className="owner-chart-heading">
                  <div>
                    <strong>{translate("dashboard.companyTopItems", "Top items for selected housing company")}</strong>
                  </div>
                  <div className="segmented-control" aria-label="Selected company top items mode">
                    <button className={itemMode === "quantity" ? "is-active" : ""} type="button" onClick={() => setItemMode("quantity")}>{translate("dashboard.byQuantity", "By Quantity")}</button>
                    <button className={itemMode === "revenue" ? "is-active" : ""} type="button" onClick={() => setItemMode("revenue")}>{translate("dashboard.byRevenue", "By Revenue")}</button>
                  </div>
                </div>
                <div className="owner-chart-frame">
                  {topItemChartData.length ? (
                    <div className="top-items-scroll">
                      <ResponsiveContainer width="100%" height={topItemsChartHeight}>
                        <BarChart data={topItemChartData} layout="vertical" margin={{ top: 8, right: 76, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                          <XAxis
                            type="number"
                            domain={[0, topItemsXAxisMax]}
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            tickFormatter={itemMode === "revenue" ? compactCurrency : undefined}
                          />
                          <YAxis
                            type="category"
                            dataKey="axisLabel"
                            width={320}
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            tick={<TopItemsAxisTick />}
                          />
                          <Tooltip content={<TopItemsTooltip />} />
                          <Bar
                            dataKey="chartValue"
                            radius={[0, 8, 8, 0]}
                            label={{
                              position: "right",
                              fill: CHART_TEXT,
                              fontSize: 12,
                              fontWeight: 800,
                              formatter: itemConfig.formatter,
                            }}
                          >
                            {topItemChartData.map((item, index) => (
                              <Cell key={`${itemMode}-${item.code || item.name}-${item.name}`} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart label={translate("dashboard.noCompanyItemData", "No item data for the selected housing company.")} />
                  )}
                </div>
              </div>
            </article>

            <aside className="owner-summary-list" aria-label={translate("dashboard.companyList", "Housing companies")}>
              {companies.map((owner) => {
                const isSelected = owner.id === selectedCompany.id;
                return (
                  <button
                    key={owner.id}
                    type="button"
                    className={`owner-summary-row${isSelected ? " is-selected" : ""}`}
                    onClick={() => setSelectedOwnerId(owner.id)}
                  >
                    <div>
                      <strong>{owner.name}</strong>
                      <span>{translateText("dashboard.companyMetricsSummary", "{objects} objects, {contracts} contracts, {orders} orders", {
                        objects: String(owner.objectCount),
                        contracts: String(owner.contractCount),
                        orders: String(owner.orderCount),
                      })}</span>
                    </div>
                    <b>{formatCurrency(owner.totalRevenue)}</b>
                  </button>
                );
              })}
            </aside>
          </>
        ) : (
          <div className="empty-owner-stats">{translate("dashboard.noOwnerDataForSelectedFilters", "No owner contract or order data matches the current filters.")}</div>
        )}
      </div>
      <style jsx>{`
        .chart-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .owner-stats-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.9fr);
          gap: 12px;
        }

        .owner-analytics-panel {
          display: grid;
          gap: 14px;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 14px;
          background: #fbfaf7;
        }

        .owner-actions {
          display: flex;
          gap: 10px;
          align-items: end;
          flex-wrap: wrap;
        }

        .owner-select-wrap {
          display: grid;
          gap: 6px;
          min-width: 220px;
        }

        .owner-select-wrap span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .owner-select-wrap select {
          min-height: 42px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
          padding: 9px 12px;
          font: inherit;
        }

        .owner-stat-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .owner-stat-header div,
        .owner-chart-heading div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .owner-stat-header strong {
          color: var(--color-text);
          font-size: 1rem;
        }

        .owner-stat-header span,
        .owner-kpi-grid span,
        .owner-chart-heading span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .owner-stat-header b {
          color: var(--color-confirmed);
          white-space: nowrap;
        }

        .owner-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        .owner-kpi-grid article {
          display: grid;
          gap: 4px;
          border-radius: 8px;
          background: var(--color-card);
          padding: 10px;
          border: 1px solid var(--color-border);
        }

        .owner-kpi-grid strong,
        .owner-chart-heading strong,
        .owner-status-list strong {
          color: var(--color-text);
          line-height: 1.35;
        }

        .owner-chart-card {
          display: grid;
          gap: 12px;
          border-radius: 8px;
          background: var(--color-card);
          padding: 12px;
          border: 1px solid var(--color-border);
        }

        .owner-chart-card--timeline {
          background: var(--color-card);
        }

        .owner-chart-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .owner-chart-frame {
          min-height: 220px;
          min-width: 0;
        }

        .top-items-scroll {
          max-height: 280px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .segmented-control button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }

        .owner-summary-list {
          display: grid;
          gap: 8px;
          align-content: start;
          max-height: 100%;
          overflow: auto;
        }

        .owner-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          text-align: left;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 12px;
          background: var(--color-card);
          cursor: pointer;
        }

        .owner-summary-row div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .owner-summary-row strong,
        .owner-summary-row b {
          color: var(--color-text);
        }

        .owner-summary-row span {
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .owner-summary-row.is-selected {
          border-color: rgba(107, 79, 58, 0.18);
          background: var(--color-primary-soft);
          box-shadow: inset 0 0 0 1px rgba(107, 79, 58, 0.1);
        }

        .empty-owner-stats {
          min-height: 120px;
          display: grid;
          place-items: center;
          border: 1px dashed var(--color-border);
          border-radius: 12px;
          color: var(--color-text-muted);
          background: #fbfaf7;
          text-align: center;
          padding: 20px;
        }

        .panel-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          border-radius: 8px;
          border: 1px solid var(--color-primary);
          background: var(--color-primary);
          color: #ffffff;
          padding: 9px 12px;
          font-weight: 800;
          text-decoration: none;
        }

        @media (max-width: 760px) {
          .owner-stats-grid {
            grid-template-columns: 1fr;
          }

          .owner-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}

function ProjectAnalyticsSection({ analytics, modeSwitcher = null }) {
  const { translate } = useAdminI18n();
  const projects = analytics?.projects || [];
  const translateText = (key, fallback, values) => interpolateText(translate(key, fallback), values);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [itemMode, setItemMode] = useState("quantity");
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId],
  );
  const selectedTimeline = selectedProject ? (analytics?.timelineByProject?.[selectedProject.id] || []) : [];
  const selectedContracts = selectedProject ? (analytics?.contractsByProject?.[selectedProject.id] || []) : [];
  const selectedLocations = selectedProject ? (analytics?.locationsByProject?.[selectedProject.id] || []) : [];
  const selectedKitchens = selectedProject ? (analytics?.kitchenBreakdownByProject?.[selectedProject.id] || []) : [];
  const selectedStatuses = selectedProject ? (analytics?.statusBreakdownByProject?.[selectedProject.id] || []) : [];
  const selectedTopItems = useMemo(
    () => selectedProject ? (analytics?.topItemsByProject?.[selectedProject.id] || []) : [],
    [analytics, selectedProject],
  );

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId("");
      return;
    }

    setSelectedProjectId((current) => (
      current && projects.some((project) => project.id === current)
        ? current
        : analytics?.defaultProjectId || projects[0].id
    ));
  }, [analytics, projects]);

  const itemConfig = itemMode === "quantity"
    ? {
        formatter: (value) => interpolateText(translate("dashboard.itemCountValue", "{count} item(s)"), { count: String(value) }),
        data: selectedTopItems
          .map((item) => ({
            ...item,
            chartValue: Number(item.quantity || 0),
            axisLabel: item.name || "",
            displayIdentifier: item.articleNumber || item.code || "",
          }))
          .sort((a, b) => b.chartValue - a.chartValue),
      }
    : {
        formatter: formatCurrency,
        data: selectedTopItems
          .map((item) => ({
            ...item,
            chartValue: Number(item.revenue || 0),
            axisLabel: item.name || "",
            displayIdentifier: item.articleNumber || item.code || "",
          }))
          .sort((a, b) => b.chartValue - a.chartValue),
      };
  const topItemChartData = itemConfig.data.slice(0, MAX_TOP_ITEMS);
  const topItemsChartHeight = Math.max(240, topItemChartData.length * 34 + 42);
  const topItemsMaxValue = topItemChartData.reduce((max, item) => Math.max(max, item.chartValue), 0);
  const topItemsXAxisMax = itemMode === "quantity"
    ? Math.max(1, Math.ceil(topItemsMaxValue * 1.12))
    : Math.max(1, topItemsMaxValue * 1.12);

  return (
    <section className="project-card">
      <ChartHeader
        eyebrow={translate("dashboard.projectPerformance", "Project performance")}
        title={translate("dashboard.projectStatistics", "Project statistics")}
        detail={translate("dashboard.projectStatisticsDetail", "Review contract numbers, locations, order flow, and item demand for one project.")}
        actions={(
          <div className="project-actions">
            {modeSwitcher}
            <label className="project-select-wrap">
              <span>{translate("dashboard.selectProject", "Project")}</span>
              <select
                value={selectedProject?.id || ""}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={!projects.length}
                aria-label={translate("dashboard.selectProject", "Project")}
              >
                {projects.length ? projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectCode ? `${project.projectCode} - ` : ""}{project.name}
                  </option>
                )) : (
                  <option value="">{translate("dashboard.noProjectsAvailable", "No projects available")}</option>
                )}
              </select>
            </label>
            <a className="panel-link" href={selectedProject ? `/admin/property-owners/${selectedProject.housingCompanyId}` : "/admin/property-owners"}>
              {selectedProject
                ? translate("dashboard.openCompanyWorkspace", "Open company workspace")
                : translate("dashboard.manageOwners", "Manage owners")}
            </a>
          </div>
        )}
      />

      {selectedProject ? (
        <div className="project-grid">
          <article className="project-main">
            <div className="project-heading">
              <div>
                <strong>{selectedProject.projectCode ? `${selectedProject.projectCode} - ` : ""}{selectedProject.name}</strong>
                <span>{selectedProject.housingCompanyName || translate("dashboard.notCaptured", "Not captured")}</span>
                <small>{[
                  selectedProject.propertyObjectName,
                  selectedProject.objectAddress,
                  [selectedProject.objectPostalCode, selectedProject.objectCity].filter(Boolean).join(" "),
                  selectedProject.objectCountry,
                ].filter(Boolean).join(" | ")}</small>
              </div>
              <b>{formatProjectStatus(selectedProject.status)}</b>
            </div>

            <div className="project-kpi-grid">
              <article>
                <span>{translate("dashboard.totalRevenue", "Total revenue")}</span>
                <strong>{formatCurrency(selectedProject.totalRevenue)}</strong>
              </article>
              <article>
                <span>{translate("ordersAdmin.orders", "Orders")}</span>
                <strong>{selectedProject.orderCount}</strong>
              </article>
              <article>
                <span>{translate("propertyOwnersAdmin.contracts", "Contracts")}</span>
                <strong>{selectedProject.contractCount}</strong>
              </article>
              <article>
                <span>{translate("dashboard.usedContracts", "Used contracts")}</span>
                <strong>{selectedProject.usedContractCount}</strong>
              </article>
              <article>
                <span>{translate("dashboard.unusedContracts", "Unused contracts")}</span>
                <strong>{selectedProject.unusedContractCount}</strong>
              </article>
              <article>
                <span>{translate("dashboard.averageOrderShort", "Avg. order")}</span>
                <strong>{formatCurrency(selectedProject.averageOrderValue)}</strong>
              </article>
              <article>
                <span>{translate("dashboard.cities", "Cities")}</span>
                <strong>{selectedProject.cityCount}</strong>
              </article>
            </div>

            <div className="project-chart-card">
              <div className="project-chart-heading">
                <strong>{translate("dashboard.projectTimeline", "Project timeline")}</strong>
              </div>
              <div className="project-chart-frame">
                {selectedTimeline.some((row) => row.orders || row.revenue) ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={selectedTimeline} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                      <YAxis yAxisId="orders" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                      <YAxis yAxisId="revenue" orientation="right" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} tickFormatter={compactCurrency} />
                      <Tooltip content={<CompanyTimelineTooltip />} />
                      <Legend wrapperStyle={{ color: CHART_TEXT }} />
                      <Line yAxisId="orders" type="monotone" dataKey="orders" name={translate("ordersAdmin.orders", "Orders")} stroke="#5B8DEF" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                      <Line yAxisId="revenue" type="monotone" dataKey="revenue" name={translate("dashboard.revenueLabel", "Revenue")} stroke="#3FA66B" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label={translate("dashboard.noProjectTimelineData", "No timeline data for the selected project.")} />
                )}
              </div>
            </div>

            <div className="project-split">
              <ProjectListPanel
                title={translate("dashboard.projectLocations", "Cities and addresses")}
                emptyLabel={translate("dashboard.noProjectLocationData", "No location data for the selected project.")}
                rows={selectedLocations}
                renderRow={(location) => (
                  <>
                    <div>
                      <strong>{location.label}</strong>
                      <span>{translate("ordersAdmin.orders", "Orders")}: {location.orders}</span>
                    </div>
                    <b>{formatCurrency(location.revenue)}</b>
                  </>
                )}
              />
              <ProjectListPanel
                title={translate("dashboard.projectKitchenBreakdown", "Kitchen breakdown")}
                emptyLabel={translate("dashboard.noProjectKitchenData", "No kitchen data for the selected project.")}
                rows={selectedKitchens}
                renderRow={(kitchen) => (
                  <>
                    <div>
                      <strong>{kitchen.kitchenName}</strong>
                      <span>{translate("ordersAdmin.orders", "Orders")}: {kitchen.orders}</span>
                    </div>
                    <b>{formatCurrency(kitchen.revenue)}</b>
                  </>
                )}
              />
            </div>

            <div className="project-chart-card">
              <div className="project-chart-heading">
                <strong>{translate("dashboard.projectTopItems", "Top items for selected project")}</strong>
                <div className="segmented-control" aria-label="Selected project top items mode">
                  <button className={itemMode === "quantity" ? "is-active" : ""} type="button" onClick={() => setItemMode("quantity")}>{translate("dashboard.byQuantity", "By Quantity")}</button>
                  <button className={itemMode === "revenue" ? "is-active" : ""} type="button" onClick={() => setItemMode("revenue")}>{translate("dashboard.byRevenue", "By Revenue")}</button>
                </div>
              </div>
              <div className="project-chart-frame">
                {topItemChartData.length ? (
                  <div className="top-items-scroll">
                    <ResponsiveContainer width="100%" height={topItemsChartHeight}>
                      <BarChart data={topItemChartData} layout="vertical" margin={{ top: 8, right: 76, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, topItemsXAxisMax]}
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          tickFormatter={itemMode === "revenue" ? compactCurrency : undefined}
                        />
                        <YAxis
                          type="category"
                          dataKey="axisLabel"
                          width={320}
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          tick={<TopItemsAxisTick />}
                        />
                        <Tooltip content={<TopItemsTooltip />} />
                        <Bar
                          dataKey="chartValue"
                          radius={[0, 8, 8, 0]}
                          label={{
                            position: "right",
                            fill: CHART_TEXT,
                            fontSize: 12,
                            fontWeight: 800,
                            formatter: itemConfig.formatter,
                          }}
                        >
                          {topItemChartData.map((item, index) => (
                            <Cell key={`${itemMode}-${item.code || item.name}-${item.name}`} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart label={translate("dashboard.noProjectItemData", "No item data for the selected project.")} />
                )}
              </div>
            </div>
          </article>

          <aside className="project-side">
            <ProjectListPanel
              title={translate("dashboard.contractNumbers", "Contract numbers")}
              emptyLabel={translate("dashboard.noProjectContracts", "No contract numbers for the selected project.")}
              rows={selectedContracts}
              renderRow={(contract) => (
                <>
                  <div>
                    <strong>{contract.contractNumber}</strong>
                    <span>{contract.kitchenName}</span>
                    {contract.unitLabel ? <span>{contract.unitLabel}</span> : null}
                    {contract.latestOrderAt ? <span>{translate("dashboard.latestOrder", "Latest order")}: {contract.latestOrderAt}</span> : null}
                  </div>
                  <b>{translateText("dashboard.contractOrderCount", "{count} order(s) linked", { count: String(contract.orderCount) })}</b>
                </>
              )}
            />
            <ProjectListPanel
              title={translate("dashboard.projectStatusDistribution", "Status distribution")}
              emptyLabel={translate("dashboard.noProjectStatusData", "No status data for the selected project.")}
              rows={selectedStatuses}
              renderRow={(status) => (
                <>
                  <div>
                    <strong>{translateStatus(status.status, translate)}</strong>
                  </div>
                  <b>{status.count}</b>
                </>
              )}
            />
            <div className="project-summary-list" aria-label={translate("dashboard.projectList", "Projects")}>
              {projects.map((project) => {
                const isSelected = project.id === selectedProject.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    className={`project-summary-row${isSelected ? " is-selected" : ""}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div>
                      <strong>{project.projectCode ? `${project.projectCode} - ` : ""}{project.name}</strong>
                      <span>{translateText("dashboard.projectMetricsSummary", "{contracts} contracts, {orders} orders", {
                        contracts: String(project.contractCount),
                        orders: String(project.orderCount),
                      })}</span>
                    </div>
                    <b>{formatCurrency(project.totalRevenue)}</b>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      ) : (
        <div className="empty-project-stats">{translate("dashboard.noProjectDataForSelectedFilters", "No project, contract, or order data matches the current filters.")}</div>
      )}

      <style jsx>{`
        .project-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .project-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.9fr);
          gap: 12px;
        }

        .project-main,
        .project-side {
          display: grid;
          gap: 14px;
          align-content: start;
        }

        .project-main {
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 14px;
          background: #fbfaf7;
        }

        .project-actions {
          display: flex;
          gap: 10px;
          align-items: end;
          flex-wrap: wrap;
        }

        .project-select-wrap {
          display: grid;
          gap: 6px;
          min-width: 240px;
        }

        .project-select-wrap span,
        .project-kpi-grid span,
        .project-heading span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .project-select-wrap select {
          min-height: 42px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
          padding: 9px 12px;
          font: inherit;
        }

        .project-heading,
        .project-chart-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .project-heading div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .project-heading strong,
        .project-chart-heading strong {
          color: var(--color-text);
        }

        .project-heading small {
          color: var(--color-text-muted);
          line-height: 1.45;
        }

        .project-heading b {
          color: var(--color-confirmed);
          text-transform: capitalize;
        }

        .project-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .project-kpi-grid article,
        .project-chart-card,
        .project-list-panel {
          border-radius: 8px;
          background: var(--color-card);
          padding: 10px;
          border: 1px solid var(--color-border);
        }

        .project-kpi-grid article {
          display: grid;
          gap: 4px;
        }

        .project-kpi-grid strong {
          color: var(--color-text);
          line-height: 1.25;
        }

        .project-chart-card,
        .project-list-panel {
          display: grid;
          gap: 12px;
        }

        .project-chart-frame {
          min-height: 220px;
          min-width: 0;
        }

        .project-split {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .top-items-scroll {
          max-height: 280px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .segmented-control button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }

        .panel-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          border-radius: 8px;
          border: 1px solid var(--color-primary);
          background: var(--color-primary);
          color: #ffffff;
          padding: 9px 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .project-summary-list {
          display: grid;
          gap: 8px;
          align-content: start;
          max-height: 430px;
          overflow: auto;
        }

        .project-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          text-align: left;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 12px;
          background: var(--color-card);
          cursor: pointer;
        }

        .project-summary-row div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .project-summary-row strong,
        .project-summary-row b {
          color: var(--color-text);
        }

        .project-summary-row span {
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .project-summary-row.is-selected {
          border-color: rgba(107, 79, 58, 0.18);
          background: var(--color-primary-soft);
          box-shadow: inset 0 0 0 1px rgba(107, 79, 58, 0.1);
        }

        .empty-project-stats {
          min-height: 120px;
          display: grid;
          place-items: center;
          border: 1px dashed var(--color-border);
          border-radius: 12px;
          color: var(--color-text-muted);
          background: #fbfaf7;
          text-align: center;
          padding: 20px;
        }

        @media (max-width: 900px) {
          .project-grid,
          .project-split {
            grid-template-columns: 1fr;
          }

          .project-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}

function ProjectListPanel({ title, emptyLabel, rows, renderRow }) {
  return (
    <div className="project-list-panel">
      <strong className="project-list-title">{title}</strong>
      {rows.length ? (
        <div className="project-list-rows">
          {rows.map((row, index) => (
            <div key={row.id || row.contractNumber || row.label || row.status || row.kitchenName || index} className="project-list-row">
              {renderRow(row)}
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart label={emptyLabel} />
      )}
      <style jsx>{`
        .project-list-panel {
          display: grid;
          gap: 10px;
          min-width: 0;
          border-radius: 8px;
          background: var(--color-card);
          padding: 10px;
          border: 1px solid var(--color-border);
        }

        .project-list-title {
          color: var(--color-text);
        }

        .project-list-rows {
          display: grid;
          gap: 8px;
          max-height: 280px;
          overflow: auto;
        }

        .project-list-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: #fbfaf7;
          padding: 10px;
        }

        .project-list-row :global(div) {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .project-list-row :global(strong),
        .project-list-row :global(b) {
          color: var(--color-text);
          font-size: 13px;
        }

        .project-list-row :global(span) {
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .project-list-row :global(b) {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

function CompanyTimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {item.dataKey === "revenue" ? formatCurrency(item.value) : item.value}
        </span>
      ))}
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function TopItemsSection({ topItemsByQuantity, topItemsByRevenue }) {
  const { translate } = useAdminI18n();
  const [mode, setMode] = useState("quantity");
  const translateText = (key, fallback, values) => interpolateText(translate(key, fallback), values);
  const config = mode === "quantity"
    ? {
        title: translate("dashboard.topItems", "Top items"),
        detail: translate("dashboard.topItemsSortedBySelectedPerformanceMetric", "Top items sorted by the selected performance metric."),
        data: topItemsByQuantity,
        formatter: (value) => translateText("dashboard.itemCountValue", "{count} item(s)", { count: String(value) }),
      }
    : {
        title: translate("dashboard.topItems", "Top items"),
        detail: translate("dashboard.topItemsSortedBySelectedPerformanceMetric", "Top items sorted by the selected performance metric."),
        data: topItemsByRevenue,
        formatter: formatCurrency,
      };

  const fullData = useMemo(() => config.data
    .map((item) => ({
      ...item,
      axisLabel: item.name || "",
      displayIdentifier: item.articleNumber || item.code || "",
      chartValue: Number(item[mode] || 0),
      quantity: Number(item.quantity || 0),
      revenue: Number(item.revenue || 0),
    }))
    .sort((a, b) => b.chartValue - a.chartValue), [config.data, mode]);
  const data = fullData.slice(0, MAX_TOP_ITEMS);
  const hasMoreItems = fullData.length > MAX_TOP_ITEMS;

  const chartHeight = Math.max(280, data.length * 34 + 52);
  const maxChartValue = data.reduce((max, item) => Math.max(max, item.chartValue), 0);
  const xAxisMax = mode === "quantity"
    ? Math.max(1, Math.ceil(maxChartValue * 1.12))
    : Math.max(1, maxChartValue * 1.12);

  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.topItems", "Top items")}
        title={config.title}
        detail={hasMoreItems
          ? translateText("dashboard.topItemsShowingTopCount", "Showing the top {count} items by the selected metric.", { count: String(MAX_TOP_ITEMS) })
          : config.detail}
        actions={(
          <div className="segmented-control" aria-label="Top items mode">
            <button className={mode === "quantity" ? "is-active" : ""} type="button" onClick={() => setMode("quantity")}>{translate("dashboard.byQuantity", "By Quantity")}</button>
            <button className={mode === "revenue" ? "is-active" : ""} type="button" onClick={() => setMode("revenue")}>{translate("dashboard.byRevenue", "By Revenue")}</button>
          </div>
        )}
      />
      <div className="top-items-frame">
        {data.length ? (
          <div className="top-items-scroll">
            <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              key={mode}
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 76, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART_GRID} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, xAxisMax]}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={mode === "revenue" ? compactCurrency : undefined}
              />
              <YAxis
                type="category"
                dataKey="axisLabel"
                width={320}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tick={<TopItemsAxisTick />}
              />
              <Tooltip content={<TopItemsTooltip />} />
              <Bar
                dataKey="chartValue"
                radius={[0, 8, 8, 0]}
                isAnimationActive
                animationDuration={320}
                label={{
                  position: "right",
                  fill: CHART_TEXT,
                  fontSize: 12,
                  fontWeight: 800,
                  formatter: config.formatter,
                }}
              >
                {data.map((item, index) => (
                  <Cell key={`${mode}-${item.code || item.name}-${item.name}`} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyChart label={translate("dashboard.noItemDataForSelectedFilters", "No item data for the selected filters.")} />}
      </div>
      <style jsx>{`
        .chart-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .top-items-frame {
          min-width: 0;
          min-height: 280px;
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .top-items-scroll {
          max-height: 280px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .segmented-control button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }
      `}</style>
    </section>
  );
}

function TopItemsAxisTick({ x, y, payload }) {
  const row = payload?.payload || {};
  const name = String(row.name || payload?.value || "");
  const identifier = String(row.displayIdentifier || "");

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-8} y={-5} textAnchor="end" fill={CHART_TEXT} fontSize={12} fontWeight={700}>
        {truncateLabel(name, 42)}
      </text>
      {identifier ? (
        <text x={-8} y={11} textAnchor="end" fill={CHART_MUTED} fontSize={10}>
          {truncateLabel(identifier, 34)}
        </text>
      ) : null}
    </g>
  );
}

function TopItemsTooltip({ active, payload }) {
  const { translate } = useAdminI18n();
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;
  return (
    <div className="tooltip">
      <strong>{item.name}</strong>
      <span>{translate("dashboard.categoryLabel", "Category")}: {item.itemType || translate("dashboard.notCaptured", "Not captured")}</span>
      <span>{translate("dashboard.codeLabel", "Code")}: {item.code || translate("dashboard.notCaptured", "Not captured")}</span>
      <span>{translate("kitchenDetailAdmin.articleNo", "Article no.")}: {item.articleNumber || "-"}</span>
      <span>{translate("orderDetailAdmin.quantity", "Quantity")}: {item.quantity}</span>
      <span>{translate("dashboard.revenueLabel", "Revenue")}: {formatCurrency(item.revenue)}</span>
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function DistributionSection({ itemTypeData, paymentData }) {
  const { translate } = useAdminI18n();
  const [mode, setMode] = useState("itemTypes");
  const config = mode === "itemTypes"
    ? {
        title: translate("dashboard.distribution", "Distribution"),
        detail: translate("dashboard.distributionBySelectedCategory", "Distribution by selected category."),
        data: itemTypeData,
      }
    : {
        title: translate("dashboard.distribution", "Distribution"),
        detail: translate("dashboard.distributionBySelectedCategory", "Distribution by selected category."),
        data: paymentData,
      };

  const data = useMemo(() => config.data
    .map((entry) => ({
      label: entry.label?.trim() || translate("dashboard.notCaptured", "Not captured"),
      value: Number(entry.value || 0),
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value), [config.data]);

  const colors = mode === "itemTypes"
    ? data.map((entry, index) => getDistributionColor(entry.label, index))
    : data.map((_, index) => DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]);

  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.distribution", "Distribution")}
        title={config.title}
        detail={config.detail}
        actions={(
          <div className="segmented-control" aria-label="Distribution mode">
            <button className={mode === "itemTypes" ? "is-active" : ""} type="button" onClick={() => setMode("itemTypes")}>{translate("dashboard.itemTypes", "Item Types")}</button>
            <button className={mode === "paymentMethods" ? "is-active" : ""} type="button" onClick={() => setMode("paymentMethods")}>{translate("dashboard.paymentMethods", "Payment Methods")}</button>
          </div>
        )}
      />
      <div className="donut-layout">
        <div className="donut-frame">
          {data.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart key={mode}>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={70}
                  outerRadius={104}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={320}
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.label} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart label={translate("dashboard.noDistributionDataForSelectedFilters", "No distribution data for the selected filters.")} />}
        </div>
        <div className="legend-list">
          {data.map((entry, index) => (
            <div key={entry.label}>
              <span style={{ background: colors[index] }} />
              <strong>{entry.label}</strong>
              <small>{entry.value}</small>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .chart-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .donut-layout {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) minmax(160px, 0.9fr);
          gap: 14px;
          align-items: center;
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .donut-frame {
          min-width: 0;
        }

        .legend-list {
          display: grid;
          gap: 10px;
        }

        .legend-list div {
          display: grid;
          grid-template-columns: 10px 1fr auto;
          gap: 9px;
          align-items: center;
        }

        .legend-list span {
          width: 10px;
          height: 10px;
          border-radius: 999px;
        }

        .legend-list strong {
          min-width: 0;
          overflow: hidden;
          color: var(--color-text);
          font-size: 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .legend-list small {
          color: var(--color-text-muted);
          font-weight: 800;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .segmented-control button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }

        @media (max-width: 700px) {
          .donut-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function GeographySection({ data }) {
  const { translate } = useAdminI18n();
  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.geography", "Geography")}
        title={translate("dashboard.ordersByCountryAndCity", "Orders by country and city")}
        detail={translate("dashboard.locationsRankedByNumberOfOrders", "Locations ranked by number of orders.")}
      />

      <div className="country-chart-frame">
        {data.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
              <YAxis type="category" dataKey="label" width={136} tickLine={false} axisLine={false} tick={<CountryAxisTick />} />
              <Tooltip content={<CountryTooltip />} />
              <Bar dataKey="orders" fill="#5B8DEF" radius={[0, 8, 8, 0]} label={{ position: "right", fill: CHART_TEXT, fontSize: 12, fontWeight: 800 }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label={translate("dashboard.noCountryOrderDataForSelectedFilters", "No country order data for the selected filters.")} />
        )}
      </div>

      <style jsx>{`
        .chart-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .country-chart-frame {
          min-width: 0;
          min-height: 280px;
        }
      `}</style>
    </section>
  );
}

function CountryAxisTick({ x, y, payload }) {
  const [city, country] = splitLocationLabel(payload?.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end">
        <tspan x={0} dy="-0.18em" fill={CHART_TEXT} fontSize="12" fontWeight="700">
          {truncateLabel(city, 18)}
        </tspan>
        <tspan x={0} dy="1.18em" fill={CHART_MUTED} fontSize="11">
          {truncateLabel(country, 18)}
        </tspan>
      </text>
    </g>
  );
}

function CountryTooltip({ active, payload }) {
  const { translate } = useAdminI18n();
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  return (
    <div className="tooltip">
      <strong>{row.label}</strong>
      <span>{translate("contractAddressFields.city", "City")}: {row.city}</span>
      <span>{translate("contractAddressFields.postalCode", "Postal code")}: {row.postalCode || translate("dashboard.notCaptured", "Not captured")}</span>
      <span>{translate("contractAddressFields.country", "Country")}: {row.country}</span>
      <span>{translate("ordersAdmin.orders", "Orders")}: {row.orders}</span>
      <span>{translate("dashboard.revenueLabel", "Revenue")}: {formatCurrency(row.revenue)}</span>
      <span>{translate("dashboard.shareLabel", "Share")}: {Math.round(Number(row.orderShare || 0))}%</span>
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function EmptyChart({ label }) {
  return <div className="empty-chart">{label}<style jsx>{`
    .empty-chart {
      min-height: 180px;
      display: grid;
      place-items: center;
      border: 1px dashed var(--color-border);
      border-radius: 12px;
      color: var(--color-text-muted);
      background: #fbfaf7;
      text-align: center;
      padding: 20px;
    }
  `}</style></div>;
}

function truncateLabel(value, maxLength = 24) {
  const label = String(value || "");
  return label.length > maxLength ? `${label.slice(0, maxLength - 3)}...` : label;
}

function interpolateText(template, values) {
  let text = String(template || "");
  if (!values) return text;

  Object.entries(values).forEach(([key, value]) => {
    text = text.replaceAll(`{${key}}`, String(value));
  });

  return text;
}

function translateStatus(status, translate) {
  const keys = {
    NEW: "dashboard.statusNew",
    EMAILED: "dashboard.statusEmailed",
    CONFIRMED: "dashboard.statusConfirmed",
    CANCELLED: "dashboard.statusCancelled",
  };

  return translate(keys[status] || "", status);
}

function splitLocationLabel(value) {
  const label = String(value || "");
  const separatorIndex = label.lastIndexOf(", ");
  if (separatorIndex === -1) return [label, ""];
  return [label.slice(0, separatorIndex), label.slice(separatorIndex + 2)];
}

function formatProjectStatus(value) {
  return String(value || "active").replace(/_/g, " ");
}

function getDistributionColor(label, index) {
  const normalized = String(label || "").trim().toUpperCase();
  if (CATEGORY_COLORS[normalized]) {
    return CATEGORY_COLORS[normalized];
  }
  return DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length];
}

function compactCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}
