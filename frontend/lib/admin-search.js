import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const ORDER_STATUSES = new Set(["NEW", "EMAILED", "CONFIRMED", "CANCELLED"]);
const SEARCH_RESULT_LIMIT = 10;
const SUGGESTION_LIMIT = 5;

function normalizeText(value) {
  return String(value || "").trim();
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function getPeriodStartDate(period) {
  const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "all" ? null : 30;
  if (!days) return null;
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildSearchPatterns(query) {
  const normalized = normalizeText(query);
  if (!normalized) {
    return null;
  }

  const escaped = escapeLike(normalized.toLowerCase());
  return {
    normalized,
    exact: escaped,
    startsWith: `${escaped}%`,
    contains: `%${escaped}%`,
    looksLikeContract: /^[A-Z]{2,}-\d+/i.test(normalized),
  };
}

function parseSelectedTokens(selected = []) {
  const rawValues = Array.isArray(selected) ? selected : [selected];
  const tokens = [];
  const seen = new Set();

  for (const rawValue of rawValues) {
    const value = normalizeText(rawValue);
    if (!value) continue;
    const separatorIndex = value.indexOf(":");
    if (separatorIndex <= 0) continue;
    const type = value.slice(0, separatorIndex).toLowerCase();
    const id = value.slice(separatorIndex + 1).trim();
    if (!id) continue;
    const token = `${type}:${id}`;
    if (seen.has(token)) continue;
    seen.add(token);
    tokens.push({ type, id, token });
  }

  return tokens;
}

function buildOrderFilterSql({ period = "", kitchenId = "", status = "" }, alias = "o") {
  const table = Prisma.raw(alias);
  const filters = [];
  const startDate = getPeriodStartDate(period);

  if (startDate) {
    filters.push(Prisma.sql`${table}."createdAt" >= ${startDate}`);
  }
  if (kitchenId) {
    filters.push(Prisma.sql`${table}."kitchenId" = ${kitchenId}`);
  }
  if (ORDER_STATUSES.has(status)) {
    filters.push(Prisma.sql`${table}."status"::text = ${status}`);
  }

  return filters;
}

function hasOrderFilters(filters) {
  return Boolean(filters.period && filters.period !== "all") || Boolean(filters.kitchenId) || Boolean(filters.status);
}

function joinSql(parts, separator) {
  if (!parts.length) {
    return Prisma.empty;
  }
  return Prisma.join(parts, separator);
}

function buildRankSql(fields, patterns, entityBoost = 0) {
  if (!patterns) {
    return Prisma.sql`0`;
  }

  const cases = [];
  for (const field of fields) {
    cases.push(Prisma.sql`CASE
      WHEN LOWER(COALESCE(${field}, '')) = ${patterns.exact} THEN ${300 + entityBoost}
      WHEN LOWER(COALESCE(${field}, '')) LIKE ${patterns.startsWith} ESCAPE '\' THEN ${200 + entityBoost}
      WHEN LOWER(COALESCE(${field}, '')) LIKE ${patterns.contains} ESCAPE '\' THEN ${100 + entityBoost}
      ELSE 0
    END`);
  }

  return Prisma.sql`GREATEST(${Prisma.join(cases, ", ")})`;
}

function buildAnyFieldMatchSql(fields, patterns) {
  if (!patterns) {
    return Prisma.sql`TRUE`;
  }

  const conditions = fields.map((field) => Prisma.sql`LOWER(COALESCE(${field}, '')) LIKE ${patterns.contains} ESCAPE '\'`);
  return Prisma.sql`(${Prisma.join(conditions, " OR ")})`;
}

function buildAddressMatchSql(fields, queryText) {
  const patterns = buildSearchPatterns(queryText);
  return buildAnyFieldMatchSql(fields, patterns);
}

function buildObjectDirectMatchSql(patterns) {
  return buildAnyFieldMatchSql([
    Prisma.sql`prj."name"`,
    Prisma.sql`po."name"`,
    Prisma.sql`po."address1"`,
    Prisma.sql`po."address2"`,
    Prisma.sql`po."postalCode"`,
    Prisma.sql`po."city"`,
    Prisma.sql`hc."name"`,
  ], patterns);
}

function buildObjectLinkedOrderAddressMatchSql(patterns) {
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM "KitchenContract" kc_match
    JOIN "Project" prj_match ON prj_match."id" = kc_match."projectId"
    JOIN "Order" o_match ON o_match."kitchenContractId" = kc_match."id"
    WHERE prj_match."propertyObjectId" = po."id"
      AND ${buildAnyFieldMatchSql([
        Prisma.sql`o_match."address1"`,
        Prisma.sql`o_match."address2"`,
        Prisma.sql`o_match."postalCode"`,
        Prisma.sql`o_match."city"`,
        Prisma.sql`o_match."country"`,
      ], patterns)}
  )`;
}

function buildEntityTokenConditions(entityType, tokens) {
  const conditions = [];

  for (const token of tokens) {
    if (entityType === "companies") {
      if (token.type === "company") {
        conditions.push(Prisma.sql`hc."id" = ${token.id}`);
      } else if (token.type === "contract") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "KitchenContract" kc_sel
          JOIN "Project" prj_sel ON prj_sel."id" = kc_sel."projectId"
          JOIN "PropertyObject" po_sel ON po_sel."id" = prj_sel."propertyObjectId"
          WHERE kc_sel."id" = ${token.id}
            AND po_sel."housingCompanyId" = hc."id"
        )`);
      } else if (token.type === "object") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "PropertyObject" po_sel
          WHERE po_sel."id" = ${token.id}
            AND po_sel."housingCompanyId" = hc."id"
        )`);
      } else if (token.type === "order") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "Order" o_sel
          LEFT JOIN "KitchenContract" kc_sel ON kc_sel."id" = o_sel."kitchenContractId"
          LEFT JOIN "Project" prj_sel ON prj_sel."id" = kc_sel."projectId"
          LEFT JOIN "PropertyObject" po_sel ON po_sel."id" = prj_sel."propertyObjectId"
          WHERE o_sel."id" = ${token.id}
            AND po_sel."housingCompanyId" = hc."id"
        )`);
      } else if (token.type === "address") {
        conditions.push(Prisma.sql`(
          LOWER(COALESCE(hc."address", '')) LIKE ${`%${escapeLike(token.id.toLowerCase())}%`} ESCAPE '\'
          OR EXISTS (
            SELECT 1
            FROM "PropertyObject" po_sel
            WHERE po_sel."housingCompanyId" = hc."id"
              AND ${buildAddressMatchSql([
                Prisma.sql`po_sel."name"`,
                Prisma.sql`po_sel."address1"`,
                Prisma.sql`po_sel."address2"`,
                Prisma.sql`po_sel."postalCode"`,
                Prisma.sql`po_sel."city"`,
                Prisma.sql`po_sel."country"`,
              ], token.id)}
          )
          OR EXISTS (
            SELECT 1
            FROM "KitchenContract" kc_sel
            JOIN "Project" prj_sel ON prj_sel."id" = kc_sel."projectId"
            JOIN "PropertyObject" po_sel ON po_sel."id" = prj_sel."propertyObjectId"
            JOIN "Order" o_sel ON o_sel."kitchenContractId" = kc_sel."id"
            WHERE po_sel."housingCompanyId" = hc."id"
              AND ${buildAddressMatchSql([
                Prisma.sql`o_sel."address1"`,
                Prisma.sql`o_sel."address2"`,
                Prisma.sql`o_sel."postalCode"`,
                Prisma.sql`o_sel."city"`,
                Prisma.sql`o_sel."country"`,
              ], token.id)}
          )
        )`);
      }
    }

    if (entityType === "contracts") {
      if (token.type === "company") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "Project" prj_sel
          WHERE prj_sel."id" = kc."projectId"
            AND prj_sel."housingCompanyId" = ${token.id}
        )`);
      } else if (token.type === "contract") {
        conditions.push(Prisma.sql`kc."id" = ${token.id}`);
      } else if (token.type === "object") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "Project" prj_sel
          WHERE prj_sel."id" = kc."projectId"
            AND prj_sel."propertyObjectId" = ${token.id}
        )`);
      } else if (token.type === "order") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "Order" o_sel
          WHERE o_sel."id" = ${token.id}
            AND o_sel."kitchenContractId" = kc."id"
        )`);
      } else if (token.type === "address") {
        conditions.push(Prisma.sql`(
          EXISTS (
            SELECT 1
            FROM "Project" prj_sel
            JOIN "PropertyObject" po_sel ON po_sel."id" = prj_sel."propertyObjectId"
            WHERE prj_sel."id" = kc."projectId"
              AND ${buildAddressMatchSql([
                Prisma.sql`po_sel."name"`,
                Prisma.sql`po_sel."address1"`,
                Prisma.sql`po_sel."address2"`,
                Prisma.sql`po_sel."postalCode"`,
                Prisma.sql`po_sel."city"`,
                Prisma.sql`po_sel."country"`,
              ], token.id)}
          )
          OR EXISTS (
            SELECT 1
            FROM "Order" o_sel
            WHERE o_sel."kitchenContractId" = kc."id"
              AND ${buildAddressMatchSql([
                Prisma.sql`o_sel."address1"`,
                Prisma.sql`o_sel."address2"`,
                Prisma.sql`o_sel."postalCode"`,
                Prisma.sql`o_sel."city"`,
                Prisma.sql`o_sel."country"`,
              ], token.id)}
          )
        )`);
      }
    }

    if (entityType === "objects") {
      if (token.type === "company") {
        conditions.push(Prisma.sql`po."housingCompanyId" = ${token.id}`);
      } else if (token.type === "contract") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "KitchenContract" kc_sel
          WHERE kc_sel."id" = ${token.id}
            AND EXISTS (
              SELECT 1
              FROM "Project" prj_sel
              WHERE prj_sel."id" = kc_sel."projectId"
                AND prj_sel."propertyObjectId" = po."id"
            )
        )`);
      } else if (token.type === "object") {
        conditions.push(Prisma.sql`po."id" = ${token.id}`);
      } else if (token.type === "order") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "Order" o_sel
          LEFT JOIN "KitchenContract" kc_sel ON kc_sel."id" = o_sel."kitchenContractId"
          WHERE o_sel."id" = ${token.id}
            AND EXISTS (
              SELECT 1
              FROM "Project" prj_sel
              WHERE prj_sel."id" = kc_sel."projectId"
                AND prj_sel."propertyObjectId" = po."id"
            )
        )`);
      } else if (token.type === "address") {
        conditions.push(Prisma.sql`(
          ${buildAddressMatchSql([
            Prisma.sql`po."name"`,
            Prisma.sql`po."address1"`,
            Prisma.sql`po."address2"`,
            Prisma.sql`po."postalCode"`,
            Prisma.sql`po."city"`,
            Prisma.sql`po."country"`,
          ], token.id)}
          OR EXISTS (
            SELECT 1
            FROM "KitchenContract" kc_sel
            JOIN "Project" prj_sel ON prj_sel."id" = kc_sel."projectId"
            JOIN "Order" o_sel ON o_sel."kitchenContractId" = kc_sel."id"
            WHERE prj_sel."propertyObjectId" = po."id"
              AND ${buildAddressMatchSql([
                Prisma.sql`o_sel."address1"`,
                Prisma.sql`o_sel."address2"`,
                Prisma.sql`o_sel."postalCode"`,
                Prisma.sql`o_sel."city"`,
                Prisma.sql`o_sel."country"`,
              ], token.id)}
          )
        )`);
      }
    }

    if (entityType === "orders") {
      if (token.type === "company") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "KitchenContract" kc_sel
          JOIN "Project" prj_sel ON prj_sel."id" = kc_sel."projectId"
          JOIN "PropertyObject" po_sel ON po_sel."id" = prj_sel."propertyObjectId"
          WHERE kc_sel."id" = o."kitchenContractId"
            AND po_sel."housingCompanyId" = ${token.id}
        )`);
      } else if (token.type === "contract") {
        conditions.push(Prisma.sql`o."kitchenContractId" = ${token.id}`);
      } else if (token.type === "object") {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "KitchenContract" kc_sel
          WHERE kc_sel."id" = o."kitchenContractId"
            AND EXISTS (
              SELECT 1
              FROM "Project" prj_sel
              WHERE prj_sel."id" = kc_sel."projectId"
                AND prj_sel."propertyObjectId" = ${token.id}
            )
        )`);
      } else if (token.type === "order") {
        conditions.push(Prisma.sql`o."id" = ${token.id}`);
      } else if (token.type === "address") {
        conditions.push(buildAddressMatchSql([
          Prisma.sql`o."address1"`,
          Prisma.sql`o."address2"`,
          Prisma.sql`o."postalCode"`,
          Prisma.sql`o."city"`,
          Prisma.sql`o."country"`,
        ], token.id));
      }
    }
  }

  return conditions;
}

function buildCompanyEligibility(filters) {
  const kitchenContractConditions = [];
  if (filters.kitchenId) {
    kitchenContractConditions.push(Prisma.sql`kc_scope."kitchenId" = ${filters.kitchenId}`);
  }

  const orderFilters = buildOrderFilterSql(filters, "o_scope");
  const hasScopedOrders = hasOrderFilters(filters) && (filters.period !== "all" || filters.kitchenId || filters.status);

  return Prisma.sql`EXISTS (
    SELECT 1
    FROM "PropertyObject" po_scope
    JOIN "Project" prj_scope ON prj_scope."propertyObjectId" = po_scope."id"
    JOIN "KitchenContract" kc_scope ON kc_scope."projectId" = prj_scope."id"
    ${hasScopedOrders ? Prisma.sql`JOIN "Order" o_scope ON o_scope."kitchenContractId" = kc_scope."id"` : Prisma.empty}
    WHERE po_scope."housingCompanyId" = hc."id"
      ${kitchenContractConditions.length ? Prisma.sql`AND ${Prisma.join(kitchenContractConditions, " AND ")}` : Prisma.empty}
      ${orderFilters.length ? Prisma.sql`AND ${Prisma.join(orderFilters, " AND ")}` : Prisma.empty}
  )`;
}

function buildContractEligibility(filters) {
  const conditions = [];
  if (filters.kitchenId) {
    conditions.push(Prisma.sql`kc."kitchenId" = ${filters.kitchenId}`);
  }

  const orderFilters = buildOrderFilterSql(filters, "o_scope");
  if (orderFilters.length) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM "Order" o_scope
      WHERE o_scope."kitchenContractId" = kc."id"
        AND ${Prisma.join(orderFilters, " AND ")}
    )`);
  }

  return conditions.length ? Prisma.sql`(${Prisma.join(conditions, " AND ")})` : Prisma.sql`TRUE`;
}

