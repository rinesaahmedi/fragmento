import assert from "node:assert/strict";
import test from "node:test";
import { calculatePublicVisitSummary } from "../lib/public-visit-reports.js";
import { PUBLIC_VISIT_EVENT_TYPES } from "../lib/public-visit-tracking.js";

function event(eventType, visitor = "visitor-a") {
  return {
    eventType,
    ipHash: visitor,
    userAgentHash: "browser",
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
