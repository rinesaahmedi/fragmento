import { NextResponse } from "next/server";
import { getOrderKindForContractNumber } from "../../../../../lib/order-kind";
import { getServiceClaimKitchenPlan } from "../../../../../lib/service-claim-kitchen-plan";
import {
  isServiceClaimContractLookupReady,
  normalizeServiceClaimContractNumber,
} from "../../../../../lib/service-claim-lookup";
import { getServiceClaimContractDetails } from "../../../../../lib/service-claims";
import { prisma } from "../../../../../lib/prisma";
import {
  getPublicRequestClientIp,
  PUBLIC_VISIT_EVENT_TYPES,
  SERVICE_PAGE_PATH,
  safelyTrackPublicVisitEvent,
} from "../../../../../lib/public-visit-tracking";
import { enforceRateLimit, getRequestClientIp } from "../../../../../lib/rate-limit";
import crypto from "node:crypto";

const NOT_FOUND_DEDUPE_WINDOW_MS = 2 * 60 * 1000;

function hashContractNumber(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const salt = process.env.VISIT_TRACKING_SALT
    || process.env.ADMIN_SESSION_SECRET
    || process.env.NEXTAUTH_SECRET
    || "fragmento-public-visit-tracking-local-only";
  return crypto.createHash("sha256").update(`${salt}:${text}`).digest("hex");
}

function getDailyVisitorKey(request) {
  const userAgent = request?.headers?.get("user-agent") || "";
  const ip = request ? getPublicRequestClientIp(request) : "";
  if (!ip && !userAgent) return null;
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.VISIT_TRACKING_SALT
    || process.env.ADMIN_SESSION_SECRET
    || process.env.NEXTAUTH_SECRET
    || "fragmento-public-visit-tracking-local-only";
  return crypto.createHash("sha256")
    .update(`${salt}:daily-visitor:${day}:${ip}:${userAgent}`)
    .digest("hex");
}

async function recentlyTrackedNotFound({ request, contractNumber }) {
  const contractNumberHash = hashContractNumber(contractNumber);
  const visitorKey = getDailyVisitorKey(request);
  if (!contractNumberHash) return false;

  const recent = await prisma.publicVisitEvent.findFirst({
    where: {
      eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
      contractNumberHash,
      ...(visitorKey ? { visitorKey } : {}),
      createdAt: { gte: new Date(Date.now() - NOT_FOUND_DEDUPE_WINDOW_MS) },
    },
    select: { id: true },
  });

  return Boolean(recent);
}

export async function GET(request, { params }) {
  let submittedContractNumber = "";

  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`service-claim-lookup:${clientIp}`, {
      limit: 40,
      windowMs: 15 * 60 * 1000,
    });

    const { contractNumber } = await params;
    submittedContractNumber = normalizeServiceClaimContractNumber(contractNumber);

    if (!isServiceClaimContractLookupReady(submittedContractNumber)) {
      return NextResponse.json(
        { ok: false, error: "Contract number was not found." },
        { status: 404 },
      );
    }

    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_LOOKUP,
      contractNumber: submittedContractNumber,
      path: SERVICE_PAGE_PATH,
    });

    const contract = await getServiceClaimContractDetails(submittedContractNumber);

    if (!contract) {
      const isDuplicate = await recentlyTrackedNotFound({
        request,
        contractNumber: submittedContractNumber,
      }).catch(() => false);

      if (!isDuplicate) {
        await safelyTrackPublicVisitEvent({
          request,
          eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
          contractNumber: submittedContractNumber,
          path: SERVICE_PAGE_PATH,
        });
      }

      return NextResponse.json(
        { ok: false, error: "Contract number was not found." },
        { status: 404 },
      );
    }

    const orderKind = getOrderKindForContractNumber(contract.contractNumber);
    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND,
      contractNumber: contract.contractNumber,
      kitchenContractId: contract.id,
      path: SERVICE_PAGE_PATH,
      metadata: { orderKind },
    });

    const kitchenPlan = await getServiceClaimKitchenPlan(submittedContractNumber);

    return NextResponse.json({
      ok: true,
      contract,
      kitchenPlan,
    });
  } catch (error) {
    if (isServiceClaimContractLookupReady(submittedContractNumber)) {
      const isDuplicate = await recentlyTrackedNotFound({
        request,
        contractNumber: submittedContractNumber,
      }).catch(() => false);

      if (!isDuplicate) {
        await safelyTrackPublicVisitEvent({
          request,
          eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
          contractNumber: submittedContractNumber,
          path: SERVICE_PAGE_PATH,
          metadata: { status: error.status || 500 },
        });
      }
    }

    return NextResponse.json(
      { ok: false, error: error.message || "Contract lookup failed." },
      { status: error.status || 500 },
    );
  }
}
