import { prisma } from "./prisma.js";
import { PUBLIC_VISIT_EVENT_TYPES } from "./public-visit-tracking.js";

const CONTRACT_ACCESS_EVENT_TYPES = [
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED,
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED,
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED,
];

function normalizeDateFilter(value) {
  const normalized = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

export function normalizePublicVisitReportFilters(input = {}) {
  return {
    dateFrom: normalizeDateFilter(input.dateFrom),
    dateTo: normalizeDateFilter(input.dateTo),
  };
}

function getVisitReportWhere(filters = {}) {
  const where = {};

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  return where;
}

export function calculatePublicVisitSummary(events = []) {
  const summary = {
    uniqueVisitors: 0,
    opened: 0,
    submitted: 0,
    accepted: 0,
    testAccepted: 0,
    rejected: 0,
    successRate: 0,
  };
  const visitorKeys = new Set();

  for (const event of events) {
    const visitorKey = event.visitorKey || [event.ipHash, event.userAgentHash].filter(Boolean).join(":");
    if (visitorKey) visitorKeys.add(visitorKey);

    switch (event.eventType) {
      case PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED:
        summary.opened += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.CONTRACT_SUBMITTED:
        summary.submitted += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED:
        summary.accepted += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED:
        summary.testAccepted += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED:
        summary.rejected += 1;
        break;
      default:
        break;
    }
  }

  summary.successRate = summary.submitted
    ? (summary.accepted / summary.submitted) * 100
    : 0;
  summary.uniqueVisitors = visitorKeys.size;

  return summary;
}

function incrementCount(map, key) {
  const normalizedKey = String(key || "").trim() || "unknown";
  map.set(normalizedKey, (map.get(normalizedKey) || 0) + 1);
}

function countRows(map, keyName) {
  return Array.from(map.entries())
    .map(([key, count]) => ({ [keyName]: key, count }))
    .sort((a, b) => b.count - a.count || String(a[keyName]).localeCompare(String(b[keyName])));
}

export function calculatePublicVisitBreakdowns(events = []) {
  const countries = new Map();
  const sources = new Map();
  const devices = new Map();

  for (const event of events) {
    if (event.eventType !== PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED) continue;

    incrementCount(countries, event.countryCode);
    incrementCount(sources, event.source || event.referrerHost || "direct");
    incrementCount(devices, event.deviceType);
  }

  const contractEventTypes = new Set(CONTRACT_ACCESS_EVENT_TYPES);

  return {
    countries: countRows(countries, "countryCode"),
    sources: countRows(sources, "source"),
    devices: countRows(devices, "deviceType"),
    recentContractEvents: events.filter((event) => contractEventTypes.has(event.eventType)).slice(0, 100),
  };
}

export async function loadRecentContractAccessData(filters = {}) {
  return prisma.publicVisitEvent.findMany({
    where: {
      ...getVisitReportWhere(filters),
      eventType: { in: CONTRACT_ACCESS_EVENT_TYPES },
    },
    include: {
      kitchenContract: {
        select: {
          id: true,
          contractNumber: true,
          kitchen: { select: { id: true, name: true, slug: true } },
          project: {
            select: {
              id: true,
              name: true,
              housingCompany: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function loadPublicVisitReportData(filters = {}) {
  const events = await prisma.publicVisitEvent.findMany({
    where: getVisitReportWhere(filters),
    include: {
      kitchenContract: {
        select: {
          id: true,
          contractNumber: true,
          kitchen: { select: { id: true, name: true, slug: true } },
          project: {
            select: {
              id: true,
              name: true,
              housingCompany: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    events,
    summary: calculatePublicVisitSummary(events),
    ...calculatePublicVisitBreakdowns(events),
  };
}
