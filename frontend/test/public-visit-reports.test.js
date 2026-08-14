import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePublicVisitBreakdowns,
  calculatePublicVisitSummary,
  calculateServiceVisitSummary,
} from "../lib/public-visit-reports.js";
import {
  getCoarseDeviceData,
  hasPublicTrackingOptOut,
  normalizeCountryCode,
  normalizeReferrerHost,
  PUBLIC_VISIT_EVENT_TYPES,
  SERVICE_PAGE_PATH,
} from "../lib/public-visit-tracking.js";

function event(eventType, visitor = "visitor-a", extra = {}) {
  return {
    eventType,
    ipHash: visitor,
    userAgentHash: "browser",
    ...extra,
  };
}

test("public visit summary counts contract funnel events", () => {
  const summary = calculatePublicVisitSummary([
    event(PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED),
    event(PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED, "visitor-b"),
    event(PUBLIC_VISIT_EVENT_TYPES.CONTRACT_SUBMITTED),
    event(PUBLIC_VISIT_EVENT_TYPES.CONTRACT_SUBMITTED),
    event(PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED),
    event(PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED),
  ]);

  assert.equal(summary.opened, 2);
  assert.equal(summary.uniqueVisitors, 2);
  assert.equal(summary.submitted, 2);
  assert.equal(summary.accepted, 1);
  assert.equal(summary.rejected, 1);
  assert.equal(summary.successRate, 50);
});

test("public visit success rate is zero when no contracts were submitted", () => {
  const summary = calculatePublicVisitSummary([
    event(PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED),
  ]);

  assert.equal(summary.successRate, 0);
});

test("test contract accepts do not count as worked", () => {
  const summary = calculatePublicVisitSummary([
    event(PUBLIC_VISIT_EVENT_TYPES.CONTRACT_SUBMITTED),
    event(PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED),
  ]);

  assert.equal(summary.submitted, 1);
  assert.equal(summary.accepted, 0);
  assert.equal(summary.testAccepted, 1);
  assert.equal(summary.rejected, 0);
  assert.equal(summary.successRate, 0);
});

test("privacy-first visit breakdowns use page opens only", () => {
  const events = [
    { ...event(PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED), countryCode: "DE", source: "qr", deviceType: "mobile" },
    { ...event(PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED, "visitor-b"), countryCode: "DE", referrerHost: "google.com", deviceType: "desktop" },
    { ...event(PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED), countryCode: "AT", source: "qr", deviceType: "mobile" },
  ];
  const breakdowns = calculatePublicVisitBreakdowns(events);

  assert.deepEqual(breakdowns.countries, [{ countryCode: "DE", count: 2 }]);
  assert.deepEqual(breakdowns.sources, [
    { source: "google.com", count: 1 },
    { source: "qr", count: 1 },
  ]);
  assert.equal(breakdowns.recentContractEvents.length, 1);
});

test("service visit summary is path-scoped and counts claim funnel", () => {
  const summary = calculateServiceVisitSummary([
    event(PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED, "visitor-a", { path: SERVICE_PAGE_PATH }),
    event(PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED, "visitor-b", { path: SERVICE_PAGE_PATH }),
    event(PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED, "visitor-home", { path: "/" }),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_LOOKUP),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_LOOKUP),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND, "visitor-a", { metadata: { orderKind: "test" } }),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CLAIM_SUBMITTED),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CLAIM_SUBMITTED, "visitor-a", { metadata: { orderKind: "test" } }),
  ]);

  assert.equal(summary.opened, 2);
  assert.equal(summary.uniqueVisitors, 2);
  assert.equal(summary.lookups, 2);
  assert.equal(summary.found, 2);
  assert.equal(summary.notFound, 1);
  assert.equal(summary.claimsSubmitted, 2);
  assert.equal(summary.testLookups, 1);
});

test("service visit summary ignores junk placeholder lookups", () => {
  const summary = calculateServiceVisitSummary([
    event(PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED, "visitor-a", { path: SERVICE_PAGE_PATH }),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_LOOKUP, "visitor-a", {
      contractNumberLast4: "ined",
      kitchenContractId: null,
    }),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND, "visitor-a", {
      contractNumberLast4: "ined",
      kitchenContractId: null,
    }),
    event(PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND, "visitor-a", {
      contractNumberLast4: "8888",
      kitchenContractId: null,
    }),
  ]);

  assert.equal(summary.opened, 1);
  assert.equal(summary.lookups, 0);
  assert.equal(summary.notFound, 1);
});

test("tracking helpers keep only coarse and validated values", () => {
  assert.equal(normalizeCountryCode(" de "), "DE");
  assert.equal(normalizeCountryCode("Germany"), null);
  assert.equal(normalizeReferrerHost("https://www.google.com/search?q=contract"), "google.com");
  assert.deepEqual(
    getCoarseDeviceData("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1"),
    { deviceType: "mobile", browserFamily: "Safari", operatingSystem: "iOS" },
  );
});

test("general page analytics honors browser privacy signals", () => {
  const request = { headers: new Headers({ dnt: "1" }) };
  assert.equal(hasPublicTrackingOptOut(request), true);
});
