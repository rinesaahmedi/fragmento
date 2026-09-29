import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(projectDir, ".env") });

const base = process.argv[2] || "http://localhost:3001";
const customerEmail = String(process.env.SMTP_USER || "").trim();
const internalEmail = String(process.env.ORDER_CANCELLATION_EMAIL || "").trim();
assert.ok(customerEmail && internalEmail, "A configured customer test mailbox and internal recipient are required.");
const contractNumber = `CODEX-TEST-WIDERRUF-${Date.now()}`;
const requestData = {
  contractNumber,
  productDescription: "LOKALER TEST – keine echte Bestellung oder Vertragskündigung",
  orderedOn: "2026-09-14",
  receivedOn: "2026-09-15",
  firstName: "Codex",
  lastName: "Test",
  street: "Teststraße 1",
  city: "Teststadt",
  postalCode: "12345",
  email: customerEmail,
  reason: "Technischer Test des Widerruf-Prozesses",
  language: "en",
};

console.log(`Client recipient: ${customerEmail}`);
console.log(`Configured internal recipient: ${internalEmail}`);
const response = await fetch(`${base}/api/order-cancellations`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(requestData),
});
const result = await response.json();
console.log(`API status: ${response.status}`);
console.log(`API result: ${JSON.stringify(result)}`);
if (!response.ok || !result.referenceNumber) process.exitCode = 1;

const prisma = new PrismaClient();
try {
  const saved = await prisma.orderCancellationRequest.findFirst({
    where: { submittedContractNumber: contractNumber },
    orderBy: { createdAt: "desc" },
  });
  if (!saved) throw new Error("The test request was not found in the database.");
  console.log(`Database record: ${JSON.stringify({
    id: saved.id,
    referenceNumber: saved.referenceNumber,
    orderId: saved.orderId,
    submittedContractNumber: saved.submittedContractNumber,
    productDescription: saved.productDescription,
    orderedOn: saved.orderedOn,
    receivedOn: saved.receivedOn,
    consumerName: saved.consumerName,
    consumerAddress: saved.consumerAddress,
    confirmationEmail: saved.confirmationEmail,
    reason: saved.reason,
    declarationText: saved.declarationText,
    language: saved.language,
    status: saved.status,
    receivedAt: saved.receivedAt,
    customerEmailStatus: saved.customerEmailStatus,
    customerEmailSentAt: saved.customerEmailSentAt,
    internalEmailStatus: saved.internalEmailStatus,
    internalEmailSentAt: saved.internalEmailSentAt,
    lastEmailError: saved.lastEmailError,
  })}`);
  assert.equal(saved.confirmationEmail, customerEmail.toLowerCase());
  assert.equal(saved.status, "RECEIVED");
  assert.ok(saved.declarationText.startsWith("Ich,"), "English forms must get a German declaration by email.");
  assert.ok(saved.receivedAt && saved.productDescription && saved.consumerAddress);
  assert.equal(saved.customerEmailStatus, "SENT");
  assert.equal(saved.internalEmailStatus, "SENT");
  assert.ok(saved.customerEmailSentAt && saved.internalEmailSentAt);
  assert.equal(result.notificationPending, false);
  console.log("Both separate SMTP deliveries were accepted and persisted as SENT.");
} finally {
  await prisma.$disconnect();
}
