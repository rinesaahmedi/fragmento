const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sourcePath = path.join(__dirname, "..", "components", "service-claim-flow.js");

test("each electrical appliance can submit its own serial-number photo", () => {
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.match(source, /const \[serialNumberImageByComponentId,\s*setSerialNumberImageByComponentId\] = useState\(\{\}\)/);
  assert.match(source, /function handleProblemAreaSerialNumberImageSelected\(componentId, event\)/);
  assert.match(source, /accept=\{SERIAL_NUMBER_IMAGE_ACCEPT\}[\s\S]*?handleProblemAreaSerialNumberImageSelected\([\s\S]*?area\.rowComponentId/);
  assert.match(source, /formData\.append\(`serialNumberImage:\$\{area\.rowComponentId\}`, area\.serialNumberImage\)/);
  assert.doesNotMatch(source, /accept=\{SERIAL_NUMBER_IMAGE_ACCEPT\}\s+multiple/);
  assert.match(source, /URL\.createObjectURL\(previewFile\)/);
  assert.doesNotMatch(source, /window\.open\(/);
  assert.match(source, /className="service-attachments__view"/);
  assert.match(source, /className="service-file-preview__dialog"/);
});

test("registration verification offers order or claim next steps", () => {
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.match(source, /setMode\("registered-next"\)/);
  assert.doesNotMatch(source, /setMode\("complaint"\);\s*\}\s*catch \(submitError\)/);
  assert.match(source, /completedRegistrationOrderHref/);
  assert.match(source, /registeredNextOrderTitle/);
  assert.match(source, /registeredNextClaimTitle/);
});
