import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildAscAccessReport,
  buildContractAccessReport,
  getContractAccessReportWindow,
} from "../lib/email/contract-access-report.js";
import { PUBLIC_VISIT_EVENT_TYPES } from "../lib/public-visit-tracking.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));

test("daily contract report covers exactly the previous 24 hours", () => {
  const end = new Date("2026-09-16T06:00:00.000Z");
  const window = getContractAccessReportWindow(end);

  assert.equal(window.end.toISOString(), "2026-09-16T06:00:00.000Z");
  assert.equal(window.start.toISOString(), "2026-09-15T06:00:00.000Z");
});

test("daily contract report contains complete attempted numbers and outcomes", () => {
  const report = buildContractAccessReport({
    start: new Date("2026-09-15T06:00:00.000Z"),
    end: new Date("2026-09-16T06:00:00.000Z"),
    events: [
      {
        createdAt: new Date("2026-09-16T05:30:00.000Z"),
        eventType: PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED,
        contractNumber: "334123456",
        countryCode: "DE",
        source: "direct",
        deviceType: "mobile",
      },
      {
        createdAt: new Date("2026-09-16T05:00:00.000Z"),
        eventType: PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED,
        kitchenContract: { contractNumber: "670103898" },
      },
    ],
  });

  assert.match(report.subject, /\(2\)$/);
  assert.match(report.html, /334123456/);
  assert.match(report.html, /670103898/);
  assert.match(report.html, /Rejected/);
  assert.match(report.html, /Accepted/);
  assert.match(report.subject, /Contract access attempts in the last 24 hours/);
  assert.match(report.html, /<html lang="en">/);
  assert.match(report.html, /Contract number/);
  assert.match(report.text, /Access attempts: 2/);
  assert.match(report.text, /16 Sept 2026/);
});

test("empty daily report uses English in both email formats", () => {
  const report = buildContractAccessReport({
    start: new Date("2026-09-15T06:00:00.000Z"),
    end: new Date("2026-09-16T06:00:00.000Z"),
  });

  assert.match(report.html, /No access attempts during this period\./);
  assert.match(report.text, /No access attempts during this period\./);
});

test("ASC report contains complete attempted numbers and lookup outcomes", () => {
  const report = buildAscAccessReport({
    start: new Date("2026-09-16T06:00:00.000Z"),
    end: new Date("2026-09-17T06:00:00.000Z"),
    events: [
      {
        createdAt: new Date("2026-09-17T05:30:00.000Z"),
        eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
        contractNumber: "670999999",
      },
      {
        createdAt: new Date("2026-09-17T05:00:00.000Z"),
        eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND,
        kitchenContract: { contractNumber: "670103898" },
      },
      {
        createdAt: new Date("2026-09-17T04:30:00.000Z"),
        eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
        contractNumber: "__monitor_probe_not_found__",
        contractNumberLast4: "nd__",
      },
    ],
  });

  assert.match(report.subject, /ASC contract lookups in the last 24 hours \(2\)/);
  assert.match(report.html, /670999999/);
  assert.match(report.html, /670103898/);
  assert.match(report.html, /Not found/);
  assert.match(report.html, /Found/);
  assert.doesNotMatch(report.html, /monitor_probe_not_found/);
});

test("Hetzner deployment owns the 08:00 Europe-Berlin schedule", () => {
  const workflow = fs.readFileSync(
    path.join(testDir, "..", "..", ".github", "workflows", "deploy-hetzner.yml"),
    "utf8",
  );

  assert.match(workflow, /OnCalendar=\*-\*-\* 08:00:00 Europe\/Berlin/);
  assert.match(workflow, /Environment=CONTRACT_ACCESS_REPORT_ENABLED=true/);
  assert.match(workflow, /EnvironmentFile=\/etc\/fragmento-contract-access-report\.env/);
  assert.match(workflow, /Fragmento daily contract and ASC access reports/);
  assert.match(
    workflow,
    /Environment=CONTRACT_ACCESS_REPORT_EMAIL=it@forestdream\.de,334primex\.eu@gmail\.com,01primex\.eu@gmail\.com/,
  );
  assert.match(workflow, /systemctl enable --now fragmento-contract-access-report\.timer/);
});
