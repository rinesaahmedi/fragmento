import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderCancellationInternalHtml } from "../lib/email/order-cancellation-notifications.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formPath = path.join(__dirname, "..", "components", "order-cancellation-form.jsx");
const footerPath = path.join(__dirname, "..", "components", "public-legal-footer.js");
const cancellationPath = path.join(__dirname, "..", "lib", "order-cancellations.js");
const cancellationEmailPath = path.join(__dirname, "..", "lib", "email", "order-cancellation-notifications.js");
const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");

test("public footer exposes the withdrawal form", () => {
  const source = fs.readFileSync(footerPath, "utf8");

  assert.match(source, /href=\{`\/widerruf\?lang=/);
  assert.match(source, /public-legal-footer__link--withdraw/);
  assert.match(source, /\{copy\.withdraw\}/);
});

test("withdrawal form contains the model form fields", () => {
  const source = fs.readFileSync(formPath, "utf8");

  assert.match(source, /name="productDescription"/);
  assert.match(source, /name="orderedOn" type="date"/);
  assert.match(source, /name="receivedOn" type="date"/);
  for (const field of ["firstName", "lastName", "street", "city", "postalCode"]) {
    assert.match(source, new RegExp(`name="${field}"[^>]*required`));
  }
  assert.doesNotMatch(source, /name="reason"/);
  assert.match(source, /architecto by KA GmbH/);
  assert.match(source, /Senefelderstraße 2b/);
  assert.doesNotMatch(source, /withdrawal-model-declaration|subjectHelp|customerHelp|dateHelp|onlineDetailsHelp/);
  assert.doesNotMatch(source, /paperSignature|withdrawal-paper-signature/);
  assert.doesNotMatch(source, /withdrawal-online-details|onlineDetailsTitle/);
  assert.doesNotMatch(source, /Delete as appropriate|Unzutreffendes streichen|notApplicable/);
  assert.doesNotMatch(source, /withdrawal-form-section__number/);
  assert.match(source, /Withdrawal details/);
  assert.match(source, /Your details/);
  assert.match(source, /I\/We \(\*\)/);
  assert.match(source, /We will notify you by email after the review\./);
  assert.doesNotMatch(source, /The order has not yet been marked as cancelled\./);
});

test("withdrawal fields are validated and persisted", () => {
  const cancellationSource = fs.readFileSync(cancellationPath, "utf8");
  const schemaSource = fs.readFileSync(schemaPath, "utf8");

  for (const field of ["productDescription", "orderedOn", "receivedOn", "consumerAddress"]) {
    assert.match(cancellationSource, new RegExp(`\\b${field}\\b`));
    assert.match(schemaSource, new RegExp(`\\b${field}\\b`));
  }
  assert.doesNotMatch(cancellationSource, /Reason is required/);
});

test("withdrawal receipt email uses a structured card and details table", () => {
  const source = fs.readFileSync(cancellationEmailPath, "utf8");

  assert.match(source, /function renderReceiptHtml/);
  assert.match(source, /function renderDetailRows/);
  assert.match(source, /role="presentation"/);
  assert.match(source, /Withdrawal details/);
  assert.match(source, /What happens next\?/);
  assert.match(source, /Withdrawal confirmation – Contract/);
  assert.match(source, /Withdrawal reference/);
});

test("customer withdrawal emails are always sent in German", () => {
  const emailSource = fs.readFileSync(cancellationEmailPath, "utf8");
  const cancellationSource = fs.readFileSync(cancellationPath, "utf8");

  assert.match(emailSource, /sendCancellationReceiptEmail\(request\)[\s\S]*const language = "de"/);
  assert.match(emailSource, /sendCancellationDecisionEmail\(request\)[\s\S]*const language = "de"/);
  assert.match(cancellationSource, /sendCancellationReceiptEmail\(request\)/);
  assert.doesNotMatch(cancellationSource, /sendCancellationReceiptEmail\(request, request\.language\)/);
});

test("withdrawal identifiers include the contract number", () => {
  const source = fs.readFileSync(cancellationPath, "utf8");

  assert.match(source, /`OC-\$\{contractPart\}-\$\{randomBytes\(3\)/);
  assert.match(source, /buildReferenceNumber\(submittedContractNumber\)/);
});

test("internal notice has a complete, escaped table of confirmed withdrawal data", () => {
  const html = renderCancellationInternalHtml({
    referenceNumber: "OC-TEST-123",
    submittedContractNumber: "111544778",
    consumerName: "Max <Muster>",
    consumerAddress: "Teststraße 2b, Braunschweig",
    confirmationEmail: "kunde@example.com",
    productDescription: "Küche & Aufbau",
    orderedOn: new Date("2026-09-14T00:00:00.000Z"),
    receivedOn: new Date("2026-09-15T00:00:00.000Z"),
    reason: "Freiwilliger Grund",
    declarationText: "Ich widerrufe den Vertrag.",
    receivedAt: new Date("2026-09-15T07:55:28.000Z"),
    orderId: null,
  });
  assert.match(html, /<table[\s\S]*<\/table>/);
  for (const label of [
    "Vertragsnummer", "Name des Verbrauchers", "Anschrift", "E-Mail-Adresse",
    "Waren / Dienstleistung", "Bestellt am", "Erhalten am", "Grund des Widerrufs",
    "Widerrufserklärung", "Eingang (Datum und Uhrzeit)",
  ]) assert.ok(html.includes(label), label);
  for (const value of ["111544778", "kunde@example.com", "Freiwilliger Grund", "Ich widerrufe den Vertrag."]) {
    assert.ok(html.includes(value), value);
  }
  assert.match(html, /09:55:28/);
  assert.match(html, /Max &lt;Muster&gt;/);
  assert.match(html, /Küche &amp; Aufbau/);
});

test("withdrawal recipient is configured separately from the admin email", () => {
  const source = fs.readFileSync(cancellationEmailPath, "utf8");
  const localEnv = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
  const productionEnv = fs.readFileSync(path.join(__dirname, "..", ".env.production"), "utf8");
  assert.match(source, /process\.env\.ORDER_CANCELLATION_EMAIL/);
  assert.doesNotMatch(source, /ADMIN_EMAIL/);
  assert.match(localEnv, /^ORDER_CANCELLATION_EMAIL="01primex\.eu@gmail\.com"$/m);
  assert.match(productionEnv, /^ORDER_CANCELLATION_EMAIL="info@myarchitecto\.de"$/m);
});
