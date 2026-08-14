import assert from "node:assert/strict";
import test from "node:test";
import {
  isJunkServiceClaimVisitEvent,
  isServiceClaimContractLookupReady,
  normalizeServiceClaimContractNumber,
  SERVICE_CLAIM_LOOKUP_MIN_LENGTH,
} from "../lib/service-claim-lookup.js";

test("normalizeServiceClaimContractNumber strips spaces", () => {
  assert.equal(normalizeServiceClaimContractNumber(" 670 888 888 "), "670888888");
});

test("lookup readiness rejects placeholders and short input", () => {
  assert.equal(isServiceClaimContractLookupReady(""), false);
  assert.equal(isServiceClaimContractLookupReady("undefined"), false);
  assert.equal(isServiceClaimContractLookupReady("null"), false);
  assert.equal(isServiceClaimContractLookupReady("670"), false);
  assert.equal(isServiceClaimContractLookupReady("67088"), false);
  assert.equal(isServiceClaimContractLookupReady("670888"), false);
  assert.equal(isServiceClaimContractLookupReady("6708888"), false);
  assert.equal(SERVICE_CLAIM_LOOKUP_MIN_LENGTH, 8);
  assert.equal(isServiceClaimContractLookupReady("67088888"), true);
  assert.equal(isServiceClaimContractLookupReady("670888888"), true);
  assert.equal(isServiceClaimContractLookupReady("111000001"), true);
});

test("junk visit events match placeholder last4 without linked contract", () => {
  assert.equal(
    isJunkServiceClaimVisitEvent({ contractNumberLast4: "ined", kitchenContractId: null }),
    true,
  );
  assert.equal(
    isJunkServiceClaimVisitEvent({ contractNumberLast4: "null", kitchenContractId: null }),
    true,
  );
  assert.equal(
    isJunkServiceClaimVisitEvent({ contractNumberLast4: "ined", kitchenContractId: "kc_1" }),
    false,
  );
  assert.equal(
    isJunkServiceClaimVisitEvent({ contractNumberLast4: "8888", kitchenContractId: null }),
    false,
  );
});
