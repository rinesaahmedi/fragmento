import assert from "node:assert/strict";
import test from "node:test";
import { formatAdminDate } from "../lib/admin-date-time.js";

test("admin timestamps preserve their stored wall-clock time", () => {
  const storedClaimTime = "2026-08-25T10:53:00.000Z";

  assert.equal(formatAdminDate(storedClaimTime, "en"), "25 August 2026, 10:53");
  assert.equal(formatAdminDate(storedClaimTime, "de"), "25. August 2026, 10:53");
});
