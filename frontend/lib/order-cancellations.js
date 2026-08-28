import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { cancelOrderPayment } from "./stripe-payments";
import {
  sendCancellationDecisionEmail,
  sendCancellationInternalEmail,
  sendCancellationReceiptEmail,
} from "./email/order-cancellation-notifications";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OrderCancellationRequestStatus = {
  RECEIVED: "RECEIVED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function requiredString(value, label, maxLength) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  if (!normalized) throw validationError(`${label} is required.`);
  if (normalized.length > maxLength) throw validationError(`${label} is too long.`);
  return normalized;
}

function optionalString(value, maxLength) {
  const normalized = String(value || "").trim();
  if (normalized.length > maxLength) throw validationError("The provided text is too long.");
  return normalized;
}

function normalizeComparable(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
}

function normalizeContractNumber(value) {
  return requiredString(value, "Contract number", 80).replace(/\s+/g, "").toUpperCase();
}

function normalizeEmail(value) {
  const email = requiredString(value, "Email", 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw validationError("Please enter a valid email address.");
  return email;
}

function normalizeLanguage(value) {
  return String(value || "").toLowerCase() === "en" ? "en" : "de";
}

function buildReferenceNumber(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `WD-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function namesMatch(order, submittedName) {
  return normalizeComparable(`${order.firstName} ${order.lastName}`) === normalizeComparable(submittedName);
}

function buildDeclaration({ consumerName, submittedContractNumber, language }) {
  return language === "en"
    ? `I, ${consumerName}, hereby withdraw from the complete order with contract number ${submittedContractNumber}.`
    : `Ich, ${consumerName}, widerrufe hiermit die vollständige Bestellung mit der Vertragsnummer ${submittedContractNumber}.`;
}

function getAdminRequestUrl(origin, request) {
  if (!origin || !request.orderId) return "";
  return new URL(`/admin/orders/${request.orderId}`, origin).toString();
}

async function updateEmailResult(requestId, data) {
  return prisma.orderCancellationRequest.update({ where: { id: requestId }, data });
}

export async function deliverInitialCancellationEmails(request, { origin = "", force = false } = {}) {
  const errors = [];
  if (force || request.customerEmailStatus !== "SENT") {
    try {
      await sendCancellationReceiptEmail(request, request.language);
      request = await updateEmailResult(request.id, { customerEmailStatus: "SENT", customerEmailSentAt: new Date() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Customer email failed.";
      errors.push(`Customer: ${message}`);
      request = await updateEmailResult(request.id, { customerEmailStatus: "FAILED", lastEmailError: message });
    }
  }

  if (force || request.internalEmailStatus !== "SENT") {
    try {
      await sendCancellationInternalEmail(request, getAdminRequestUrl(origin, request));
      request = await updateEmailResult(request.id, { internalEmailStatus: "SENT", internalEmailSentAt: new Date() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal email failed.";
      errors.push(`Internal: ${message}`);
      request = await updateEmailResult(request.id, { internalEmailStatus: "FAILED", lastEmailError: message });
    }
  }

  if (!errors.length && request.lastEmailError) {
    request = await updateEmailResult(request.id, { lastEmailError: null });
  }
  return { request, errors };
}

export async function createCancellationRequest(input, { origin = "" } = {}) {
  const submittedContractNumber = normalizeContractNumber(input.contractNumber);
  const consumerName = requiredString(input.consumerName, "Name", 160);
  const confirmationEmail = normalizeEmail(input.email);
  const reason = optionalString(input.reason, 2000);
  if (!reason) throw validationError("Reason is required.");
  const language = normalizeLanguage(input.language);

  const order = await prisma.order.findFirst({
    where: { contractNumber: { equals: submittedContractNumber, mode: "insensitive" } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const matchesOrder = Boolean(
    order
    && normalizeComparable(order.email) === normalizeComparable(confirmationEmail)
    && namesMatch(order, consumerName),
  );
  const duplicateWhere = matchesOrder
    ? { orderId: order.id, status: OrderCancellationRequestStatus.RECEIVED }
    : {
        submittedContractNumber,
        confirmationEmail,
        status: OrderCancellationRequestStatus.RECEIVED,
      };
  const existing = await prisma.orderCancellationRequest.findFirst({
    where: duplicateWhere,
    orderBy: { receivedAt: "desc" },
  });
  if (existing) return { request: existing, duplicate: true, emailErrors: [] };

  const request = await prisma.orderCancellationRequest.create({
    data: {
      referenceNumber: buildReferenceNumber(),
      orderId: matchesOrder ? order.id : null,
      submittedContractNumber,
      consumerName,
      confirmationEmail,
      reason: reason || null,
      declarationText: buildDeclaration({ consumerName, submittedContractNumber, language }),
      language,
    },
  });
  const delivery = await deliverInitialCancellationEmails(request, { origin });
  return { request: delivery.request, duplicate: false, emailErrors: delivery.errors };
}

export async function processCancellationRequest(requestId, decision, adminNote = "") {
  const normalizedDecision = String(decision || "").toUpperCase();
  if (!Object.values(OrderCancellationRequestStatus).includes(normalizedDecision) || normalizedDecision === "RECEIVED") {
    throw validationError("Invalid cancellation decision.");
  }
  const note = optionalString(adminNote, 2000);
  if (normalizedDecision === "REJECTED" && !note) {
    throw validationError("A rejection explanation is required.");
  }

  let request = await prisma.orderCancellationRequest.findUnique({ where: { id: requestId } });
  if (!request) throw validationError("Cancellation request not found.");
  if (request.status !== OrderCancellationRequestStatus.RECEIVED) return request;

  if (normalizedDecision === "APPROVED") {
    if (!request.orderId) throw validationError("Match this request to an order before approving it.");
    await cancelOrderPayment(request.orderId);
  }

  request = await prisma.orderCancellationRequest.update({
    where: { id: request.id },
    data: {
      status: normalizedDecision,
      adminNote: note || null,
      processedAt: new Date(),
      finalEmailStatus: "PENDING",
      lastEmailError: null,
    },
  });
  return deliverFinalCancellationEmail(request);
}

export async function deliverFinalCancellationEmail(request, { force = false } = {}) {
  if (!force && request.finalEmailStatus === "SENT") return request;
  try {
    await sendCancellationDecisionEmail(request);
    return updateEmailResult(request.id, {
      finalEmailStatus: "SENT",
      finalEmailSentAt: new Date(),
      lastEmailError: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Final email failed.";
    return updateEmailResult(request.id, { finalEmailStatus: "FAILED", lastEmailError: message });
  }
}

const ADMIN_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
};

export async function getCancellationRequestsForOrder(orderId) {
  if (!orderId) return [];
  return prisma.orderCancellationRequest.findMany({
    where: { orderId },
    orderBy: { receivedAt: "desc" },
    include: { order: { select: ADMIN_ORDER_SELECT } },
  });
}

export async function listCancellationRequestsForAdmin({ status = "" } = {}) {
  const where = {};
  const normalized = String(status || "").toUpperCase();
  if (Object.values(OrderCancellationRequestStatus).includes(normalized)) {
    where.status = normalized;
  }
  return prisma.orderCancellationRequest.findMany({
    where,
    orderBy: [{ receivedAt: "desc" }],
    include: { order: { select: ADMIN_ORDER_SELECT } },
  });
}

export async function countOpenCancellationRequests() {
  return prisma.orderCancellationRequest.count({
    where: { status: OrderCancellationRequestStatus.RECEIVED },
  });
}

export function cancellationEmailNeedsAttention(request) {
  return [request?.customerEmailStatus, request?.internalEmailStatus, request?.finalEmailStatus].includes("FAILED");
}

export function cancellationRequiresRefund(request) {
  return request?.status === OrderCancellationRequestStatus.APPROVED
    && String(request?.order?.paymentStatus || "").toUpperCase() === "PAID";
}

export async function retryCancellationEmails(requestId, { origin = "" } = {}) {
  const request = await prisma.orderCancellationRequest.findUnique({ where: { id: requestId } });
  if (!request) throw validationError("Cancellation request not found.");
  if (request.status === OrderCancellationRequestStatus.RECEIVED) {
    return (await deliverInitialCancellationEmails(request, { origin, force: true })).request;
  }
  return deliverFinalCancellationEmail(request, { force: true });
}
