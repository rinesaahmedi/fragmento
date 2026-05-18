import { Prisma } from "@prisma/client";

const OPTIONAL_SERVICE_CLAIM_COLUMNS = [
  "attachmentsJson",
  "landlordCompanyPhone",
  "landlordCompanyEmail",
];

const REQUIRED_CLAIM_COLUMNS = `
      "id",
      "contractNumber",
      "fullName",
      "phone",
      "email",
      "clientAddress",
      "clientCountry",
      "clientCity",
      "clientPostalCode",
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

function getMissingOptionalServiceClaimColumns(error) {
  return OPTIONAL_SERVICE_CLAIM_COLUMNS.filter((columnName) =>
    isMissingServiceClaimColumnError(error, columnName)
  );
}

function isColumnEnabled(options, columnName) {
  if (columnName === "attachmentsJson") {
    return options.includeAttachmentsJson;
  }
  if (columnName === "landlordCompanyPhone") {
    return options.includeLandlordCompanyPhone;
  }
  if (columnName === "landlordCompanyEmail") {
    return options.includeLandlordCompanyEmail;
  }
  return false;
}

function disableColumn(options, columnName) {
  if (columnName === "attachmentsJson") {
    options.includeAttachmentsJson = false;
  }
  if (columnName === "landlordCompanyPhone") {
    options.includeLandlordCompanyPhone = false;
  }
  if (columnName === "landlordCompanyEmail") {
    options.includeLandlordCompanyEmail = false;
  }
}

export function buildServiceClaimListWhere(filters, {
  includeAttachmentsJsonInSearch = true,
  includeLandlordCompanyPhoneInSearch = true,
  includeLandlordCompanyEmailInSearch = true,
} = {}) {
  const conditions = [];

  if (filters.q) {
    const query = `%${filters.q}%`;
    const parts = [
      Prisma.sql`"contractNumber" ILIKE ${query}`,
      Prisma.sql`"fullName" ILIKE ${query}`,
      Prisma.sql`COALESCE("phone", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("email", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("clientAddress", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("clientCity", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("clientPostalCode", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("clientCountry", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("landlordName", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("landlordPhone", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("landlordEmail", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("hausmeisterName", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("hausmeisterPhone", '') ILIKE ${query}`,
      Prisma.sql`COALESCE("hausmeisterEmail", '') ILIKE ${query}`,
      Prisma.sql`"landlordContact" ILIKE ${query}`,
      Prisma.sql`"problemDescription" ILIKE ${query}`,
      Prisma.sql`"serialNumber" ILIKE ${query}`,
    ];

    if (includeAttachmentsJsonInSearch) {
      parts.push(Prisma.sql`COALESCE("attachmentsJson", '') ILIKE ${query}`);
    }
    if (includeLandlordCompanyPhoneInSearch) {
      parts.push(Prisma.sql`COALESCE("landlordCompanyPhone", '') ILIKE ${query}`);
    }
    if (includeLandlordCompanyEmailInSearch) {
      parts.push(Prisma.sql`COALESCE("landlordCompanyEmail", '') ILIKE ${query}`);
    }

    conditions.push(Prisma.sql`(${Prisma.join(parts, " OR ")})`);
  }

  if (filters.city) {
    conditions.push(Prisma.sql`LOWER(COALESCE("clientCity", '')) = LOWER(${filters.city})`);
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

function buildClaimColumns({
  includeAttachmentsJson = true,
  includeLandlordCompanyPhone = true,
  includeLandlordCompanyEmail = true,
} = {}) {
  const optionalColumns = [];

  if (includeLandlordCompanyPhone) {
    optionalColumns.push(`      "landlordCompanyPhone"`);
  }

  if (includeLandlordCompanyEmail) {
    optionalColumns.push(`      "landlordCompanyEmail"`);
  }

  if (includeAttachmentsJson) {
    optionalColumns.push(`      "attachmentsJson"`);
  }

  return `${REQUIRED_CLAIM_COLUMNS}${optionalColumns.length ? `${optionalColumns.join(",\n")},\n` : ""}      "createdAt"`;
}

async function queryServiceClaims(prisma, queryBuilder) {
  const options = {
    includeAttachmentsJson: true,
    includeLandlordCompanyPhone: true,
    includeLandlordCompanyEmail: true,
  };

  while (true) {
    try {
      return await queryBuilder(options);
    } catch (error) {
      const missingColumns = getMissingOptionalServiceClaimColumns(error)
        .filter((columnName) => isColumnEnabled(options, columnName));

      if (!missingColumns.length) {
        throw error;
      }

      for (const columnName of missingColumns) {
        disableColumn(options, columnName);
      }
    }
  }
}

export async function queryServiceClaimsList(prisma, filters) {
  return queryServiceClaims(prisma, async (options) => {
    const where = buildServiceClaimListWhere(filters, {
      includeAttachmentsJsonInSearch: options.includeAttachmentsJson,
      includeLandlordCompanyPhoneInSearch: options.includeLandlordCompanyPhone,
      includeLandlordCompanyEmailInSearch: options.includeLandlordCompanyEmail,
    });

    return prisma.$queryRaw`
      SELECT
      ${Prisma.raw(buildClaimColumns(options))}
      FROM "ServiceClaim"
      ${where}
      ORDER BY "createdAt" DESC
    `;
  });
}

export async function queryServiceClaimById(prisma, id) {
  return queryServiceClaims(prisma, async (options) => {
    return prisma.$queryRaw`
      SELECT
      ${Prisma.raw(buildClaimColumns(options))}
      FROM "ServiceClaim"
      WHERE "id" = ${id}
      LIMIT 1
    `;
  });
}
