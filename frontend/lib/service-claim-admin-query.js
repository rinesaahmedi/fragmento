import { Prisma } from "@prisma/client";

export function isMissingAttachmentsJsonColumnError(error) {
  return isMissingServiceClaimColumnError(error, "attachmentsJson");
}

export function isMissingProblemAreasJsonColumnError(error) {
  return isMissingServiceClaimColumnError(error, "problemAreasJson");
}

function isMissingServiceClaimColumnError(error, columnName) {
  const message = String(error?.message ?? "");
  const metaMessage = typeof error?.meta?.message === "string" ? error.meta.message : "";
  const combined = `${message} ${metaMessage}`;
  return (
    combined.includes(columnName)
    && (combined.includes("does not exist") || combined.includes("42703"))
  );
}

export function buildServiceClaimListWhere(filters, { includeAttachmentsJsonInSearch = true } = {}) {
  const conditions = [];

  if (filters.q) {
    const query = `%${filters.q}%`;
    const parts = [
      Prisma.sql`"contractNumber" ILIKE ${query}`,
      Prisma.sql`"fullName" ILIKE ${query}`,
      Prisma.sql`COALESCE("phone", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("email", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("clientAddress", '') ILIKE ${query}`,
    ];
    if (includeAttachmentsJsonInSearch) {
      parts.push(Prisma.sql`COALESCE("attachmentsJson", '') ILIKE ${query}`);
    }
    parts.push(
      Prisma.sql`COALESCE("landlordName", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("landlordPhone", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("landlordEmail", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("hausmeisterName", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("hausmeisterPhone", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("hausmeisterEmail", '') ILIKE ${query}`,
      Prisma.sql`"landlordContact" ILIKE ${query}`,
      Prisma.sql`"problemDescription" ILIKE ${query}`,
      Prisma.sql`"serialNumber" ILIKE ${query}`,
    );
    conditions.push(Prisma.sql`(${Prisma.join(parts, " OR ")})`);
  }

  if (filters.requestType) {
    conditions.push(Prisma.sql`"requestType" = ${filters.requestType}`);
  }

  if (filters.dateFrom) {
    conditions.push(Prisma.sql`"createdAt" >= ${new Date(`${filters.dateFrom}T00:00:00.000Z`)}`);
  }

  if (filters.dateTo) {
    conditions.push(Prisma.sql`"createdAt" <= ${new Date(`${filters.dateTo}T23:59:59.999Z`)}`);
  }

  if (!conditions.length) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

const CLAIM_COLUMNS = `
      "id",
      "contractNumber",
      "fullName",
      "phone",
      "email",
      "clientAddress",
      "landlordName",
      "landlordPhone",
      "landlordEmail",
      "hausmeisterName",
      "hausmeisterPhone",
      "hausmeisterEmail",
      "landlordContact",
      "problemDescription",
      "serialNumber",
      "requestType",
`;

export async function queryServiceClaimsList(prisma, filters) {
  const whereWith = buildServiceClaimListWhere(filters, { includeAttachmentsJsonInSearch: true });
  try {
    return await prisma.$queryRaw`
      SELECT
      ${Prisma.raw(`${CLAIM_COLUMNS}
      "attachmentsJson",
      "createdAt"`)}
      FROM "ServiceClaim"
      ${whereWith}
      ORDER BY "createdAt" DESC
    `;
  } catch (error) {
    if (!isMissingAttachmentsJsonColumnError(error)) {
      throw error;
    }
    const whereWithout = buildServiceClaimListWhere(filters, { includeAttachmentsJsonInSearch: false });
    return await prisma.$queryRaw`
      SELECT
      ${Prisma.raw(`${CLAIM_COLUMNS}
      "createdAt"`)}
      FROM "ServiceClaim"
      ${whereWithout}
      ORDER BY "createdAt" DESC
    `;
  }
}

export async function queryServiceClaimById(prisma, id) {
  try {
    return await prisma.$queryRaw`
      SELECT
      ${Prisma.raw(`${CLAIM_COLUMNS}
      "attachmentsJson",
      "createdAt"`)}
      FROM "ServiceClaim"
      WHERE "id" = ${id}
      LIMIT 1
    `;
  } catch (error) {
    if (!isMissingAttachmentsJsonColumnError(error)) {
      throw error;
    }
    return await prisma.$queryRaw`
      SELECT
      ${Prisma.raw(`${CLAIM_COLUMNS}
      "createdAt"`)}
      FROM "ServiceClaim"
      WHERE "id" = ${id}
      LIMIT 1
    `;
  }
}
