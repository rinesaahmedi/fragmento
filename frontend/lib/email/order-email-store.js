import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

export function getOrderEmailDatabaseUrl(value = process.env.DATABASE_URL) {
  const url = new URL(value);
  // A dedicated, bounded pool. Never import/reuse the application's prisma.
  url.searchParams.set("connection_limit", "1");
  url.searchParams.set("pool_timeout", "2");
  url.searchParams.set("connect_timeout", "2");
  return url.toString();
}

function getTrackingClient() {
  globalThis.orderEmailTrackingPrisma ||= new PrismaClient({
    datasources: { db: { url: getOrderEmailDatabaseUrl() } },
    log: [],
  });
  return globalThis.orderEmailTrackingPrisma;
}

export async function withTrackingDatabase(work, client = getTrackingClient()) {
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
    await tx.$executeRaw`SET LOCAL lock_timeout = '250ms'`;
    return work(tx);
  }, { maxWait: 500, timeout: 3000 });
}

export async function saveOrderEmailAttempt(attempt, client) {
  const { orderId, orderKind, delivery } = attempt;
  if (!orderId) return;
  const id = randomUUID();
  await withTrackingDatabase((tx) => tx.$executeRaw`
    INSERT INTO "OrderEmailAttempt" ("id", "orderId", "orderKind", "attemptedAt", "delivery")
    VALUES (${id}, ${orderId}, ${orderKind}, ${new Date(delivery.attemptedAt)}, ${JSON.stringify(delivery)}::jsonb)
  `, client);
}

export async function attachOrderEmailDelivery(orders, orderKind = "live", client) {
  const ids = orders.filter(Boolean).map((order) => order.id);
  if (!ids.length) return orders;
  try {
    const attempts = await withTrackingDatabase((tx) => tx.$queryRaw`
      SELECT DISTINCT ON ("orderId") "orderId", "delivery"
      FROM "OrderEmailAttempt"
      WHERE "orderKind" = ${orderKind} AND "orderId" IN (${Prisma.join(ids)})
      ORDER BY "orderId", "attemptedAt" DESC, "createdAt" DESC, "id" DESC
    `, client);
    const byOrder = new Map(attempts.map((attempt) => [attempt.orderId, attempt.delivery]));
    return orders.map((order) => order ? {
      ...order,
      confirmationEmailDelivery: byOrder.get(order.id) || order.confirmationEmailDelivery || null,
    } : order);
  } catch {
    // The dashboard and its existing order actions remain usable if tracking
    // is unavailable or its migration has not yet been applied.
    return orders;
  }
}
