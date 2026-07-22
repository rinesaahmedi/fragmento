import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const flowPath = path.join(__dirname, "..", "components", "service-claim-flow.js");
const cssPath = path.join(__dirname, "..", "app", "globals.css");

test("claim form reports missing required contact and address fields before submit", () => {
  const flowSource = fs.readFileSync(flowPath, "utf8");
  const cssSource = fs.readFileSync(cssPath, "utf8");

  assert.match(flowSource, /CLIENT_CONTACT_REQUIRED_FIELDS/);
  assert.match(flowSource, /CLIENT_ADDRESS_REQUIRED_FIELDS/);
  assert.match(flowSource, /CLAIM_REQUIRED_FIELDS/);
  assert.match(flowSource, /showClaimRequiredErrors/);
  assert.match(flowSource, /isClaimRequiredAlertDismissed/);
  assert.match(flowSource, /hasMissingClaimRequiredFields/);
  assert.match(flowSource, /shouldShowClaimRequiredAlert/);
  assert.match(flowSource, /clientAddressSectionRef/);
  assert.match(flowSource, /IntersectionObserver/);
  assert.match(flowSource, /data-claim-required-group/);
  assert.match(flowSource, /data-claim-required-field/);
  assert.match(flowSource, /onInvalidCapture=\{handleClaimFormInvalid\}/);
  assert.match(flowSource, /requiredFieldMissing/);
  assert.match(flowSource, /requiredFieldsAlertText/);
  assert.match(flowSource, /focusFirstMissingClaimRequiredField/);
  assert.match(flowSource, /service-required-alert__close/);
  assert.match(flowSource, /setIsClaimRequiredAlertDismissed\(true\)/);
  assert.match(flowSource, /aria-invalid=\{shouldShowClaimRequiredError\("gender"\)\}/);
  assert.match(flowSource, /aria-invalid=\{shouldShowClaimRequiredError\("phone"\)\}/);
  assert.match(flowSource, /aria-invalid=\{shouldShowClaimRequiredError\("clientFloor"\)\}/);
  assert.match(flowSource, /aria-invalid=\{shouldShowClaimRequiredError\("clientAddressLine1"\)\}/);
  assert.match(cssSource, /\.service-field input\[aria-invalid="true"\]/);
  assert.match(cssSource, /\.service-field > \.service-field__error/);
  assert.match(cssSource, /\.service-required-alert/);
  assert.match(cssSource, /\.service-required-alert__action/);
  assert.match(cssSource, /\.service-required-alert__close/);
});

test("claim form clears validation alerts after successful submit reset", () => {
  const flowSource = fs.readFileSync(flowPath, "utf8");

  assert.match(
    flowSource,
    /setSuccessMessage\(payloadResponse\.message \|\| copy\.submitSuccess\);\s*setShowClaimRequiredErrors\(false\);\s*setIsClaimRequiredAlertDismissed\(false\);\s*setShowProblemAreaAttachmentErrors\(false\);\s*setForm\(INITIAL_FORM\);/,
  );
});

test("claim form requires an upload for every selected problem component", () => {
  const flowSource = fs.readFileSync(flowPath, "utf8");
  const cssSource = fs.readFileSync(cssPath, "utf8");

  assert.match(flowSource, /showProblemAreaAttachmentErrors/);
  assert.match(flowSource, /missingProblemAreaAttachmentIds/);
  assert.match(flowSource, /hasMissingProblemAreaAttachments/);
  assert.match(flowSource, /problemAreaAttachmentRequired/);
  assert.match(flowSource, /data-problem-area-upload-required/);
  assert.match(flowSource, /setShowProblemAreaAttachmentErrors\(true\)/);
  assert.match(flowSource, /firstMissingUpload\?\.scrollIntoView/);
  assert.match(flowSource, /formData\.append\(`problemAreaAttachment:\$\{resolvedArea\.componentId\}`/);
  assert.match(cssSource, /\.service-field__problem-area-upload-button\.is-required-missing/);
  assert.match(cssSource, /\.service-field__problem-area-error/);
  assert.match(flowSource, /referenceDamagePhotos/);
  assert.match(flowSource, /data-reference-damage-upload-required/);
  assert.match(flowSource, /problemAreaAttachment:reference-electrical-/);
  assert.match(flowSource, /problemAreaAttachment:reference-furniture-/);
});

test("preferred contact time picker closes after a time is selected", () => {
  const flowSource = fs.readFileSync(flowPath, "utf8");

  assert.match(
    flowSource,
    /function handlePreferredContactTimeSelect[\s\S]*handleFieldChange\(field, nextTime\);\s*setOpenPreferredContactTimeField\(null\);/,
  );
  assert.match(flowSource, /handlePreferredContactTimeToggle/);
});
