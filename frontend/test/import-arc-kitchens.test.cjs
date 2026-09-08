const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildContractNumber,
  parseArcImageFileName,
  parseArgs,
} = require("../scripts/import-arc-kitchens.cjs");

test("ARC image filenames map to 111 and 670 contract numbers", () => {
  assert.deepEqual(parseArcImageFileName("AB-103796_product.jpg"), {
    abCode: "103796",
    fileName: "AB-103796_product.jpg",
  });
  assert.equal(buildContractNumber("111", "103796"), "111103796");
  assert.equal(buildContractNumber("670", "103796"), "670103796");
});

test("ARC importer ignores files outside the expected naming convention", () => {
  assert.equal(parseArcImageFileName("AB-103796.jpg"), null);
  assert.equal(parseArcImageFileName("notes.txt"), null);
});

test("ARC importer is a dry run unless --apply is explicit", () => {
  assert.deepEqual(parseArgs([]).contractPrefixes, ["111", "670"]);
  assert.equal(parseArgs([]).apply, false);
  assert.equal(parseArgs(["--apply"]).apply, true);
  assert.equal(parseArgs(["--apply", "--dry-run"]).apply, false);
  assert.deepEqual(parseArgs(["--contract-prefix=670"]).contractPrefixes, ["670"]);
  assert.deepEqual(parseArgs(["--contract-prefixes=111,670,111"]).contractPrefixes, ["111", "670"]);
});
