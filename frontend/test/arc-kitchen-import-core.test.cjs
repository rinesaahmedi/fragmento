const assert = require("node:assert/strict");
const test = require("node:test");
const {
  applyImport,
  buildImportPlan,
  normalizeImages,
  parseArcImageFileName,
  sha256,
} = require("../lib/arc-kitchen-import-core.cjs");

function jpeg(label) {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from(label)]);
}

function image(abCode, label = abCode) {
  const bytes = jpeg(label);
  return {
    abCode,
    fileName: `AB-${abCode}_product.jpg`,
    byteLength: bytes.length,
    sha256: sha256(bytes),
    bytes,
  };
}

test("ARC product filenames accept the canonical JPG shape", () => {
  assert.deepEqual(parseArcImageFileName("AB-103796_product.jpg"), { abCode: "103796", fileName: "AB-103796_product.jpg" });
  assert.deepEqual(parseArcImageFileName("ab_103796_product.JPEG"), { abCode: "103796", fileName: "ab_103796_product.JPEG" });
  assert.equal(parseArcImageFileName("AB-103796.jpg"), null);
});

test("ARC image validation rejects duplicates, invalid JPEG bytes, and hash mismatches", () => {
  assert.throws(() => normalizeImages([image("103796"), image("103796")], { requireBytes: true }), /More than one image/);
  assert.throws(() => normalizeImages([{ ...image("103796"), bytes: Buffer.from("bad"), byteLength: 3, sha256: sha256(Buffer.from("bad")) }], { requireBytes: true }), /not a valid JPEG/);
  assert.throws(() => normalizeImages([{ ...image("103796"), sha256: "0".repeat(64) }], { requireBytes: true }), /SHA-256 digest/);
});

test("import plan distinguishes create, update, unchanged, and FRG conflict", async () => {
  const current = image("100001", "same");
  const changed = image("100002", "new");
  const client = {
    kitchenContract: {
      async findMany() {
        return [
          { contractNumber: "111100001", contractType: "ARC", claimPlanAsset: { previewBytes: current.bytes, previewMimeType: "image/jpeg", previewFileName: current.fileName } },
          { contractNumber: "111100002", contractType: "ARC", claimPlanAsset: { previewBytes: jpeg("old"), previewMimeType: "image/jpeg", previewFileName: changed.fileName } },
          { contractNumber: "111100003", contractType: "FRG", claimPlanAsset: null },
        ];
      },
    },
  };
  const plan = await buildImportPlan(client, [current, changed, image("100003"), image("100004")], ["111"]);
  assert.deepEqual(plan.entries.map((entry) => entry.action), ["unchanged", "update", "conflict", "create"]);
  assert.deepEqual(plan.summary, { create: 1, update: 1, unchanged: 1, conflict: 1 });
});

test("apply creates new ARC contracts and updates only existing sketch assets", async () => {
  const created = image("100010");
  const updated = image("100011", "new");
  const calls = { create: [], asset: [] };
  const tx = {
    kitchenContract: {
      async findMany() {
        return [{ contractNumber: "111100011", contractType: "ARC", claimPlanAsset: { previewBytes: jpeg("old"), previewMimeType: "image/jpeg", previewFileName: updated.fileName } }];
      },
      async create({ data }) {
        calls.create.push(data);
        return { id: "new-contract" };
      },
      async findUnique() {
        return { id: "existing-contract" };
      },
    },
    kitchen: { async upsert() { return { id: "pdf-only" }; } },
    kitchenContractClaimPlanAsset: {
      async upsert(args) {
        calls.asset.push(args);
      },
    },
  };
  const prisma = { async $transaction(callback) { return callback(tx); } };
  const result = await applyImport(prisma, [created, updated], ["111"]);

  assert.equal(result.summary.create, 1);
  assert.equal(result.summary.update, 1);
  assert.equal(calls.create.length, 1);
  assert.equal(calls.create[0].contractType, "ARC");
  assert.equal(calls.asset.length, 2);
  assert.equal(calls.asset[1].where.kitchenContractId, "existing-contract");
});
