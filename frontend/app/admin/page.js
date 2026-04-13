import { AdminShell } from "../../components/admin-shell";
import { AdminDashboardCharts } from "../../components/admin-dashboard-charts";
import { listKitchensForAdmin } from "../../lib/catalog";
import { requireAdminPage } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = ["NEW", "EMAILED", "CONFIRMED", "CANCELLED"];
const PERIOD_OPTIONS = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: null },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getPeriod(value) {
  return PERIOD_OPTIONS.find((option) => option.value === value) || PERIOD_OPTIONS[1];
}

function getPeriodStartDate(period) {
  if (!period.days) return null;
  const date = new Date();
  date.setDate(date.getDate() - period.days + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function getDateKeys(orders, startDate) {
  if (!orders.length && !startDate) return [];

  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = startDate ? new Date(startDate) : new Date(orders[orders.length - 1].createdAt);
  start.setHours(0, 0, 0, 0);

  const keys = [];
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    keys.push(toDateKey(day));
  }
  return keys;
}

function getItemKey(item) {
  return [item.itemType, item.code, item.nameSnapshot].join("::");
}

function deriveCountry(order) {
  if (typeof order.country === "string" && order.country.trim()) return order.country.trim();

  const city = String(order.city || "").trim().toLowerCase();
  const postalCode = String(order.postalCode || "").trim();
  const compactPostalCode = postalCode.replace(/\s+/g, "");

  if (["prishtine", "prishtina", "pristina"].includes(city)) return "Kosovo";
  if (["berlin", "hamburg", "munich", "münchen", "frankfurt", "cologne", "köln", "stuttgart", "dusseldorf", "düsseldorf"].includes(city)) return "Germany";
  if (["budapest", "debrecen", "szeged", "miskolc", "pecs", "pécs", "gyor", "győr"].includes(city)) return "Hungary";
  if (["vienna", "wien", "graz", "linz", "salzburg"].includes(city)) return "Austria";
  if (["zurich", "zürich", "geneva", "basel", "bern"].includes(city)) return "Switzerland";
  if (["prague", "praha", "brno", "ostrava"].includes(city)) return "Czechia";
  if (["bratislava", "kosice", "košice"].includes(city)) return "Slovakia";
  if (["warsaw", "krakow", "kraków", "wroclaw", "wrocław"].includes(city)) return "Poland";
  if (/^de[-\s]?\d{5}$/i.test(compactPostalCode)) return "Germany";

  return "Unknown";
}

export default async function AdminDashboardPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const period = getPeriod(normalizeParam(params.period));
  const kitchenId = normalizeParam(params.kitchenId);
  const status = normalizeParam(params.status);
  const validStatus = ORDER_STATUSES.includes(status) ? status : "";
  const startDate = getPeriodStartDate(period);

  const where = {};
  if (startDate) where.createdAt = { gte: startDate };
  if (kitchenId) where.kitchenId = kitchenId;
  if (validStatus) where.status = validStatus;

  const [kitchens, orders] = await Promise.all([
    listKitchensForAdmin(),
    prisma.order.findMany({
      where,
      include: { kitchen: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const emailedOrders = orders.filter((order) => order.status === "EMAILED").length;
  const conversionRate = totalOrders ? (emailedOrders / totalOrders) * 100 : 0;

  const statusCounts = ORDER_STATUSES.reduce((acc, orderStatus) => ({ ...acc, [orderStatus]: 0 }), {});
  const itemStats = new Map();
  const typeSplit = new Map();
  const paymentStats = new Map();
  const geographyStats = new Map();
  const dateKeys = getDateKeys(orders, startDate);
  const dailyStatusByDate = new Map(
    dateKeys.map((date) => [
      date,
      {
        date,
        label: formatDateLabel(date),
        NEW: 0,
        EMAILED: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
      },
    ]),
  );
  const kitchenSeries = kitchens.map((kitchen) => kitchen.name);
  const timelineByDate = new Map(
    dateKeys.map((date) => [
      date,
      kitchens.reduce(
        (row, kitchen) => {
          row[kitchen.name] = 0;
          return row;
        },
        { date, label: formatDateLabel(date) },
      ),
    ]),
  );

  for (const order of orders) {
    const dateKey = toDateKey(order.createdAt);
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;

    if (!dailyStatusByDate.has(dateKey)) {
      dailyStatusByDate.set(dateKey, {
        date: dateKey,
        label: formatDateLabel(dateKey),
        NEW: 0,
        EMAILED: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
      });
    }
    dailyStatusByDate.get(dateKey)[order.status] += 1;

    if (!timelineByDate.has(dateKey)) {
      timelineByDate.set(dateKey, kitchens.reduce(
        (row, kitchen) => {
          row[kitchen.name] = 0;
          return row;
        },
        { date: dateKey, label: formatDateLabel(dateKey) },
      ));
    }
    timelineByDate.get(dateKey)[order.kitchen.name] = (timelineByDate.get(dateKey)[order.kitchen.name] || 0) + 1;

    const paymentLabel = order.paymentMethod?.trim() || "Not captured";
    paymentStats.set(paymentLabel, (paymentStats.get(paymentLabel) || 0) + 1);

    const country = deriveCountry(order);
    const existingCountry = geographyStats.get(country) || { country, orders: 0, revenue: 0 };
    existingCountry.orders += 1;
    existingCountry.revenue += Number(order.totalPrice || 0);
    geographyStats.set(country, existingCountry);

    for (const item of order.items) {
      const quantity = Number(item.quantity || 0);
      const revenue = Number(item.priceSnapshot || 0) * quantity;
      const itemKey = getItemKey(item);
      const existingItem = itemStats.get(itemKey) || {
        itemType: item.itemType,
        code: item.code,
        name: item.nameSnapshot,
        quantity: 0,
        revenue: 0,
      };
      existingItem.quantity += quantity;
      existingItem.revenue += revenue;
      itemStats.set(itemKey, existingItem);

      const existingType = typeSplit.get(item.itemType) || { label: item.itemType, value: 0 };
      existingType.value += quantity;
      typeSplit.set(item.itemType, existingType);
    }
  }

  const dailyStatusData = Array.from(dailyStatusByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const kitchenTimelineData = Array.from(timelineByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const topItemsByQuantity = Array.from(itemStats.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const topItemsByRevenue = Array.from(itemStats.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const itemTypeData = Array.from(typeSplit.values()).sort((a, b) => b.value - a.value);
  const paymentData = Array.from(paymentStats.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const geographyData = Array.from(geographyStats.values())
    .map((row) => ({
      ...row,
      orderShare: totalOrders ? (row.orders / totalOrders) * 100 : 0,
    }))
    .sort((a, b) => b.orders - a.orders);
  const recentOrders = orders.slice(0, 5).map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    kitchen: order.kitchen.name,
    status: order.status,
    totalPrice: Number(order.totalPrice || 0),
    city: order.city || "",
    createdAt: formatDateTime(order.createdAt),
  }));

  const kpis = [
    {
      label: "Total Orders",
      value: String(totalOrders),
      trend: `${period.label} by creation date`,
    },
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      trend: "Gross order value",
    },
    {
      label: "Average Order Value",
      value: formatCurrency(averageOrderValue),
      trend: "Revenue per order",
    },
    {
      label: "Conversion Rate",
      value: formatPercent(conversionRate),
      trend: `${emailedOrders} emailed / ${totalOrders} total`,
    },
  ];

  return (
    <AdminShell adminEmail={admin.email}>
      <AdminDashboardCharts
        kpis={kpis}
        periodOptions={PERIOD_OPTIONS.map(({ value, label }) => ({ value, label }))}
        selectedPeriod={period.value}
        kitchens={kitchens.map((kitchen) => ({ id: kitchen.id, name: kitchen.name }))}
        selectedKitchenId={kitchenId}
        statusOptions={ORDER_STATUSES}
        selectedStatus={validStatus}
        dailyStatusData={dailyStatusData}
        kitchenTimelineData={kitchenTimelineData}
        kitchenSeries={kitchenSeries}
        topItemsByQuantity={topItemsByQuantity}
        topItemsByRevenue={topItemsByRevenue}
        itemTypeData={itemTypeData}
        paymentData={paymentData}
        geographyData={geographyData}
        recentOrders={recentOrders}
      />
    </AdminShell>
  );
}
