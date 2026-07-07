import { prisma } from "./prisma.js";
import { PUBLIC_VISIT_EVENT_TYPES } from "./public-visit-tracking.js";

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
    const visitorKey = [event.ipHash, event.userAgentHash].filter(Boolean).join(":");
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

export async function loadPublicVisitReportData(filters = {}) {
  const events = await prisma.publicVisitEvent.findMany({
    where: getVisitReportWhere(filters),
    orderBy: { createdAt: "desc" },
  });

  return {
    events,
    summary: calculatePublicVisitSummary(events),
  };
}
