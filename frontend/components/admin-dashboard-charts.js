"use client";

import { useMemo, useState } from "react";
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
  NEW: "#9ca3af",
  EMAILED: "#2563eb",
  CONFIRMED: "#16a34a",
  CANCELLED: "#dc2626",
};

const SERIES_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#e11d48", "#65a30d", "#ea580c", "#0d9488"];
const DISTRIBUTION_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#e11d48", "#65a30d", "#ea580c", "#0d9488"];
const ORDER_STATUSES = ["NEW", "EMAILED", "CONFIRMED", "CANCELLED"];

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
  kitchenTimelineData,
  kitchenSeries,
  topItemsByQuantity,
  topItemsByRevenue,
  itemTypeData,
  paymentData,
  geographyData,
  recentOrders,
}) {
  const [statusMode, setStatusMode] = useState("volume");
  const [isolatedSeries, setIsolatedSeries] = useState("");

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
          <p className="eyebrow">Analytics overview</p>
          <h1>Order dashboard</h1>
          <p>Monitor sales, workflow movement, kitchen demand, and item performance.</p>
        </div>
        <form method="get" className="filter-form">
          <label>
            Date range
            <select name="period" defaultValue={selectedPeriod}>
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Kitchen
            <select name="kitchenId" defaultValue={selectedKitchenId}>
              <option value="">All kitchens</option>
              {kitchens.map((kitchen) => (
                <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={selectedStatus}>
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <button type="submit">Apply</button>
        </form>
      </section>

      <section className="kpi-grid" aria-label="Dashboard KPIs">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="kpi-card">
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small>{kpi.trend}</small>
          </article>
        ))}
      </section>

      <section className="chart-card chart-card--status">
        <ChartHeader
          eyebrow="Daily status breakdown"
          title="Orders by status"
          detail="Stacked by workflow state using order creation date."
          actions={(
            <div className="segmented-control" aria-label="Status chart mode">
              <button className={statusMode === "volume" ? "is-active" : ""} type="button" onClick={() => setStatusMode("volume")}>Volume View</button>
              <button className={statusMode === "percentage" ? "is-active" : ""} type="button" onClick={() => setStatusMode("percentage")}>Percentage View</button>
            </div>
          )}
        />
        <div className="chart-frame">
          {statusChartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusChartData} margin={{ top: 12, right: 20, left: -10, bottom: 4 }}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} domain={statusMode === "percentage" ? [0, 100] : undefined} tickFormatter={(value) => statusMode === "percentage" ? `${value}%` : value} />
                <Tooltip content={<StatusTooltip mode={statusMode} />} />
                <Legend />
                {ORDER_STATUSES.map((status) => (
                  <Bar key={status} dataKey={status} stackId="orders" fill={STATUS_COLORS[status]} radius={status === "CANCELLED" ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No status data for the selected filters." />
          )}
        </div>
      </section>

      <section className="chart-card chart-card--compact">
        <ChartHeader
          eyebrow="Kitchen timeline"
          title="Order activity by kitchen"
          detail="Click a legend item to isolate it."
        />
        <div className="chart-frame">
          {kitchenTimelineData.length && kitchenSeries.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={kitchenTimelineData} margin={{ top: 10, right: 18, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Legend onClick={(event) => setIsolatedSeries((current) => current === event.dataKey ? "" : event.dataKey)} />
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
            <EmptyChart label="No kitchen timeline data for the selected filters." />
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

      <section className="chart-card">
        <ChartHeader eyebrow="Operations" title="Recent orders" detail="Latest matching orders for follow-up." />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Kitchen</th>
                <th>Status</th>
                <th>Total</th>
                <th>City</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length ? recentOrders.map((order) => (
                <tr key={order.id}>
                  <td><a href={`/admin/orders/${order.id}`}>{order.orderNumber}</a></td>
                  <td>{order.kitchen}</td>
                  <td><span className="status-pill" style={{ "--status-color": STATUS_COLORS[order.status] }}>{order.status}</span></td>
                  <td>{formatCurrency(order.totalPrice)}</td>
                  <td>{order.city || "Not captured"}</td>
                  <td>{order.createdAt}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6}>No recent orders match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .analytics-dashboard {
          display: grid;
          gap: 16px;
          color: #111827;
        }

        .dashboard-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: 2.2rem;
          line-height: 1.08;
        }

        p {
          margin: 8px 0 0;
          color: #6b7280;
          line-height: 1.5;
        }

        .filter-form {
          display: grid;
          grid-template-columns: repeat(4, minmax(130px, auto));
          gap: 10px;
          align-items: end;
        }

        label {
          display: grid;
          gap: 6px;
          color: #4b5563;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        select,
        button {
          min-height: 42px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #111827;
          padding: 9px 12px;
          font: inherit;
          text-transform: none;
          letter-spacing: 0;
        }

        button {
          border-color: #2563eb;
          background: #2563eb;
          color: #ffffff;
          font-weight: 800;
          cursor: pointer;
        }

        .kpi-grid,
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .dashboard-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: stretch;
        }

        .kpi-card,
        .chart-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
        }

        .kpi-card {
          display: grid;
          gap: 6px;
          padding: 16px;
        }

        .kpi-card span {
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .kpi-card strong {
          color: #111827;
          font-size: 1.65rem;
          line-height: 1.1;
        }

        .kpi-card small {
          color: #16a34a;
          font-weight: 700;
        }

        .chart-card {
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .chart-card--status {
          min-height: 360px;
        }

        .chart-card--compact {
          min-height: 360px;
        }

        .chart-frame {
          min-height: 280px;
          min-width: 0;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: #f3f4f6;
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          background: transparent;
          color: #4b5563;
          padding: 7px 10px;
        }

        .segmented-control button.is-active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 5px 14px rgba(15, 23, 42, 0.12);
        }

        .table-wrap {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: #ffffff;
        }

        th,
        td {
          padding: 10px 14px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
          white-space: nowrap;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        th {
          color: #6b7280;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        td {
          color: #111827;
          font-size: 14px;
        }

        td a {
          color: #111827;
          font-weight: 800;
          text-decoration: none;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: color-mix(in srgb, var(--status-color) 13%, #ffffff);
          color: var(--status-color);
          border: 1px solid color-mix(in srgb, var(--status-color) 25%, #ffffff);
          padding: 6px 9px;
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 1100px) {
          .kpi-grid,
          .dashboard-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filter-form {
            grid-template-columns: repeat(2, minmax(150px, 1fr));
          }
        }

        @media (max-width: 700px) {
          .kpi-grid,
          .dashboard-grid,
          .filter-form {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </div>
  );
}

function ChartHeader({ eyebrow, title, detail, actions }) {
  return (
    <div className="chart-header">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
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
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h2 {
          margin: 6px 0 0;
          color: #111827;
          font-size: 1.2rem;
        }

        p {
          margin: 6px 0 0;
          color: #6b7280;
          line-height: 1.45;
        }
      `}</style>
    </div>
  );
}

function StatusTooltip({ active, payload, label, mode }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.dataKey}: {item.value}{mode === "percentage" ? "%" : ""}
        </span>
      ))}
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #ffffff;
          padding: 10px 12px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
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
  const [mode, setMode] = useState("quantity");
  const config = mode === "quantity"
    ? {
        title: "Top items",
        detail: "Top items sorted by selected performance metric.",
        data: topItemsByQuantity,
        formatter: (value) => `${value} item(s)`,
      }
    : {
        title: "Top items",
        detail: "Top items sorted by selected performance metric.",
        data: topItemsByRevenue,
        formatter: formatCurrency,
      };

  const data = useMemo(() => config.data
    .map((item) => ({
      ...item,
      axisLabel: item.name || "",
      displayIdentifier: item.articleNumber || item.code || "",
      chartValue: Number(item[mode] || 0),
      quantity: Number(item.quantity || 0),
      revenue: Number(item.revenue || 0),
    }))
    .sort((a, b) => b.chartValue - a.chartValue), [config.data, mode]);

  const chartHeight = Math.max(280, data.length * 34 + 52);
  const maxChartValue = data.reduce((max, item) => Math.max(max, item.chartValue), 0);
  const xAxisMax = mode === "quantity"
    ? Math.max(1, Math.ceil(maxChartValue * 1.12))
    : Math.max(1, maxChartValue * 1.12);

  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow="Top items"
        title={config.title}
        detail={config.detail}
        actions={(
          <div className="segmented-control" aria-label="Top items mode">
            <button className={mode === "quantity" ? "is-active" : ""} type="button" onClick={() => setMode("quantity")}>By Quantity</button>
            <button className={mode === "revenue" ? "is-active" : ""} type="button" onClick={() => setMode("revenue")}>By Revenue</button>
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
              <CartesianGrid stroke="#e5e7eb" horizontal={false} />
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
                  fill: "#111827",
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
        ) : <EmptyChart label="No item data for the selected filters." />}
      </div>
      <style jsx>{`
        .chart-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
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
          background: #f3f4f6;
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #4b5563;
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .segmented-control button.is-active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 5px 14px rgba(15, 23, 42, 0.12);
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
      <text x={-8} y={-5} textAnchor="end" fill="#374151" fontSize={12} fontWeight={700}>
        {truncateLabel(name, 42)}
      </text>
      {identifier ? (
        <text x={-8} y={11} textAnchor="end" fill="#6b7280" fontSize={10}>
          {truncateLabel(identifier, 34)}
        </text>
      ) : null}
    </g>
  );
}

function TopItemsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;
  return (
    <div className="tooltip">
      <strong>{item.name}</strong>
      <span>Category: {item.itemType || "Not captured"}</span>
      <span>Code: {item.code || "Not captured"}</span>
      <span>Article No: {item.articleNumber || "—"}</span>
      <span>Quantity: {item.quantity}</span>
      <span>Revenue: {formatCurrency(item.revenue)}</span>
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #ffffff;
          padding: 10px 12px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
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
  const [mode, setMode] = useState("itemTypes");
  const config = mode === "itemTypes"
    ? {
        title: "Distribution",
        detail: "Distribution by selected category.",
        data: itemTypeData,
      }
    : {
        title: "Distribution",
        detail: "Distribution by selected category. Missing payment methods appear as Not captured.",
        data: paymentData,
      };

  const data = useMemo(() => config.data
    .map((entry) => ({
      label: entry.label?.trim() || "Not captured",
      value: Number(entry.value || 0),
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value), [config.data]);

  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow="Distribution"
        title={config.title}
        detail={config.detail}
        actions={(
          <div className="segmented-control" aria-label="Distribution mode">
            <button className={mode === "itemTypes" ? "is-active" : ""} type="button" onClick={() => setMode("itemTypes")}>Item Types</button>
            <button className={mode === "paymentMethods" ? "is-active" : ""} type="button" onClick={() => setMode("paymentMethods")}>Payment Methods</button>
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
                    <Cell key={entry.label} fill={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No distribution data for the selected filters." />}
        </div>
        <div className="legend-list">
          {data.map((entry, index) => (
            <div key={entry.label}>
              <span style={{ background: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length] }} />
              <strong>{entry.label}</strong>
              <small>{entry.value}</small>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .chart-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
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
          color: #111827;
          font-size: 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .legend-list small {
          color: #6b7280;
          font-weight: 800;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: #f3f4f6;
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #4b5563;
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .segmented-control button.is-active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 5px 14px rgba(15, 23, 42, 0.12);
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
  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow="Geography"
        title="Orders by country and city"
        detail="Locations ranked by number of orders."
      />

      <div className="country-chart-frame">
        {data.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="label" width={136} tickLine={false} axisLine={false} tick={<CountryAxisTick />} />
              <Tooltip content={<CountryTooltip />} />
              <Bar dataKey="orders" fill="#2563eb" radius={[0, 8, 8, 0]} label={{ position: "right", fill: "#111827", fontSize: 12, fontWeight: 800 }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="No country order data for the selected filters." />
        )}
      </div>

      <style jsx>{`
        .chart-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
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
        <tspan x={0} dy="-0.18em" fill="#374151" fontSize="12" fontWeight="700">
          {truncateLabel(city, 18)}
        </tspan>
        <tspan x={0} dy="1.18em" fill="#6b7280" fontSize="11">
          {truncateLabel(country, 18)}
        </tspan>
      </text>
    </g>
  );
}

function CountryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  return (
    <div className="tooltip">
      <strong>{row.label}</strong>
      <span>City: {row.city}</span>
      <span>Postal code: {row.postalCode || "Not captured"}</span>
      <span>Country: {row.country}</span>
      <span>Orders: {row.orders}</span>
      <span>Revenue: {formatCurrency(row.revenue)}</span>
      <span>Share: {Math.round(Number(row.orderShare || 0))}%</span>
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #ffffff;
          padding: 10px 12px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
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
      border: 1px dashed #d1d5db;
      border-radius: 12px;
      color: #6b7280;
      background: #f9fafb;
      text-align: center;
      padding: 20px;
    }
  `}</style></div>;
}

function truncateLabel(value, maxLength = 24) {
  const label = String(value || "");
  return label.length > maxLength ? `${label.slice(0, maxLength - 3)}...` : label;
}

function splitLocationLabel(value) {
  const label = String(value || "");
  const separatorIndex = label.lastIndexOf(", ");
  if (separatorIndex === -1) return [label, ""];
  return [label.slice(0, separatorIndex), label.slice(separatorIndex + 2)];
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
