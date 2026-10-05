import assert from "node:assert/strict";
import test from "node:test";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { setImmediate as nextTurn } from "node:timers/promises";
import { observeOrderEmailSend, buildOrderEmailDelivery } from "../lib/email/order-email-observer.js";
import { getOrderEmailDatabaseUrl, attachOrderEmailDelivery } from "../lib/email/order-email-store.js";

// Use the installed Next runtime, including its real response-close lifecycle.
globalThis.AsyncLocalStorage ||= AsyncLocalStorage;
const require = createRequire(import.meta.url);
const { AfterContext } = require("next/dist/server/after/after-context.js");
const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");
const { scheduleOrderEmailAttempt } = await import("../lib/email/order-email-after.js");
const { sendOrderConfirmationEmail } = await import("../lib/email/order-notifications.js");
const nodemailer = require("nodemailer");

const recipients = { to: "customer@example.com", cc: "sender@example.com" };
function delivery(result, extra = {}) {
  return buildOrderEmailDelivery({ recipients, result, failed: false, attemptedAt: "2026-10-05T10:00:00Z", ...extra });
}

test("both, partial, missing evidence, and suppressed copies have distinct statuses", () => {
  assert.deepEqual(delivery({ accepted: ["CUSTOMER@example.com", { address: recipients.cc }] }).recipients.map((r) => r.status), ["SENT", "SENT"]);
  assert.deepEqual(delivery({ accepted: [recipients.to], rejected: [recipients.cc] }).recipients.map((r) => r.status), ["SENT", "FAILED"]);
  assert.deepEqual(delivery({ accepted: [recipients.cc], rejected: [recipients.to] }).recipients.map((r) => r.status), ["FAILED", "SENT"]);
  assert.deepEqual(delivery({}).recipients.map((r) => r.status), ["UNKNOWN", "UNKNOWN"]);
  assert.deepEqual(delivery({ accepted: [recipients.to] }, { recipients: { to: recipients.to } }).recipients.map((r) => r.status), ["SENT", "NOT_REQUIRED"]);
  assert.deepEqual(delivery(null, { failed: true }).recipients.map((r) => r.status), ["FAILED", "FAILED"]);
});

for (const mode of ["success", "reject", "hang"]) {
  test(`Next after: ${mode} in tracking starts only after the original response closes`, async (t) => {
    t.mock.method(console, "warn", () => {});
    let closeResponse;
    const background = [];
    const events = [];
    let release;
    const blocked = new Promise((resolve) => { release = resolve; });
    const afterContext = new AfterContext({
      waitUntil: (promise) => background.push(promise),
      onClose: (callback) => { closeResponse = callback; },
    });
    const receipt = { accepted: Object.values(recipients) };
    await workAsyncStorage.run({ afterContext }, async () => {
      const result = await observeOrderEmailSend({
        send: async () => { events.push("smtp"); return receipt; },
        buildAttempt: (input) => { events.push("metadata"); return delivery(input.result, input); },
        schedule: (build) => scheduleOrderEmailAttempt(build, {
          save: async () => {
            events.push("tracking");
            if (mode === "reject") throw new Error("Tracking unavailable");
            if (mode === "hang") await blocked;
          },
        }),
      });
      assert.strictEqual(result, receipt);
      events.push("confirmed");
      events.push("response");
    });
    await nextTurn();
    assert.deepEqual(events, ["smtp", "confirmed", "response"]);
    closeResponse();
    await nextTurn();
    assert.deepEqual(events, ["smtp", "confirmed", "response", "metadata", "tracking"]);
    release();
    await Promise.all(background);
  });
}

test("registration failure preserves the SMTP receipt and never retries sending", async () => {
  const receipt = { accepted: Object.values(recipients) };
  let calls = 0;
  assert.strictEqual(await observeOrderEmailSend({
    send: async () => { calls += 1; return receipt; },
    schedule: () => { throw new Error("No request context"); },
    buildAttempt: () => assert.fail("metadata must stay deferred"),
  }), receipt);
  assert.equal(calls, 1);
});

test("original SMTP error is preserved even if registration fails", async () => {
  const error = new Error("Original SMTP failure");
  await assert.rejects(observeOrderEmailSend({
    send: async () => { throw error; },
    schedule: () => { throw new Error("Tracking unavailable"); },
  }), (actual) => actual === error);
});

test("deferred metadata errors do not reach the original caller", async (t) => {
  t.mock.method(console, "warn", () => {});
  let callback;
  const receipt = {};
  const result = await observeOrderEmailSend({
    send: async () => receipt,
    buildAttempt: () => { throw new Error("Invalid tracking metadata"); },
    schedule: (build) => scheduleOrderEmailAttempt(build, { defer: (task) => { callback = task; }, save: () => assert.fail("must not save") }),
  });
  assert.strictEqual(result, receipt);
  await callback();
});

test("tracking gets bounded connection settings without changing the application URL", () => {
  const original = "postgresql://test:test@localhost:5432/test?connection_limit=8&schema=public";
  const tracking = new URL(getOrderEmailDatabaseUrl(original));
  assert.equal(tracking.searchParams.get("connection_limit"), "1");
  assert.equal(tracking.searchParams.get("pool_timeout"), "2");
  assert.equal(tracking.searchParams.get("schema"), "public");
  assert.equal(new URL(original).searchParams.get("connection_limit"), "8");
});

