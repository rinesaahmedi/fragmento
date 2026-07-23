import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildServiceClaimReferencePlan,
  normalizeServiceClaimPlanPdfPath,
  normalizeServiceClaimPlanPreviewPath,
} from "../lib/service-claim-reference-plan.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

test("claim plan paths accept only local PDFs below /pdfs", () => {
  assert.equal(
    normalizeServiceClaimPlanPdfPath("/pdfs/AB%20105825%20final.pdf"),
    "/pdfs/AB%20105825%20final.pdf",
  );
  assert.equal(normalizeServiceClaimPlanPdfPath("https://example.com/plan.pdf"), "");
  assert.equal(normalizeServiceClaimPlanPdfPath("/pdfs/../secret.pdf"), "");
  assert.equal(normalizeServiceClaimPlanPdfPath("/pdfs/plan.svg"), "");
  assert.equal(
    normalizeServiceClaimPlanPdfPath("/api/service-claims/contracts/KV-42/plan-assets/pdf"),
    "/api/service-claims/contracts/KV-42/plan-assets/pdf",
  );
});

test("claim plan previews accept only local raster image paths", () => {
  assert.equal(
    normalizeServiceClaimPlanPreviewPath("/jpg/AB%20105825_page-0001.jpg"),
    "/jpg/AB%20105825_page-0001.jpg",
  );
  assert.equal(normalizeServiceClaimPlanPreviewPath("/pdfs/plan.pdf"), "");
  assert.equal(normalizeServiceClaimPlanPreviewPath("/jpg/../secret.jpg"), "");
  assert.equal(normalizeServiceClaimPlanPreviewPath("https://example.com/plan.jpg"), "");
  assert.equal(
    normalizeServiceClaimPlanPreviewPath("/api/service-claims/contracts/KV-42/plan-assets/preview"),
    "/api/service-claims/contracts/KV-42/plan-assets/preview",
  );
});

test("a PDF-only contract produces a reference plan with no selectable components", () => {
  const plan = buildServiceClaimReferencePlan({
    contractNumber: "KV-42",
    claimPlanPdfPath: "/pdfs/example-plan.pdf",
    claimPlanPreviewPath: "/jpg/example-plan.jpg",
    kitchen: {
      slug: "pdf-only-kitchen",
      name: "Archived kitchen plan",
    },
  });

  assert.equal(plan.selectionMode, "reference-pdf");
  assert.equal(plan.referenceOnly, true);
  assert.equal(plan.pdfPath, "/pdfs/example-plan.pdf");
  assert.equal(plan.previewImagePath, "/jpg/example-plan.jpg");
  assert.equal(plan.kitchenName, "");
  assert.deepEqual(plan.selectableComponentIds, []);
  assert.deepEqual(plan.selectableComponents, []);
});

test("service form renders the reference sketch and requires affected component details", () => {
  const flow = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");
  const viewer = fs.readFileSync(path.join(repoRoot, "components", "service-claim-reference-plan.jsx"), "utf8");
  const styles = fs.readFileSync(path.join(repoRoot, "app", "globals.css"), "utf8");

  assert.match(flow, /selectionMode === "reference-pdf"/);
  assert.match(flow, /referenceElectricalQuestion/);
  assert.match(flow, /referenceFurnitureQuestion/);
  assert.match(flow, /hasMissingReferenceIssueChoice/);
  assert.match(viewer, /service-claim-reference-plan__image/);
  assert.doesNotMatch(viewer, /type="application\/pdf"/);
  assert.doesNotMatch(viewer, /service-claim-reference-plan__notice/);
  assert.match(viewer, /target="_blank"/);
  assert.match(viewer, /naturalWidth >= image\.naturalHeight \? "landscape" : "portrait"/);
  assert.match(styles, /\.service-claim-reference-plan__image-stage\.is-landscape/);
  assert.match(styles, /max-height: min\(580px, 64vh\)/);
  assert.match(flow, /referencePlanTitle: "Kitchen sketch"/);
  assert.doesNotMatch(flow, /Selectable article data is not available/);
});

test("dashboard contract forms accept sketch and optional PDF uploads", () => {
  const createForm = fs.readFileSync(path.join(repoRoot, "components", "admin-contract-create-form.js"), "utf8");
  const editPage = fs.readFileSync(path.join(repoRoot, "app", "admin", "contracts", "[id]", "page.js"), "utf8");
  const createRoute = fs.readFileSync(path.join(repoRoot, "app", "api", "admin", "contracts", "route.js"), "utf8");

  for (const source of [createForm, editPage]) {
    assert.match(source, /encType="multipart\/form-data"/);
    assert.match(source, /name="claimPlanPreviewFile"/);
  }
  assert.match(createForm, /name="claimPlanPdfFile"/);
  assert.match(createRoute, /!claimPlanUploads\.preview/);
  assert.match(createRoute, /Select a kitchen or upload a kitchen sketch/);
});

test("dashboard separates ARC from FRG contract creation", () => {
  const createForm = fs.readFileSync(path.join(repoRoot, "components", "admin-contract-create-form.js"), "utf8");
  const createRoute = fs.readFileSync(path.join(repoRoot, "app", "api", "admin", "contracts", "route.js"), "utf8");
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260722173000_add_kitchen_contract_type", "migration.sql"),
    "utf8",
  );

  assert.match(createForm, /value="ARC"/);
  assert.match(createForm, /value="FRG"/);
  assert.match(createForm, /Contract number and kitchen sketch only/);
  assert.match(createForm, /contractType === "ARC"/);
  assert.match(createRoute, /isArcContract \? null : data\.projectId/);
  assert.match(createRoute, /building: isArcContract \? null/);
  assert.match(migration, /ADD COLUMN "contractType" TEXT NOT NULL DEFAULT 'FRG'/);
  assert.match(migration, /CHECK \("contractType" IN \('ARC', 'FRG'\)\)/);
});

test("claim plan asset migration stores uploads outside the contract row", () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260722160000_add_contract_claim_plan_assets", "migration.sql"),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE "KitchenContractClaimPlanAsset"/);
  assert.match(migration, /"previewBytes" BYTEA/);
  assert.match(migration, /"pdfBytes" BYTEA/);
  assert.match(migration, /ON DELETE CASCADE/);
});

test("claim-plan migrations add schema only and never create or update contracts", () => {
  const previewMigration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260722143000_add_contract_claim_plan_preview", "migration.sql"),
    "utf8",
  );
  const pdfMigration = fs.readFileSync(
    path.join(repoRoot, "prisma", "migrations", "20260722120000_add_contract_claim_plan_pdf", "migration.sql"),
    "utf8",
  );

  assert.match(previewMigration, /ADD COLUMN "claimPlanPreviewPath" TEXT/);
  assert.match(pdfMigration, /ADD COLUMN "claimPlanPdfPath" TEXT/);
  for (const migration of [previewMigration, pdfMigration]) {
    assert.doesNotMatch(migration, /INSERT INTO "KitchenContract"/);
    assert.doesNotMatch(migration, /UPDATE "KitchenContract"/);
    assert.doesNotMatch(migration, /contractNumber/);
  }
});
