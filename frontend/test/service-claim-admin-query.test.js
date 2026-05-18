import assert from "node:assert/strict";
import test from "node:test";
import {
  resetServiceClaimQueryColumnSupportCache,
  queryServiceClaimById,
  queryServiceClaimsList,
} from "../lib/service-claim-admin-query.js";

function renderSqlTemplate(strings, values) {
  let output = "";
  for (let index = 0; index < strings.length; index += 1) {
    output += strings[index];
    if (index < values.length) {
      output += renderSqlValue(values[index]);
    }
  }
  return output;
}

function renderSqlValue(value) {
  if (value && Array.isArray(value.strings) && Array.isArray(value.values)) {
    return renderSqlTemplate(value.strings, value.values);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function missingColumnError(columnName) {
  const message = `Raw query failed. Code: \`42703\`. Message: \`column "${columnName}" does not exist\``;
  return {
    message,
    meta: { message },
  };
}

test("queryServiceClaimsList retries without missing optional contact columns", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);

      if (sql.includes(`FROM "information_schema"."columns"`)) {
        return [
          { column_name: "attachmentsJson" },
          { column_name: "problemAreasJson" },
        ];
      }

      if (sql.includes(`"landlordCompanyPhone"`)) {
        throw missingColumnError("landlordCompanyPhone");
      }
      if (sql.includes(`"landlordCompanyEmail"`)) {
        throw missingColumnError("landlordCompanyEmail");
      }

      return [{ id: "claim_1" }];
    },
  };

  const result = await queryServiceClaimsList(prisma, { q: "berlin" });

  assert.deepEqual(result, [{ id: "claim_1" }]);
  assert.equal(queries.length, 2);
  assert.match(queries[0], /FROM "information_schema"\."columns"/);
  assert.doesNotMatch(queries[1], /"landlordCompanyPhone"/);
  assert.doesNotMatch(queries[1], /"landlordCompanyEmail"/);
  assert.match(queries[1], /"attachmentsJson"/);
});

test("queryServiceClaimById still retries when attachmentsJson is missing", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);

      if (sql.includes(`FROM "information_schema"."columns"`)) {
        return [
          { column_name: "problemAreasJson" },
        ];
      }

      if (sql.includes(`"attachmentsJson"`)) {
        throw missingColumnError("attachmentsJson");
      }

      return [{ id: "claim_2" }];
    },
  };

  const result = await queryServiceClaimById(prisma, "claim_2");

  assert.deepEqual(result, [{ id: "claim_2" }]);
  assert.equal(queries.length, 2);
  assert.match(queries[0], /FROM "information_schema"\."columns"/);
  assert.doesNotMatch(queries[1], /"attachmentsJson"/);
});

test("queryServiceClaimsList retries when problemAreasJson is missing", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);

      if (sql.includes(`FROM "information_schema"."columns"`)) {
        return [
          { column_name: "attachmentsJson" },
        ];
      }

      if (sql.includes(`"problemAreasJson"`)) {
        throw missingColumnError("problemAreasJson");
      }

      return [{ id: "claim_3" }];
    },
  };

  const result = await queryServiceClaimsList(prisma, { q: "dishwasher" });

  assert.deepEqual(result, [{ id: "claim_3" }]);
  assert.equal(queries.length, 2);
  assert.match(queries[0], /FROM "information_schema"\."columns"/);
  assert.doesNotMatch(queries[1], /"problemAreasJson"/);
  assert.match(queries[1], /LEFT JOIN "KitchenContract"/);
  assert.match(queries[1], /LEFT JOIN "Kitchen" k/);
});

test("queryServiceClaimById selects the kitchen slug for claim previews", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);

      if (sql.includes(`FROM "information_schema"."columns"`)) {
        return [];
      }

      return [{ id: "claim_4" }];
    },
  };

  const result = await queryServiceClaimById(prisma, "claim_4");

  assert.deepEqual(result, [{ id: "claim_4" }]);
  assert.equal(queries.length, 2);
  assert.match(queries[1], /k\."slug" AS "kitchenSlug"/);
  assert.match(queries[1], /k\."name" AS "kitchenName"/);
});
