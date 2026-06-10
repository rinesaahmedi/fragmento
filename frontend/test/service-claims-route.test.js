import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(__dirname, "..", "app", "api", "service-claims", "route.js");

test("service-claims route retries inserts when landlord company columns are missing", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /getMissingOptionalInsertColumns/);
  assert.match(source, /information_schema"\."columns/);
  assert.match(source, /getServiceClaimInsertColumnSupport/);
  assert.match(source, /landlordCompanyPhone/);
  assert.match(source, /landlordCompanyEmail/);
  assert.match(source, /includeLandlordCompanyPhone:\s*true/);
  assert.match(source, /includeLandlordCompanyEmail:\s*true/);
  assert.match(source, /await insertServiceClaimRecord\(prisma,\s*payload\)/);
});

test("service-claims route embeds a kitchen preview png in notification emails when available", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /renderClaimKitchenPreviewPng/);
  assert.match(source, /buildClaimKitchenPreviewAttachment/);
  assert.match(source, /claim-kitchen-preview@fragmento/);
  assert.match(source, /contentDisposition:\s*"inline"/);
  assert.match(source, /buildComplaintEmailHtml\(emailPayload,\s*kitchenPreviewAttachment\?\.cid \|\| ""\)/);
});