test("dashboard preserves legacy data and remains usable when tracking is unavailable", async () => {
  const orders = [{ id: "a", confirmationEmailDelivery: { recipients: [] } }, null];
  const client = { $transaction: async () => { throw new Error("Missing table or database unavailable"); } };
  assert.strictEqual(await attachOrderEmailDelivery(orders, "live", client), orders);
});

test("dashboard attaches recorded recipient statuses without changing order status", async () => {
  const record = delivery({ accepted: Object.values(recipients) });
  const client = { $transaction: async (run) => run({
    $executeRaw: async () => 0,
    $queryRaw: async () => [{ orderId: "a", delivery: record }],
  }) };
  const orders = [{ id: "a", status: "CONFIRMED" }, { id: "b", status: "NEW" }];
  const result = await attachOrderEmailDelivery(orders, "live", client);
  assert.deepEqual(result[0].confirmationEmailDelivery, record);
  assert.equal(result[0].status, "CONFIRMED");
  assert.equal(result[1].confirmationEmailDelivery, null);
  assert.equal(Object.hasOwn(orders[0], "confirmationEmailDelivery"), false);
});

for (const scenario of ["both", "partial", "failure", "test-copy-suppressed"]) {
  test(`real sender + Next after + storage wiring: ${scenario}`, async (t) => {
    const originalEnvironment = { ...process.env };
    const previousClient = globalThis.orderEmailTrackingPrisma;
    t.after(() => {
      for (const key of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_SECURE"]) {
        if (Object.hasOwn(originalEnvironment, key)) process.env[key] = originalEnvironment[key];
        else delete process.env[key];
      }
      if (previousClient) globalThis.orderEmailTrackingPrisma = previousClient;
      else delete globalThis.orderEmailTrackingPrisma;
    });
    Object.assign(process.env, {
      SMTP_HOST: "smtp.example.invalid", SMTP_PORT: "587", SMTP_USER: "audit",
      SMTP_PASS: "audit-only", SMTP_FROM: recipients.cc, SMTP_SECURE: "false",
    });
    const mails = [];
    const saved = [];
    globalThis.orderEmailTrackingPrisma = {
      $transaction: async (run) => run({
        $executeRaw: async (strings, ...values) => {
          if (strings.join("?").includes('INSERT INTO "OrderEmailAttempt"')) saved.push({ kind: values[2], delivery: JSON.parse(values[4]) });
          return 1;
        },
      }),
    };
    const suppressed = scenario === "test-copy-suppressed";
    const receipt = {
      accepted: scenario === "partial" || suppressed ? [recipients.to] : Object.values(recipients),
      rejected: scenario === "partial" ? [recipients.cc] : [],
      messageId: "audit-message",
    };
    t.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async (mail) => {
        mails.push(mail);
        if (scenario === "failure") throw new Error("SMTP rejected recipients");
        return receipt;
      },
    }));
    let closeResponse;
    const background = [];
    const afterContext = new AfterContext({ waitUntil: (p) => background.push(p), onClose: (cb) => { closeResponse = cb; } });
    const order = {
      id: "fixture", orderNumber: suppressed ? "111123456-1" : "123456-1",
      createdAt: "2026-10-05T10:00:00Z", total: 100,
      kitchen: { slug: "audit-only", name: "Audit" },
      customer: { email: recipients.to, contractNumber: suppressed ? "111123456" : "123456", firstName: "Audit", lastName: "Fixture" },
      components: [], accessories: [], services: [],
    };
    await workAsyncStorage.run({ afterContext }, async () => {
      const sending = sendOrderConfirmationEmail({
        order, pdfBase64: Buffer.from("audit attachment").toString("base64"), pdfFilename: "audit.pdf",
        subject: "Unchanged subject", bodyText: "Unchanged body", excludedAttachmentKeys: ["purchased-kitchen"],
      });
      if (scenario === "failure") await assert.rejects(sending, /Email sending failed.*SMTP rejected recipients/);
      else assert.strictEqual(await sending, receipt);
      assert.equal(saved.length, 0, "no database write during the original request");
    });
    assert.equal(mails.length, 1);
    assert.equal(mails[0].to, recipients.to);
    assert.equal(mails[0].cc, suppressed ? undefined : recipients.cc);
    assert.equal(mails[0].subject, "Unchanged subject");
    assert.match(mails[0].html, /Unchanged body/);
    assert.equal(mails[0].attachments[0].filename, "audit.pdf");
    closeResponse();
    await Promise.all(background);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].kind, suppressed ? "test" : "live");
    const expected = scenario === "failure" ? ["FAILED", "FAILED"]
      : scenario === "partial" ? ["SENT", "FAILED"]
        : suppressed ? ["SENT", "NOT_REQUIRED"] : ["SENT", "SENT"];
    assert.deepEqual(saved[0].delivery.recipients.map((r) => r.status), expected);
  });
}
