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

test("service-claims route recovers when a running server cached the pre-sequence schema", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /isClaimSequenceNotNullViolation/);
  assert.match(source, /code === "23502"/);
  assert.match(source, /!options\.includeClaimSequence/);
  assert.match(source, /options\.includeClaimSequence = true/);
});

test("service-claims route sends notifications after returning the durable success response", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /import \{ after, NextResponse \} from "next\/server"/);
  assert.match(source, /await insertServiceClaimRecord\(prisma, payload\);[\s\S]*after\(async \(\) =>/);
  assert.match(source, /pending: true/);
});

test("service-claims route requires explicit confirmation for grouped kitchen parts", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /buildServiceClaimComponentChoiceGroups/);
  assert.match(source, /parseConfirmedChoiceGroupKeys/);
  assert.match(source, /confirmedChoiceGroupKeys\.has\(choiceGroup\.sourceComponentKey\)/);
  assert.match(source, /body\.confirmedChoiceGroupsJson/);
});

test("service-claims route requires serial evidence and damage photos for every affected component", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /normalizeReferenceIssuesJson/);
  assert.match(source, /Reference-plan components are not allowed for this contract/);
  assert.match(source, /problemAreaAttachmentPartsByComponentId/);
  assert.match(source, /Upload at least one damage photo/);
  assert.match(source, /Upload a serial-number photo/);
  assert.match(source, /typedCount !== 1 \|\| imageCount !== 1/);
});

test("service-claims route embeds a kitchen preview png in notification emails when available", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /renderClaimKitchenPreviewPng/);
  assert.match(source, /buildClaimKitchenPreviewAttachment/);
  assert.match(source, /claim-kitchen-preview@fragmento/);
  assert.match(source, /contentDisposition:\s*"inline"/);
  assert.match(source, /buildComplaintEmailHtml\(emailPayload,\s*kitchenPreviewAttachment\)/);
});

test("service-claims route embeds the ARC contract sketch or attaches its PDF fallback", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /getPublicContractClaimPlanAsset/);
  assert.match(source, /buildArcReferencePlanEmailAttachment/);
  assert.match(source, /payload\?\.contractType !== "ARC"/);
  assert.match(source, /arc-kitchen-sketch@fragmento/);
  assert.match(source, /ARC-Küchenskizze/);
  assert.match(source, /Küchenskizze als PDF im Anhang/);
  assert.match(source, /contractType:\s*contract\.contractType/);
});
test("service-claims route resolves item names and article numbers from the contract kitchen database", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /getServiceClaimKitchenPlan\(contractNumber\)/);
  assert.match(source, /databaseAreasByComponentId\.get\(componentId\)/);
  assert.match(source, /const databaseGermanName = String\(databaseArea\.nameDe/);
  assert.match(source, /name:\s*databaseGermanName/);
  assert.doesNotMatch(source, /databaseArea\.nameDe \|\| databaseArea\.name/);
  assert.match(source, /code:\s*String\(databaseArea\.articleCode \|\| databaseArea\.code/);
  assert.match(source, /const resolvedProblemAreasJson = await resolveProblemAreasFromDatabase/);
});

test("service-claim notification email separates every item field into German rows", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, />Type</);
  assert.match(source, />Typen - NR</);
  assert.match(source, />Problembeschreibung</);
  assert.match(source, />Anhänge</);
  assert.match(source, /Hochgeladenes Bild/);
  assert.match(source, /Siehe Seriennummernfoto in den Anhängen/);
  assert.doesNotMatch(source, /Uploaded image|Kitchen preview with selected claim area highlighted|See serial number photo|Not applicable/);
  assert.doesNotMatch(source, /StringForEmail/);
});

