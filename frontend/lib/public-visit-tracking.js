import crypto from "node:crypto";
import { prisma } from "./prisma.js";

export const PUBLIC_VISIT_EVENT_TYPES = {
  PAGE_OPENED: "PAGE_OPENED",
  CONTRACT_SUBMITTED: "CONTRACT_SUBMITTED",
  CONTRACT_ACCEPTED: "CONTRACT_ACCEPTED",
  CONTRACT_TEST_ACCEPTED: "CONTRACT_TEST_ACCEPTED",
  CONTRACT_REJECTED: "CONTRACT_REJECTED",
};

const PUBLIC_EVENT_TYPE_SET = new Set(Object.values(PUBLIC_VISIT_EVENT_TYPES));

function cleanText(value, maxLength = 200) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function hashValue(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const salt = process.env.VISIT_TRACKING_SALT || process.env.NEXTAUTH_SECRET || "fragmento-public-visit-tracking";
  return crypto.createHash("sha256").update(`${salt}:${text}`).digest("hex");
}

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "";
  return request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "";
}

function normalizeContractNumber(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

export function normalizePublicVisitEventType(value) {
  const eventType = String(value || "").trim().toUpperCase();
  return PUBLIC_EVENT_TYPE_SET.has(eventType) ? eventType : "";
}

export async function trackPublicVisitEvent({
  request,
  eventType,
  contractNumber = "",
  source = "",
  path = "",
  metadata = null,
}) {
  const normalizedEventType = normalizePublicVisitEventType(eventType);
  if (!normalizedEventType) return null;

  const normalizedContractNumber = normalizeContractNumber(contractNumber);
  const userAgent = request?.headers?.get("user-agent") || "";
  const ip = request ? getClientIp(request) : "";

  return prisma.publicVisitEvent.create({
    data: {
      eventType: normalizedEventType,
      source: cleanText(source, 80),
      path: cleanText(path, 200),
      contractNumberHash: hashValue(normalizedContractNumber),
      contractNumberLast4: normalizedContractNumber ? normalizedContractNumber.slice(-4) : null,
      ipHash: hashValue(ip),
      userAgentHash: hashValue(userAgent),
      metadata,
    },
  });
}

export async function safelyTrackPublicVisitEvent(args) {
  try {
    return await trackPublicVisitEvent(args);
  } catch (error) {
    console.warn("Public visit tracking failed:", error?.message || error);
    return null;
  }
}
