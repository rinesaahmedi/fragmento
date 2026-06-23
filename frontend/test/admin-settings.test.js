import assert from "node:assert/strict";
import test from "node:test";
import { parseBooleanSetting } from "../lib/admin-settings.js";

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
