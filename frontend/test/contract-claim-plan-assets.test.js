import assert from "node:assert/strict";
import test from "node:test";
import {
  hasContractClaimPlanUpload,
  readContractClaimPlanUploads,
  upsertContractClaimPlanUploads,
} from "../lib/contract-claim-plan-assets.js";

function uploadFile(name, type, content) {
  const bytes = Buffer.from(content);
  return {
    name,
    type,
    size: bytes.length,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
}

test("dashboard uploads accept a raster sketch and optional PDF", async () => {
  const values = new Map([
    ["claimPlanPreviewFile", uploadFile("My Kitchen.png", "image/png", "image")],
    ["claimPlanPdfFile", uploadFile("My Kitchen.pdf", "application/pdf", "pdf")],
  ]);
  const uploads = await readContractClaimPlanUploads({ get: (key) => values.get(key) });

  assert.equal(uploads.preview.fileName, "My Kitchen.png");
  assert.equal(uploads.preview.mimeType, "image/png");
  assert.equal(uploads.pdf.fileName, "My Kitchen.pdf");
  assert.equal(uploads.pdf.mimeType, "application/pdf");
  assert.equal(hasContractClaimPlanUpload(uploads), true);
});

test("dashboard uploads reject unsupported sketch formats", async () => {
  const values = new Map([
    ["claimPlanPreviewFile", uploadFile("plan.svg", "image/svg+xml", "svg")],
  ]);

  await assert.rejects(
    readContractClaimPlanUploads({ get: (key) => values.get(key) }),
    /JPG, PNG, or WebP/,
  );
});

test("uploaded plan assets are upserted for the contract", async () => {
  const calls = [];
  const client = {
    async $executeRaw(strings, ...values) {
      calls.push({ sql: strings.join("?"), values });
      return 1;
    },
  };
  const uploads = {
    preview: { bytes: Buffer.from("image"), mimeType: "image/jpeg", fileName: "plan.jpg" },
    pdf: null,
  };

  await upsertContractClaimPlanUploads(client, "contract-1", uploads);

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /ON CONFLICT \("kitchenContractId"\) DO UPDATE/);
  assert.ok(calls[0].values.includes("contract-1"));
  assert.ok(calls[0].values.includes("image/jpeg"));
});
