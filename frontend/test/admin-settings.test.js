import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_LOGIN_VERIFICATION_ENABLED_KEY,
  getAdminLoginVerificationEnabled,
  parseBooleanSetting,
  parseIntegerSetting,
  setAdminLoginVerificationEnabled,
} from "../lib/admin-settings.js";

test("parseBooleanSetting defaults missing settings to false", () => {
  assert.equal(parseBooleanSetting(undefined), false);
  assert.equal(parseBooleanSetting(null), false);
});

test("parseBooleanSetting accepts common true and false values", () => {
  for (const value of ["true", "TRUE", "1", "yes", "on", true]) {
    assert.equal(parseBooleanSetting(value), true);
  }

  for (const value of ["false", "FALSE", "0", "no", "off", "", false]) {
    assert.equal(parseBooleanSetting(value), false);
  }
});

test("parseBooleanSetting uses caller default for unknown values", () => {
  assert.equal(parseBooleanSetting("unexpected", true), true);
  assert.equal(parseBooleanSetting("unexpected", false), false);
});

test("parseIntegerSetting accepts non-negative whole day values", () => {
  assert.equal(parseIntegerSetting("14", 0), 14);
  assert.equal(parseIntegerSetting("14.9", 0), 14);
  assert.equal(parseIntegerSetting("-1", 14), 14);
  assert.equal(parseIntegerSetting("unexpected", 14), 14);
});

test("admin login verification defaults to enabled", async () => {
  const client = {
    appSetting: {
      findUnique: async () => null,
    },
  };

  assert.equal(await getAdminLoginVerificationEnabled(client), true);
});

test("setAdminLoginVerificationEnabled stores boolean values", async () => {
  const writes = [];
  const client = {
    appSetting: {
      upsert: async (payload) => {
        writes.push(payload);
      },
    },
  };

  assert.equal(await setAdminLoginVerificationEnabled(false, client), false);
  assert.deepEqual(writes, [
    {
      where: { key: ADMIN_LOGIN_VERIFICATION_ENABLED_KEY },
      create: { key: ADMIN_LOGIN_VERIFICATION_ENABLED_KEY, value: "false" },
      update: { value: "false" },
    },
  ]);
});
