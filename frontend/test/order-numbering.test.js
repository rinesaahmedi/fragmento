import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderConfirmationEmailDraft } from "../lib/email/order-notifications.js";
import { buildNextContractOrderNumber } from "../lib/order-numbering.js";

test("first order number is the bare contract number", () => {
  assert.equal(buildNextContractOrderNumber("670105840", []), "670105840");
});

test("subsequent order numbers append the next numeric suffix", () => {
  assert.equal(
    buildNextContractOrderNumber("670105840", ["670105840"]),
    "670105840-1",
  );
  assert.equal(
    buildNextContractOrderNumber("670105840", ["670105840", "670105840-1"]),
    "670105840-2",
  );
});

test("next suffix uses the highest existing suffix and does not fill gaps", () => {
  assert.equal(
    buildNextContractOrderNumber("670105840", ["670105840", "670105840-2"]),
    "670105840-3",
  );
});

test("similar order number prefixes do not affect the contract sequence", () => {
  assert.equal(
    buildNextContractOrderNumber("123", ["1234", "1234-1", "123-1"]),
    "123-2",
  );
});

test("email confirmation subject uses the server order number", () => {
  const draft = buildOrderConfirmationEmailDraft({
    orderNumber: "670105840-1",
    customer: {
      contractNumber: "670105840",
      firstName: "Rinesa",
      lastName: "Ahmedi",
    },
    kitchen: {
      name: "AB 105840 Kitchen",
    },
  });

  assert.equal(draft.subject, "Bestellbestaetigung #670105840-1");
  assert.match(draft.bodyText, /Vertragsnummer: 670105840\./);
  assert.doesNotMatch(draft.bodyText, /Bestellte Kueche:/);
});
