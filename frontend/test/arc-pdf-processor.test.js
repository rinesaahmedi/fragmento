import assert from "node:assert/strict";
import test from "node:test";
import { parseAbCodeFromPdfName } from "../lib/arc-pdf-processor.js";

test("PDF filenames accept supported AB separators and suffixes", () => {
  assert.equal(parseAbCodeFromPdfName("AB-103796.pdf"), "103796");
  assert.equal(parseAbCodeFromPdfName("AB 103796 final.pdf"), "103796");
  assert.equal(parseAbCodeFromPdfName("drawing_ab_103796_v2.PDF"), "103796");
});

test("PDF filenames reject missing or ambiguous AB codes", () => {
  assert.equal(parseAbCodeFromPdfName("103796.pdf"), null);
  assert.equal(parseAbCodeFromPdfName("AB-103796 AB-103797.pdf"), null);
});
