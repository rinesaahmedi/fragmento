import assert from "node:assert/strict";
import test from "node:test";

import { resolveServiceClaimEmailRecipient } from "../lib/service-claim-email-recipient.js";

const env = {
  SERVICE_REQUEST_EMAIL: "315@example.com",
  SERVICE_REQUEST_OTHER_EMAIL: "kd@myarchitecto.de",
};

test("routes 111 contract claims to the existing service request recipient", () => {
  assert.equal(resolveServiceClaimEmailRecipient("111123456", env), "315@example.com");
  assert.equal(resolveServiceClaimEmailRecipient(" 111 123 456 ", env), "315@example.com");
});

test("routes all other contract claims to the other-contract recipient", () => {
  assert.equal(resolveServiceClaimEmailRecipient("670123456", env), "kd@myarchitecto.de");
  assert.equal(resolveServiceClaimEmailRecipient("ARC-123", env), "kd@myarchitecto.de");
});

test("does not fall back to the 111 recipient when the other-contract recipient is missing", () => {
  assert.equal(
    resolveServiceClaimEmailRecipient("670123456", {
      SERVICE_REQUEST_EMAIL: "315@example.com",
    }),
    "",
  );
});
