import assert from "node:assert/strict";
import test from "node:test";
import { getContractNumberStickyState } from "../lib/service-claim-sticky.js";

test("enters sticky mode only after the sentinel clearly crosses the top threshold", () => {
  assert.equal(
    getContractNumberStickyState({
      currentIsStuck: false,
      sentinelTop: 10,
    }),
    false,
  );

  assert.equal(
    getContractNumberStickyState({
      currentIsStuck: false,
      sentinelTop: 6,
    }),
    true,
  );
});

test("stays sticky through minor movement near the threshold", () => {
  assert.equal(
    getContractNumberStickyState({
      currentIsStuck: true,
      sentinelTop: 20,
    }),
    true,
  );
});

test("exits sticky mode only after moving well below the threshold", () => {
  assert.equal(
    getContractNumberStickyState({
      currentIsStuck: true,
      sentinelTop: 31,
    }),
    false,
  );
});

test("falls back to not stuck when sentinel position is invalid", () => {
  assert.equal(
    getContractNumberStickyState({
      currentIsStuck: true,
      sentinelTop: Number.NaN,
    }),
    false,
  );
});