test("service-claim item email uses the component name as its heading and keeps upload labels compact", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /\[row\.name \|\| `Küchenteil \$\{index \+ 1\}`/);
  assert.match(source, /padding-right:24px/);
  assert.match(source, /padding-left:20px/);
  assert.match(source, /formatAttachmentHtml\(entry, \{ includeItemContext: false \}\)/);
  assert.match(source, /function formatAttachmentFileMetaLine/);
  assert.match(source, /serialAttachmentsByComponentId/);
  assert.match(source, /isElectricalAppliance: isElectricalApplianceProblemArea\(area\)/);
  assert.match(source, /row\.isElectricalAppliance/);
  assert.match(source, />Seriennummer</);
  assert.match(source, />Seriennummer-Foto</);
  assert.doesNotMatch(source, /\["Seriennummer",\s*payload\.serialNumber\]/);
});

test("service-claim email requests the PDF-derived ordered-component kitchen preview", () => {
  const previewSource = fs.readFileSync(
    path.join(__dirname, "..", "lib", "claim-kitchen-preview.js"),
    "utf8",
  );
  const planSource = fs.readFileSync(
    path.join(__dirname, "..", "lib", "service-claim-kitchen-plan.js"),
    "utf8",
  );

  assert.match(previewSource, /PLAN_IMAGE_BY_SLUG/);
  assert.match(previewSource, /source:\s*"pdf-plan"/);
  assert.match(previewSource, /visibleComponentIds/);
  assert.match(previewSource, /selectedHotspots/);
  assert.match(previewSource, /opacity:0\.3/);
  assert.match(previewSource, /alpha:\s*0\.72/);
  assert.doesNotMatch(previewSource, /\.linear\(\[1,\s*1,\s*1,\s*0\.1\]/);
  assert.match(planSource, /confirmedItems:\s*contractOrderState\.confirmedItems/);
  assert.doesNotMatch(planSource, /SHOW_FULL_KITCHEN_IN_SERVICE_CLAIMS/);
});

test("service-claim email omits the logo and the duplicate final problem-description row", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.doesNotMatch(source, /buildLogoAttachment|buildComplaintEmailLogoHtml|logo@fragmento/);
  assert.doesNotMatch(source, /\["Problembeschreibung",\s*standaloneProblemText/);
  assert.doesNotMatch(source, /"Problem",\s*standaloneProblemText/);
  assert.match(source, />Problembeschreibung</);
});

test("service-claim email separates landlord and caretaker contact details into rows", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /function buildEmailDetailSubtable/);
  assert.match(source, /function hasPartyContactDetails/);
  assert.match(source, /\["Vermieter", \{ html: landlordHtml \}\]/);
  assert.match(source, /hasHausmeisterDetails \? \[\["Hausmeister", \{ html: hausmeisterHtml \}\]\] : \[\]/);
  assert.match(source, /hasHausmeisterDetails \? \["", "Hausmeister", hausBlock\] : \[\]/);
  assert.match(source, /\["Firma", payload\.landlordCompanyName\]/);
  assert.match(source, /\["Telefon Firma", payload\.landlordCompanyPhone\]/);
  assert.match(source, /\["E-Mail Firma", payload\.landlordCompanyEmail\]/);
  assert.match(source, /\["Ansprechperson", landlordContactDisplay/);
  assert.match(source, /\["Telefon", payload\.hausmeisterPhone\]/);
  assert.match(source, /\["E-Mail", payload\.hausmeisterEmail\]/);
});

test("service-claim email separates preferred contact date and time into German rows", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.match(source, /function formatGermanPreferredContactTime/);
  assert.match(source, /\["Gewünschtes Kontaktdatum", availabilityDate\]/);
  assert.match(source, /\["Gewünschte Kontaktzeit", availabilityTime\]/);
  assert.match(source, /GewÃ¼nschtes Kontaktdatum:/);
  assert.match(source, /GewÃ¼nschte Kontaktzeit:/);
  assert.match(source, /Eigene Uhrzeit/);
  assert.doesNotMatch(source, /\["Erreichbarkeit", availability\]/);
});
