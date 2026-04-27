import { AdminShell } from "../../components/admin-shell";
import { AdminDashboardCharts } from "../../components/admin-dashboard-charts";
import { listKitchensForAdmin } from "../../lib/catalog";
import { requireAdminPage } from "../../lib/auth";
import { getProviderCountryConfig } from "../../lib/address-verification";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = ["NEW", "EMAILED", "CONFIRMED", "CANCELLED"];
const PERIOD_OPTIONS = [
  { value: "7d", labelKey: "dashboard.last7Days", fallbackLabel: "Last 7 days", days: 7 },
  { value: "30d", labelKey: "dashboard.last30Days", fallbackLabel: "Last 30 days", days: 30 },
  { value: "90d", labelKey: "dashboard.last90Days", fallbackLabel: "Last 90 days", days: 90 },
  { value: "all", labelKey: "dashboard.allTime", fallbackLabel: "All time", days: null },
];
const ARTICLE_NUMBER_BY_CODE = {
  "WM-B-EWA34660W": "EWA34660W",
  "DISH-B-600-STD": "A-EGSPV597210",
  "REF-B-545-1800-700": "OL-KGCN388140E",
  "HOOD-B-FH664621E": "FH664621E",
  "ACC-CUTLERY-ZB60SG": "ZB60SG",
  "SINK-B-BOTTON-45": "517467",
  "ACC-LIGHT-003": "KA220043_S3",
  "LIGHT-B-LED-001": "KA220043_S3",
  "WM-C-EWA34660W": "EWA34660W",
  "DISH-C-600-STD": "A-EGSPV597210",
  "REF-C-545-1800-700": "OL-KGCN388140E",
  "ACC-CUTLERY-001": "ZB60SG",
  "SINK-C-BOTTON-45": "517467",
  "ACC-LIGHT-003": "KA220043_S3",
  "LIGHT-C-LED-001": "KA220043_S3",
};
const TOP_ITEM_GROUP_METADATA_BY_ARTICLE_NUMBER = {
  EWA34660W: {
    preferredCode: "WM-B-EWA34660W",
    preferredName: "Washing Machine (600 x 600 x 878 mm)",
    preferredItemType: "COMPONENT",
  },
  "A-EGSPV597210": {
    preferredCode: "DISH-B-600-STD",
    preferredName: "Dishwasher (600 x 600 x 878 mm)",
    preferredItemType: "COMPONENT",
  },
  "OL-KGCN388140E": {
    preferredCode: "REF-B-545-1800-700",
    preferredName: "Refrigerator (545 x 1800 x 700 mm)",
    preferredItemType: "COMPONENT",
  },
  FH664621E: {
    preferredCode: "HOOD-B-FH664621E",
    preferredName: "FH664621E Extractor Hood",
    preferredItemType: "COMPONENT",
  },
  ZB60SG: {
    preferredCode: "ACC-CUTLERY-ZB60SG",
    preferredName: "Besteckeinsatz ZB60SG",
    preferredItemType: "ACCESSORY",
  },
  KA220043_S3: {
    preferredCode: "LIGHT-B-LED-001",
    preferredName: "LED Lighting Set",
    preferredItemType: "COMPONENT",
  },
  "517467": {
    preferredCode: "SINK-B-BOTTON-45",
    preferredName: "Sink and Waste System",
    preferredItemType: "COMPONENT",
  },
};
const TOP_ITEM_GROUP_METADATA_BY_CODE = {
  "OVEN-B-600-HOB": {
    groupKey: "mapped:oven-600-hob",
    preferredCode: "OVEN-B-600-HOB",
    preferredName: "Built-in Oven and Hob (600 x 600 x 878 mm)",
    preferredItemType: "COMPONENT",
  },
  "OVEN-C-600-HOB": {
    groupKey: "mapped:oven-600-hob",
    preferredCode: "OVEN-B-600-HOB",
    preferredName: "Built-in Oven and Hob (600 x 600 x 878 mm)",
    preferredItemType: "COMPONENT",
  },
  "SINKBASE-B-600": {
    groupKey: "mapped:sinkbase-600",
    preferredCode: "SINKBASE-B-600",
    preferredName: "Sink Base Cabinet (600 x 600 x 878 mm)",
    preferredItemType: "COMPONENT",
  },
  "SINKBASE-C-600": {
    groupKey: "mapped:sinkbase-600",
    preferredCode: "SINKBASE-B-600",
    preferredName: "Sink Base Cabinet (600 x 600 x 878 mm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-B-L-600": {
    groupKey: "mapped:cab-wall-left-600",
    preferredCode: "CAB-WALL-B-L-600",
    preferredName: "Wall Cabinet left (600 x 723 x 320 mm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-C-L-600": {
    groupKey: "mapped:cab-wall-left-600",
    preferredCode: "CAB-WALL-B-L-600",
    preferredName: "Wall Cabinet left (600 x 723 x 320 mm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-B-ML-600": {
    groupKey: "mapped:cab-wall-mid-left-600",
    preferredCode: "CAB-WALL-B-ML-600",
    preferredName: "Wall Cabinet mid-left (600 x 723 x 320 mm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-C-ML-600": {
    groupKey: "mapped:cab-wall-mid-left-600",
    preferredCode: "CAB-WALL-B-ML-600",
    preferredName: "Wall Cabinet mid-left (600 x 723 x 320 mm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-B-MR-600": {
    groupKey: "mapped:cab-wall-mid-right-600",
    preferredCode: "CAB-WALL-B-MR-600",
    preferredName: "Wall Cabinet mid-right (600 x 723 x 320 mm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-C-MR-600": {
    groupKey: "mapped:cab-wall-mid-right-600",
    preferredCode: "CAB-WALL-B-MR-600",
    preferredName: "Wall Cabinet mid-right (600 x 723 x 320 mm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-B-R-600": {
    groupKey: "mapped:cab-wall-right-600",
    preferredCode: "CAB-WALL-B-R-600",
    preferredName: "Wall Cabinet right (600 x 723 x 320 mm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-C-R-600": {
    groupKey: "mapped:cab-wall-right-600",
    preferredCode: "CAB-WALL-B-R-600",
    preferredName: "Wall Cabinet right (600 x 723 x 320 mm)",
    preferredItemType: "COMPONENT",
  },
};

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

function getDateKeys(startDate, earliestCreatedAt) {
  if (!startDate && !earliestCreatedAt) return [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = startDate ? new Date(startDate) : new Date(earliestCreatedAt);
  start.setHours(0, 0, 0, 0);

  const keys = [];
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    keys.push(toDateKey(day));
  }
  return keys;
}

function getItemKey(item) {
  const code = String(item.code || "").trim();
  if (code) return code;
  return [item.itemType, item.nameSnapshot].join("::");
}

function choosePreferredText(currentValue, nextValue) {
  const current = String(currentValue || "").trim();
  const next = String(nextValue || "").trim();
  if (!current) return next || null;
  if (!next) return current;
  return current.localeCompare(next) <= 0 ? current : next;
}

function choosePreferredItemType(currentValue, nextValue, preferredValue = null) {
  if (preferredValue) return preferredValue;

  const priority = { COMPONENT: 3, ACCESSORY: 2, SERVICE: 1 };
  const current = String(currentValue || "").trim();
  const next = String(nextValue || "").trim();
  if (!current) return next || null;
  if (!next) return current;
  return (priority[next] || 0) > (priority[current] || 0) ? next : current;
}

function getTopItemGrouping(row, articleNumber) {
  const normalizedArticleNumber = String(articleNumber || "").trim();
  const normalizedCode = String(row.code || "").trim();

  if (normalizedArticleNumber) {
    const metadata = TOP_ITEM_GROUP_METADATA_BY_ARTICLE_NUMBER[normalizedArticleNumber] || {};
    return {
      groupKey: `article:${normalizedArticleNumber}`,
      preferredCode: metadata.preferredCode || normalizedCode || null,
      preferredName: metadata.preferredName || null,
      preferredItemType: metadata.preferredItemType || null,
    };
  }

  const mapped = TOP_ITEM_GROUP_METADATA_BY_CODE[normalizedCode];
  if (mapped) {
    return mapped;
  }

  return {
    groupKey: `code:${getItemKey(row)}`,
    preferredCode: normalizedCode || null,
    preferredName: null,
    preferredItemType: null,
  };
}

function normalizeCountryName(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return getProviderCountryConfig(trimmed)?.providerName || trimmed;
}

function deriveCountry(order) {
  if (typeof order.country === "string" && order.country.trim()) {
    return normalizeCountryName(order.country);
  }

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

function buildOrderFilterConditions({ startDate, kitchenId, status }, alias = "o") {
  const table = Prisma.raw(alias);
  const filters = [];
  if (startDate) filters.push(Prisma.sql`${table}."createdAt" >= ${startDate}`);
  if (kitchenId) filters.push(Prisma.sql`${table}."kitchenId" = ${kitchenId}`);
  if (status) filters.push(Prisma.sql`${table}."status" = ${status}`);
  return filters;
}

function buildOrderWhereClause(filters, alias = "o") {
  const conditions = buildOrderFilterConditions(filters, alias);
  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
}

function buildOrderAndClause(filters, alias = "o") {
  const conditions = buildOrderFilterConditions(filters, alias);
  return conditions.length ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
}

async function loadDashboardSummary(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");
  const [row] = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS "totalOrders",
      COALESCE(SUM(o."totalPrice"), 0) AS "totalRevenue",
      COUNT(*) FILTER (WHERE o."status" = 'EMAILED')::int AS "emailedOrders",
      MIN(o."createdAt") AS "earliestCreatedAt"
    FROM "Order" o
    ${whereClause}
  `;

  return {
    totalOrders: Number(row?.totalOrders || 0),
    totalRevenue: Number(row?.totalRevenue || 0),
    emailedOrders: Number(row?.emailedOrders || 0),
    earliestCreatedAt: row?.earliestCreatedAt || null,
  };
}

async function loadDailyStatusRows(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");
  return prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', o."createdAt")::date AS "date",
      o."status"::text AS "status",
      COUNT(*)::int AS "count"
    FROM "Order" o
    ${whereClause}
    GROUP BY 1, 2
    ORDER BY 1 ASC, 2 ASC
  `;
}

async function loadKitchenTimelineRows(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");
  return prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', o."createdAt")::date AS "date",
      k."name" AS "kitchen",
      COUNT(*)::int AS "count"
    FROM "Order" o
    JOIN "Kitchen" k ON k."id" = o."kitchenId"
    ${whereClause}
    GROUP BY 1, 2
    ORDER BY 1 ASC, 2 ASC
  `;
}

async function loadPaymentRows(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");
  return prisma.$queryRaw`
    SELECT
      COALESCE(NULLIF(BTRIM(o."paymentMethod"), ''), 'Not captured') AS "label",
      COUNT(*)::int AS "value"
    FROM "Order" o
    ${whereClause}
    GROUP BY 1
    ORDER BY 2 DESC, 1 ASC
  `;
}

async function loadGeographyRows(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");
  return prisma.$queryRaw`
    SELECT
      COALESCE(NULLIF(BTRIM(o."country"), ''), '') AS "country",
      COALESCE(NULLIF(BTRIM(o."city"), ''), 'Not captured') AS "city",
      COALESCE(NULLIF(BTRIM(o."postalCode"), ''), '') AS "postalCode",
      COUNT(*)::int AS "orders",
      COALESCE(SUM(o."totalPrice"), 0) AS "revenue"
    FROM "Order" o
    ${whereClause}
    GROUP BY 1, 2, 3
    ORDER BY 4 DESC, 2 ASC, 3 ASC
  `;
}

async function loadGroupedItemRows(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");

  try {
    const hasArticleNumberColumn = await hasKitchenItemArticleNumberColumn();
    if (hasArticleNumberColumn) {
      return prisma.$queryRaw`
        SELECT
          oi."itemType"::text AS "itemType",
          oi."code" AS "code",
          oi."nameSnapshot" AS "nameSnapshot",
          MAX(ki."name") FILTER (WHERE ki."name" IS NOT NULL) AS "canonicalName",
          ki."articleNumber" AS "articleNumber",
          SUM(oi."quantity")::int AS "quantity",
          COALESCE(SUM(oi."quantity" * oi."priceSnapshot"), 0) AS "revenue"
        FROM "OrderItem" oi
        JOIN "Order" o ON o."id" = oi."orderId"
        LEFT JOIN "KitchenItem" ki ON ki."id" = oi."kitchenItemId"
        ${whereClause}
        GROUP BY 1, 2, 3, 5
        ORDER BY 6 DESC, 7 DESC, 3 ASC
      `;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("articleNumber") && !message.includes("column")) {
      throw error;
    }
  }

  return prisma.$queryRaw`
    SELECT
      oi."itemType"::text AS "itemType",
      oi."code" AS "code",
      oi."nameSnapshot" AS "nameSnapshot",
      NULL::text AS "canonicalName",
      NULL::text AS "articleNumber",
      SUM(oi."quantity")::int AS "quantity",
      COALESCE(SUM(oi."quantity" * oi."priceSnapshot"), 0) AS "revenue"
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    ${whereClause}
    GROUP BY 1, 2, 3, 4, 5
    ORDER BY 6 DESC, 7 DESC, 3 ASC
  `;
}

function buildOwnerStatsOrderFilter({ startDate, kitchenId, status }) {
  return buildOrderAndClause({ startDate, kitchenId, status }, "o");
}

async function loadPropertyOwnerStats({ startDate, kitchenId, status }) {
  const orderFilter = buildOwnerStatsOrderFilter({ startDate, kitchenId, status });

  const ownerRows = await prisma.$queryRaw`
    SELECT
      hc."id",
      hc."name",
      hc."email",
      hc."phone",
      COUNT(DISTINCT kc."id")::int AS "contractCount",
      COUNT(DISTINCT o."id")::int AS "orderCount",
      COUNT(DISTINCT o."kitchenId")::int AS "kitchenCount",
      COALESCE(SUM(o."totalPrice"), 0) AS "totalRevenue",
      STRING_AGG(DISTINCT k."name", ', ' ORDER BY k."name") AS "kitchens"
    FROM "HousingCompany" hc
    LEFT JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
    LEFT JOIN "KitchenContract" kc ON kc."propertyObjectId" = pobj."id"
    LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    LEFT JOIN "Kitchen" k ON k."id" = o."kitchenId"
    GROUP BY hc."id"
    ORDER BY "totalRevenue" DESC, "orderCount" DESC, hc."name" ASC
  `;

  const itemRows = await prisma.$queryRaw`
    WITH ranked_items AS (
      SELECT
        hc."id" AS "ownerId",
        oi."code",
        oi."nameSnapshot",
        SUM(oi."quantity")::int AS "quantity",
        SUM(oi."quantity" * oi."priceSnapshot") AS "revenue",
        ROW_NUMBER() OVER (
          PARTITION BY hc."id"
          ORDER BY SUM(oi."quantity" * oi."priceSnapshot") DESC, SUM(oi."quantity") DESC
        ) AS rn
      FROM "HousingCompany" hc
      JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
      JOIN "KitchenContract" kc ON kc."propertyObjectId" = pobj."id"
      JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
      JOIN "OrderItem" oi ON oi."orderId" = o."id"
      GROUP BY hc."id", oi."code", oi."nameSnapshot"
    )
    SELECT "ownerId", "code", "nameSnapshot", "quantity", "revenue"
    FROM ranked_items
    WHERE rn = 1
  `;
  const topItemByOwnerId = new Map(itemRows.map((row) => [row.ownerId, row]));

  return ownerRows.map((owner) => {
    const totalRevenue = Number(owner.totalRevenue || 0);
    const orderCount = Number(owner.orderCount || 0);
    const topItem = topItemByOwnerId.get(owner.id);

    return {
      id: owner.id,
      name: owner.name || "",
      email: owner.email || "",
      phone: owner.phone || "",
      contractCount: Number(owner.contractCount || 0),
      orderCount,
      kitchenCount: Number(owner.kitchenCount || 0),
      kitchens: owner.kitchens || "",
      totalRevenue,
      averageOrderValue: orderCount ? totalRevenue / orderCount : 0,
      topItem: topItem
        ? {
            code: topItem.code || "",
            name: topItem.nameSnapshot || "",
            quantity: Number(topItem.quantity || 0),
            revenue: Number(topItem.revenue || 0),
          }
        : null,
    };
  });
}

async function hasKitchenItemArticleNumberColumn() {
  const rows = await prisma.$queryRaw`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'KitchenItem'
      AND column_name = 'articleNumber'
    LIMIT 1
  `;

  return rows.length > 0;
}

export default async function AdminDashboardPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const period = getPeriod(normalizeParam(params.period));
  const kitchenId = normalizeParam(params.kitchenId);
  const status = normalizeParam(params.status);
  const validStatus = ORDER_STATUSES.includes(status) ? status : "";
  const startDate = getPeriodStartDate(period);

  const dashboardFilters = { startDate, kitchenId, status: validStatus };
  const [kitchens, propertyOwnerStats, summary, dailyStatusRows, kitchenTimelineRows, paymentRows, geographyRows, groupedItemRows] = await Promise.all([
    listKitchensForAdmin(),
    loadPropertyOwnerStats({ startDate, kitchenId, status: validStatus }),
    loadDashboardSummary(dashboardFilters),
    loadDailyStatusRows(dashboardFilters),
    loadKitchenTimelineRows(dashboardFilters),
    loadPaymentRows(dashboardFilters),
    loadGeographyRows(dashboardFilters),
    loadGroupedItemRows(dashboardFilters),
  ]);
  const totalOrders = summary.totalOrders;
  const totalRevenue = summary.totalRevenue;
  const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const emailedOrders = summary.emailedOrders;
  const conversionRate = totalOrders ? (emailedOrders / totalOrders) * 100 : 0;

  const dateKeys = getDateKeys(startDate, summary.earliestCreatedAt);
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

  for (const row of dailyStatusRows) {
    const dateKey = toDateKey(row.date);
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
    dailyStatusByDate.get(dateKey)[row.status] = Number(row.count || 0);
  }

  for (const row of kitchenTimelineRows) {
    const dateKey = toDateKey(row.date);
    if (!timelineByDate.has(dateKey)) {
      timelineByDate.set(dateKey, kitchens.reduce(
        (row, kitchen) => {
          row[kitchen.name] = 0;
          return row;
        },
        { date: dateKey, label: formatDateLabel(dateKey) },
      ));
    }
    timelineByDate.get(dateKey)[row.kitchen] = Number(row.count || 0);
  }

  const itemStats = new Map();
  const typeSplit = new Map();
  for (const row of groupedItemRows) {
    const quantity = Number(row.quantity || 0);
    const revenue = Number(row.revenue || 0);
    const code = String(row.code || "").trim();
    const canonicalName = String(row.canonicalName || "").trim() || null;
    const fallbackName = String(row.nameSnapshot || "").trim() || "";
    const canonicalArticleNumber = String(row.articleNumber || "").trim() || ARTICLE_NUMBER_BY_CODE[code] || null;
    const grouping = getTopItemGrouping({ code, itemType: row.itemType, nameSnapshot: row.nameSnapshot }, canonicalArticleNumber);
    const existingItem = itemStats.get(grouping.groupKey) || {
      itemType: grouping.preferredItemType || row.itemType,
      code: grouping.preferredCode || code,
      canonicalName: null,
      fallbackName,
      canonicalArticleNumber: null,
      quantity: 0,
      revenue: 0,
    };
    existingItem.itemType = choosePreferredItemType(existingItem.itemType, row.itemType, grouping.preferredItemType);
    existingItem.code = grouping.preferredCode || choosePreferredText(existingItem.code, code);
    existingItem.canonicalName = grouping.preferredName || choosePreferredText(existingItem.canonicalName, canonicalName);
    existingItem.fallbackName = choosePreferredText(existingItem.fallbackName, fallbackName);
    existingItem.canonicalArticleNumber = choosePreferredText(existingItem.canonicalArticleNumber, canonicalArticleNumber);
    existingItem.quantity += quantity;
    existingItem.revenue += revenue;
    itemStats.set(grouping.groupKey, existingItem);

    const existingType = typeSplit.get(row.itemType) || { label: row.itemType, value: 0 };
    existingType.value += quantity;
    typeSplit.set(row.itemType, existingType);
  }

  const geographyStats = new Map();
  for (const row of geographyRows) {
    const country = deriveCountry(row);
    const city = String(row.city || "").trim() || "Not captured";
    const postalCode = String(row.postalCode || "").trim();
    const locationLabel = [city, postalCode].filter(Boolean).join(" ");
    const geographyKey = `${country}::${city.toLowerCase()}::${postalCode.toLowerCase()}`;
    const existingLocation = geographyStats.get(geographyKey) || {
      country,
      city,
      postalCode,
      label: `${locationLabel || city}, ${country}`,
      orders: 0,
      revenue: 0,
    };
    existingLocation.orders += Number(row.orders || 0);
    existingLocation.revenue += Number(row.revenue || 0);
    geographyStats.set(geographyKey, existingLocation);
  }

  const dailyStatusData = Array.from(dailyStatusByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const kitchenTimelineData = Array.from(timelineByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const resolvedItemStats = Array.from(itemStats.values()).map((item) => ({
    ...item,
    name: item.canonicalName || item.fallbackName || item.code || "",
    articleNumber: item.canonicalArticleNumber || null,
  }));
  const topItemsByQuantity = resolvedItemStats.slice().sort((a, b) => b.quantity - a.quantity);
  const topItemsByRevenue = resolvedItemStats.slice().sort((a, b) => b.revenue - a.revenue);
  const itemTypeData = Array.from(typeSplit.values()).sort((a, b) => b.value - a.value);
  const paymentData = paymentRows
    .map((row) => ({ label: row.label, value: Number(row.value || 0) }))
    .sort((a, b) => b.value - a.value);
  const geographyData = Array.from(geographyStats.values())
    .map((row) => ({
      ...row,
      orderShare: totalOrders ? (row.orders / totalOrders) * 100 : 0,
    }))
    .sort((a, b) => b.orders - a.orders);
  const kpis = [
    {
      labelKey: "dashboard.totalOrders",
      fallbackLabel: "Total orders",
      value: String(totalOrders),
      trendKey: "dashboard.createdInSelectedPeriod",
      trendFallback: "Created in the selected period",
    },
    {
      labelKey: "dashboard.totalRevenue",
      fallbackLabel: "Total revenue",
      value: formatCurrency(totalRevenue),
      trendKey: "dashboard.grossOrderValue",
      trendFallback: "Gross order value",
    },
    {
      labelKey: "dashboard.averageOrderValue",
      fallbackLabel: "Average order value",
      value: formatCurrency(averageOrderValue),
      trendKey: "dashboard.revenuePerOrder",
      trendFallback: "Revenue per order",
    },
    {
      labelKey: "dashboard.emailDispatchRate",
      fallbackLabel: "Email dispatch rate",
      value: formatPercent(conversionRate),
      trendKey: "dashboard.emailedOrdersOutOfTotal",
      trendFallback: "{emailed} emailed / {total} total",
      trendValues: { emailed: String(emailedOrders), total: String(totalOrders) },
    },
  ];

  return (
    <AdminShell adminEmail={admin.email}>
      <AdminDashboardCharts
        kpis={kpis}
        periodOptions={PERIOD_OPTIONS.map(({ value, labelKey, fallbackLabel }) => ({ value, labelKey, fallbackLabel }))}
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
        propertyOwnerStats={propertyOwnerStats}
      />
    </AdminShell>
  );
}