function buildObjectEligibility(filters) {
  if (!filters.kitchenId) {
    return Prisma.sql`TRUE`;
  }

  return Prisma.sql`EXISTS (
    SELECT 1
    FROM "KitchenContract" kc_scope
    JOIN "Project" prj_scope ON prj_scope."id" = kc_scope."projectId"
    WHERE prj_scope."propertyObjectId" = po."id"
      AND kc_scope."kitchenId" = ${filters.kitchenId}
  )`;
}

function buildOrderWhere(filters, tokens, querySql) {
  const conditions = [
    ...buildOrderFilterSql(filters, "o"),
    ...buildEntityTokenConditions("orders", tokens),
  ];
  if (querySql) {
    conditions.push(querySql);
  }

  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
}

function mapSuggestion(row) {
  return {
    token: row.token,
    type: row.type,
    id: row.id,
    label: row.label || "",
    badge: row.badge || "",
    description: row.description || "",
  };
}

async function getSuggestions(filters, tokens, query) {
  const patterns = buildSearchPatterns(query);
  if (!patterns) {
    return {
      companies: [],
      contracts: [],
      addresses: [],
      orders: [],
    };
  }

  const companyQuerySql = buildAnyFieldMatchSql([
    Prisma.sql`hc."name"`,
    Prisma.sql`hc."address"`,
    Prisma.sql`hc."email"`,
  ], patterns);
  const companyRank = buildRankSql([Prisma.sql`hc."name"`, Prisma.sql`hc."address"`], patterns, patterns.looksLikeContract ? 0 : 20);
  const contractQuerySql = buildAnyFieldMatchSql([
    Prisma.sql`kc."contractNumber"`,
    Prisma.sql`k."name"`,
    Prisma.sql`po."name"`,
    Prisma.sql`hc."name"`,
  ], patterns);
  const contractRank = buildRankSql([Prisma.sql`kc."contractNumber"`, Prisma.sql`po."name"`, Prisma.sql`hc."name"`], patterns, patterns.looksLikeContract ? 80 : 0);
  const addressQuerySql = buildAnyFieldMatchSql([
    Prisma.sql`po."name"`,
    Prisma.sql`po."address1"`,
    Prisma.sql`po."address2"`,
    Prisma.sql`po."postalCode"`,
    Prisma.sql`po."city"`,
    Prisma.sql`po."country"`,
  ], patterns);
  const addressRank = buildRankSql([
    Prisma.sql`po."city"`,
    Prisma.sql`po."postalCode"`,
    Prisma.sql`po."address1"`,
    Prisma.sql`po."name"`,
  ], patterns, patterns.looksLikeContract ? 0 : 10);
  const orderQuerySql = buildAnyFieldMatchSql([
    Prisma.sql`o."orderNumber"`,
    Prisma.sql`o."firstName"`,
    Prisma.sql`o."lastName"`,
    Prisma.sql`CONCAT_WS(' ', o."firstName", o."lastName")`,
    Prisma.sql`kc."contractNumber"`,
    Prisma.sql`o."city"`,
  ], patterns);
  const orderRank = buildRankSql([
    Prisma.sql`o."orderNumber"`,
    Prisma.sql`kc."contractNumber"`,
    Prisma.sql`o."city"`,
    Prisma.sql`o."firstName"`,
    Prisma.sql`o."lastName"`,
    Prisma.sql`CONCAT_WS(' ', o."firstName", o."lastName")`,
  ], patterns);

  const [companies, contracts, addresses, orders] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        hc."id",
        hc."id"::text AS token,
        hc."name" AS label,
        'Company'::text AS badge,
        COALESCE(hc."address", '') AS description,
        'company'::text AS type,
        ${companyRank} AS rank
      FROM "HousingCompany" hc
      WHERE ${companyQuerySql}
        AND ${buildCompanyEligibility(filters)}
        ${buildEntityTokenConditions("companies", tokens).length ? Prisma.sql`AND ${Prisma.join(buildEntityTokenConditions("companies", tokens), " AND ")}` : Prisma.empty}
      ORDER BY rank DESC, hc."name" ASC
      LIMIT ${SUGGESTION_LIMIT}
    `,
    prisma.$queryRaw`
      SELECT
        kc."id",
        kc."id"::text AS token,
        kc."contractNumber" AS label,
        'Contract'::text AS badge,
        CONCAT_WS(' • ', hc."name", po."name", k."name") AS description,
        'contract'::text AS type,
        ${contractRank} AS rank
      FROM "KitchenContract" kc
      JOIN "Kitchen" k ON k."id" = kc."kitchenId"
      LEFT JOIN "Project" prj ON prj."id" = kc."projectId"
      LEFT JOIN "PropertyObject" po ON po."id" = prj."propertyObjectId"
      LEFT JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
      WHERE ${contractQuerySql}
        AND ${buildContractEligibility(filters)}
        ${buildEntityTokenConditions("contracts", tokens).length ? Prisma.sql`AND ${Prisma.join(buildEntityTokenConditions("contracts", tokens), " AND ")}` : Prisma.empty}
      ORDER BY rank DESC, kc."contractNumber" ASC
      LIMIT ${SUGGESTION_LIMIT}
    `,
    prisma.$queryRaw`
      SELECT
        po."id",
        CONCAT_WS(', ', NULLIF(BTRIM(po."address1"), ''), NULLIF(BTRIM(po."address2"), ''), NULLIF(BTRIM(CONCAT_WS(' ', po."postalCode", po."city")), ''), NULLIF(BTRIM(po."country"), '')) AS token,
        COALESCE(NULLIF(BTRIM(po."city"), ''), NULLIF(BTRIM(po."address1"), ''), po."name") AS label,
        'Address'::text AS badge,
        CONCAT_WS(' • ', hc."name", po."name", CONCAT_WS(', ', po."postalCode", po."city", po."country")) AS description,
        'address'::text AS type,
        ${addressRank} AS rank
      FROM "PropertyObject" po
      JOIN "HousingCompany" hc ON hc."id" = po."housingCompanyId"
      WHERE ${addressQuerySql}
        AND ${buildObjectEligibility(filters)}
        ${buildEntityTokenConditions("objects", tokens).length ? Prisma.sql`AND ${Prisma.join(buildEntityTokenConditions("objects", tokens), " AND ")}` : Prisma.empty}
      ORDER BY rank DESC, po."city" ASC, po."address1" ASC
      LIMIT ${SUGGESTION_LIMIT}
    `,
    prisma.$queryRaw`
      SELECT
        o."id",
        o."id"::text AS token,
        o."orderNumber" AS label,
        'Order'::text AS badge,
        CONCAT_WS(' • ', CONCAT_WS(' ', o."firstName", o."lastName"), kc."contractNumber", CONCAT_WS(', ', o."postalCode", o."city")) AS description,
        'order'::text AS type,
        ${orderRank} AS rank
      FROM "Order" o
      LEFT JOIN "KitchenContract" kc ON kc."id" = o."kitchenContractId"
      ${buildOrderWhere(filters, tokens, orderQuerySql)}
      ORDER BY rank DESC, o."createdAt" DESC
      LIMIT ${SUGGESTION_LIMIT}
    `,
  ]);

  return {
    companies: companies.map((row) => mapSuggestion({ ...row, token: `company:${row.token}` })),
    contracts: contracts.map((row) => mapSuggestion({ ...row, token: `contract:${row.token}` })),
    addresses: addresses
      .filter((row) => normalizeText(row.token))
      .map((row) => mapSuggestion({ ...row, token: `address:${row.token}` })),
    orders: orders.map((row) => mapSuggestion({ ...row, token: `order:${row.token}` })),
  };
}

function resultsQueryActive(tokens, query) {
  return tokens.length > 0 || Boolean(normalizeText(query));
}

async function getResults(filters, tokens, query) {
  const patterns = buildSearchPatterns(query);
  const companyTokenConditions = buildEntityTokenConditions("companies", tokens);
  const contractTokenConditions = buildEntityTokenConditions("contracts", tokens);
  const objectTokenConditions = buildEntityTokenConditions("objects", tokens);
  const orderTokenConditions = buildEntityTokenConditions("orders", tokens);

  const companyQuerySql = patterns ? buildAnyFieldMatchSql([
    Prisma.sql`hc."name"`,
    Prisma.sql`hc."address"`,
    Prisma.sql`hc."email"`,
  ], patterns) : null;
  const contractQuerySql = patterns ? buildAnyFieldMatchSql([
    Prisma.sql`kc."contractNumber"`,
    Prisma.sql`k."name"`,
    Prisma.sql`prj."name"`,
    Prisma.sql`po."name"`,
    Prisma.sql`hc."name"`,
  ], patterns) : null;
  const objectDirectQuerySql = patterns ? buildObjectDirectMatchSql(patterns) : null;
  const objectLinkedOrderQuerySql = patterns ? buildObjectLinkedOrderAddressMatchSql(patterns) : null;
  const objectQuerySql = patterns
    ? Prisma.sql`(${objectDirectQuerySql} OR ${objectLinkedOrderQuerySql})`
    : null;
  const objectDirectRank = patterns ? buildRankSql([
    Prisma.sql`prj."name"`,
    Prisma.sql`po."city"`,
    Prisma.sql`po."postalCode"`,
    Prisma.sql`po."address1"`,
    Prisma.sql`po."name"`,
  ], patterns, patterns.looksLikeContract ? 0 : 10) : Prisma.sql`0`;
  const objectLinkedOrderRank = patterns
    ? Prisma.sql`CASE
        WHEN ${objectLinkedOrderQuerySql} THEN 95
        ELSE 0
      END`
    : Prisma.sql`0`;
  const objectMatchRank = patterns
    ? Prisma.sql`GREATEST(${objectDirectRank}, ${objectLinkedOrderRank})`
    : Prisma.sql`0`;
  const orderQuerySql = patterns ? buildAnyFieldMatchSql([
    Prisma.sql`o."orderNumber"`,
    Prisma.sql`o."firstName"`,
    Prisma.sql`o."lastName"`,
    Prisma.sql`CONCAT_WS(' ', o."firstName", o."lastName")`,
    Prisma.sql`o."address1"`,
    Prisma.sql`o."postalCode"`,
    Prisma.sql`o."city"`,
    Prisma.sql`kc."contractNumber"`,
    Prisma.sql`hc."name"`,
  ], patterns) : null;

  const [companyRows, contractRows, objectRows, orderRows, contractSummaryRows, objectSummaryRows, orderSummaryRows] = await Promise.all([
    prisma.$queryRaw`
      WITH matching AS (
        SELECT
          hc."id",
          hc."name",
          hc."address",
          COUNT(DISTINCT po."id")::int AS "objectCount",
          COUNT(DISTINCT kc."id")::int AS "contractCount",
          COUNT(DISTINCT o."id")::int AS "orderCount",
          COALESCE(SUM(o."totalPrice"), 0) AS "revenue"
        FROM "HousingCompany" hc
        LEFT JOIN "PropertyObject" po ON po."housingCompanyId" = hc."id"
        LEFT JOIN "Project" prj ON prj."propertyObjectId" = po."id"
        LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
        LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id"
        WHERE ${buildCompanyEligibility(filters)}
          ${companyTokenConditions.length ? Prisma.sql`AND ${Prisma.join(companyTokenConditions, " AND ")}` : Prisma.empty}
          ${companyQuerySql ? Prisma.sql`AND ${companyQuerySql}` : Prisma.empty}
          ${buildOrderFilterSql(filters, "o").length ? Prisma.sql`AND ${Prisma.join(buildOrderFilterSql(filters, "o"), " AND ")}` : Prisma.empty}
        GROUP BY hc."id"
      )
      SELECT *, COUNT(*) OVER()::int AS "totalCount"
      FROM matching
      ORDER BY "orderCount" DESC, "revenue" DESC, "name" ASC
      LIMIT ${SEARCH_RESULT_LIMIT}
    `,
    prisma.$queryRaw`
      WITH matching AS (
        SELECT
          kc."id",
          kc."contractNumber",
          k."name" AS "kitchenName",
          prj."name" AS "projectName",
          po."name" AS "objectName",
          hc."name" AS "companyName",
          COUNT(DISTINCT o."id")::int AS "orderCount",
          COALESCE(SUM(o."totalPrice"), 0) AS "revenue"
        FROM "KitchenContract" kc
        JOIN "Kitchen" k ON k."id" = kc."kitchenId"
        LEFT JOIN "Project" prj ON prj."id" = kc."projectId"
        LEFT JOIN "PropertyObject" po ON po."id" = prj."propertyObjectId"
        LEFT JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
        LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id"
        WHERE ${buildContractEligibility(filters)}
          ${contractTokenConditions.length ? Prisma.sql`AND ${Prisma.join(contractTokenConditions, " AND ")}` : Prisma.empty}
          ${contractQuerySql ? Prisma.sql`AND ${contractQuerySql}` : Prisma.empty}
          ${buildOrderFilterSql(filters, "o").length ? Prisma.sql`AND ${Prisma.join(buildOrderFilterSql(filters, "o"), " AND ")}` : Prisma.empty}
        GROUP BY kc."id", k."id", prj."id", po."id", hc."id"
      )
      SELECT *, COUNT(*) OVER()::int AS "totalCount"
      FROM matching
      ORDER BY "orderCount" DESC, "revenue" DESC, "contractNumber" ASC
      LIMIT ${SEARCH_RESULT_LIMIT}
    `,
    prisma.$queryRaw`
      WITH matching AS (
        SELECT
          po."id",
          po."name",
          po."address1",
          po."address2",
          po."postalCode",
          po."city",
          po."country",
          hc."id" AS "companyId",
          hc."name" AS "companyName",
          prj."name" AS "projectName",
          ${objectMatchRank} AS "matchRank",
          COUNT(DISTINCT kc."id")::int AS "contractCount",
          COUNT(DISTINCT o."id")::int AS "orderCount"
        FROM "PropertyObject" po
        JOIN "HousingCompany" hc ON hc."id" = po."housingCompanyId"
        LEFT JOIN "Project" prj ON prj."propertyObjectId" = po."id"
        LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
        LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id"
        WHERE ${buildObjectEligibility(filters)}
          ${objectTokenConditions.length ? Prisma.sql`AND ${Prisma.join(objectTokenConditions, " AND ")}` : Prisma.empty}
          ${objectQuerySql ? Prisma.sql`AND ${objectQuerySql}` : Prisma.empty}
        GROUP BY po."id", hc."id", prj."id"
      )
      SELECT *, COUNT(*) OVER()::int AS "totalCount"
      FROM matching
      ORDER BY "matchRank" DESC, "orderCount" DESC, "contractCount" DESC, "name" ASC
      LIMIT ${SEARCH_RESULT_LIMIT}
    `,
    prisma.$queryRaw`
      WITH matching AS (
        SELECT
          o."id",
          o."orderNumber",
          CONCAT_WS(' ', o."firstName", o."lastName") AS "customerName",
          o."address1",
          o."address2",
          o."postalCode",
          o."city",
          o."country",
          o."createdAt",
          o."totalPrice",
          kc."contractNumber",
          prj."name" AS "projectName",
          po."name" AS "objectName",
          hc."name" AS "companyName"
        FROM "Order" o
        LEFT JOIN "KitchenContract" kc ON kc."id" = o."kitchenContractId"
        LEFT JOIN "Project" prj ON prj."id" = kc."projectId"
        LEFT JOIN "PropertyObject" po ON po."id" = prj."propertyObjectId"
        LEFT JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
        ${buildOrderWhere(filters, tokens, orderQuerySql)}
      )
      SELECT *, COUNT(*) OVER()::int AS "totalCount"
      FROM matching
      ORDER BY "createdAt" DESC
      LIMIT ${SEARCH_RESULT_LIMIT}
    `,
    prisma.$queryRaw`
      WITH matching AS (
        SELECT kc."id"
        FROM "KitchenContract" kc
        JOIN "Kitchen" k ON k."id" = kc."kitchenId"
        LEFT JOIN "Project" prj ON prj."id" = kc."projectId"
        LEFT JOIN "PropertyObject" po ON po."id" = prj."propertyObjectId"
        LEFT JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
        LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id"
        WHERE ${buildContractEligibility(filters)}
          ${contractTokenConditions.length ? Prisma.sql`AND ${Prisma.join(contractTokenConditions, " AND ")}` : Prisma.empty}
          ${contractQuerySql ? Prisma.sql`AND ${contractQuerySql}` : Prisma.empty}
          ${buildOrderFilterSql(filters, "o").length ? Prisma.sql`AND ${Prisma.join(buildOrderFilterSql(filters, "o"), " AND ")}` : Prisma.empty}
        GROUP BY kc."id"
      )
      SELECT COUNT(*)::int AS contracts
      FROM matching
    `,
    prisma.$queryRaw`
      WITH matching AS (
        SELECT po."id"
        FROM "PropertyObject" po
        JOIN "HousingCompany" hc ON hc."id" = po."housingCompanyId"
        LEFT JOIN "Project" prj ON prj."propertyObjectId" = po."id"
        LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
        LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id"
        WHERE ${buildObjectEligibility(filters)}
          ${objectTokenConditions.length ? Prisma.sql`AND ${Prisma.join(objectTokenConditions, " AND ")}` : Prisma.empty}
          ${objectQuerySql ? Prisma.sql`AND ${objectQuerySql}` : Prisma.empty}
        GROUP BY po."id"
      )
      SELECT COUNT(*)::int AS objects
      FROM matching
    `,
    prisma.$queryRaw`
      WITH matching AS (
        SELECT
          o."id",
          o."totalPrice"
        FROM "Order" o
        LEFT JOIN "KitchenContract" kc ON kc."id" = o."kitchenContractId"
        LEFT JOIN "Project" prj ON prj."id" = kc."projectId"
        LEFT JOIN "PropertyObject" po ON po."id" = prj."propertyObjectId"
        LEFT JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
        ${buildOrderWhere(filters, tokens, orderQuerySql)}
      )
      SELECT
        COUNT(*)::int AS orders,
        COALESCE(SUM("totalPrice"), 0) AS revenue
      FROM matching
    `,
  ]);

  const contractSummaryRow = contractSummaryRows[0] || {};
  const objectSummaryRow = objectSummaryRows[0] || {};
  const orderSummaryRow = orderSummaryRows[0] || {};
  return {
    results: {
      companies: companyRows.map((row) => ({
        id: row.id,
        name: row.name || "",
        address: row.address || "",
        objectCount: Number(row.objectCount || 0),
        contractCount: Number(row.contractCount || 0),
        orderCount: Number(row.orderCount || 0),
        revenue: Number(row.revenue || 0),
      })),
      contracts: contractRows.map((row) => ({
        id: row.id,
        contractNumber: row.contractNumber || "",
        kitchenName: row.kitchenName || "",
        projectName: row.projectName || "",
        objectName: row.objectName || "",
        companyName: row.companyName || "",
        orderCount: Number(row.orderCount || 0),
        revenue: Number(row.revenue || 0),
      })),
      objects: objectRows.map((row) => ({
        id: row.id,
        name: row.name || "",
        address1: row.address1 || "",
        address2: row.address2 || "",
        postalCode: row.postalCode || "",
        city: row.city || "",
        country: row.country || "",
        companyId: row.companyId || "",
        companyName: row.companyName || "",
        projectName: row.projectName || "",
        contractCount: Number(row.contractCount || 0),
        orderCount: Number(row.orderCount || 0),
      })),
      orders: orderRows.map((row) => ({
        id: row.id,
        orderNumber: row.orderNumber || "",
        customerName: row.customerName || "",
        address1: row.address1 || "",
        address2: row.address2 || "",
        postalCode: row.postalCode || "",
        city: row.city || "",
        country: row.country || "",
        contractNumber: row.contractNumber || "",
        projectName: row.projectName || "",
        objectName: row.objectName || "",
        companyName: row.companyName || "",
        totalPrice: Number(row.totalPrice || 0),
        createdAt: row.createdAt,
      })),
    },
    summary: {
      contracts: Number(contractSummaryRow.contracts || 0),
      orders: Number(orderSummaryRow.orders || 0),
      revenue: Number(orderSummaryRow.revenue || 0),
      objects: Number(objectSummaryRow.objects || 0),
    },
    totals: {
      companies: Number(companyRows[0]?.totalCount || 0),
      contracts: Number(contractRows[0]?.totalCount || 0),
      objects: Number(objectRows[0]?.totalCount || 0),
      orders: Number(orderRows[0]?.totalCount || 0),
    },
  };
}

export async function getAdminEntitySearch(payload = {}) {
  const filters = {
    period: normalizeText(payload.period),
    kitchenId: normalizeText(payload.kitchenId),
    status: normalizeText(payload.status),
  };
  const query = normalizeText(payload.q);
  const tokens = parseSelectedTokens(payload.selected || []);

  const suggestions = await getSuggestions(filters, tokens, query);
  if (!resultsQueryActive(tokens, query)) {
    return {
      suggestions,
      results: {
        companies: [],
        contracts: [],
        objects: [],
        orders: [],
      },
      summary: {
        contracts: 0,
        orders: 0,
        revenue: 0,
        objects: 0,
      },
      meta: {
        totals: {
          companies: 0,
          contracts: 0,
          objects: 0,
          orders: 0,
        },
      },
    };
  }

  const resolved = await getResults(filters, tokens, query);
  return {
    suggestions,
    results: resolved.results,
    summary: resolved.summary,
    meta: {
      totals: resolved.totals,
    },
  };
}
