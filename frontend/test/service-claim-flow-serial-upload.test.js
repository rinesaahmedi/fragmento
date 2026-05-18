const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sourcePath = path.join(__dirname, "..", "components", "service-claim-flow.js");

test("serial number photo field accepts multiple files and submits them all as attachments", () => {
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.match(
    source,
    /accept=\{SERIAL_NUMBER_IMAGE_ACCEPT\}[\s\S]*?multiple[\s\S]*?onChange=\{handleSerialNumberImageSelected\}/,
  );
  assert.match(source, /const \[serialNumberImages,\s*setSerialNumberImages\] = useState\(\[\]\)/);
  assert.match(source, /for \(const file of serialNumberImages\) \{\s*formData\.append\("attachments", file\);/);
});
