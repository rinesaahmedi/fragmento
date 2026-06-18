import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { parseDimensions, parseSupplierKitchenSheet } from "../lib/kitchen-import-sheet.js";
import { planSupplierImportMappings } from "../lib/kitchen-import-rules.js";
import { classifySupplierRow } from "../lib/kitchen-supplier-row.js";
test("parseDimensions maps wall cabinet triples", () => {
  assert.deepEqual(parseDimensions("600/720/340 mm"), {
    widthMm: 600,
    heightMm: 720,
    depthMm: 340,
  });
});

test("parseDimensions maps base cabinet pairs to 878 mm height", () => {
  assert.deepEqual(parseDimensions("600/600 mm"), {
    widthMm: 600,
    heightMm: 878,
    depthMm: 600,
  });
  assert.deepEqual(parseDimensions("300/600 mm"), {
    widthMm: 300,
    heightMm: 878,
    depthMm: 600,
  });
});

test("parseDimensions maps tall fridge height in cm", () => {
  assert.deepEqual(parseDimensions("178 cm"), {
    widthMm: 710,
    heightMm: 1780,
    depthMm: null,
  });
});

test("empty price does not treat a real article row as DEFAULT", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["AB 105811"],
    ["NR", "ARTICLE NR 1", "DIMENSIONET", "CMIMI"],
    [7, "H6002", "600/720/340 mm", ""],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  const binary = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

  const { rows } = parseSupplierKitchenSheet(binary, "105811.xlsx");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].isDefault, false);
  assert.equal(classifySupplierRow(rows[0]), "wall-cabinet");
});

test("parseSupplierKitchenSheet skips repeated headers between kitchen parts", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["AB 105833"],
    ["NR", "ARTICLE NR 1", "ARTICLE NR 2", "DIMENSIONET", "L/R", "CMIMI"],
    [1, "DEFAULT", "", "", "", ""],
    [4, "OL-KGCN388140E", "", "178 cm", "", "579"],
    [6, "US60", "", "600/600 mm", "L", "219"],
    [],
    ["NR", "ARTICLE NR 1", "ARTICLE NR 2", "DIMENSIONET", "L/R", "CMIMI"],
    [12, "DEFAULT", "", "", "", ""],
    [13, "DEFAULT", "", "", "", ""],
    [15, "A-EGSPV597210", "TGV60", "", "", "579"],
    [18, "H6002", "", "600/720/340 mm", "L", "149"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  const binary = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

  const { rows } = parseSupplierKitchenSheet(binary, "105833.xlsx");
  assert.equal(rows.length, 7);
  assert.equal(rows.some((row) => row.nr === "NR"), false);
  assert.deepEqual(rows.map((row) => row.nr), ["1", "4", "6", "12", "13", "15", "18"]);

  const plan = planSupplierImportMappings({ supplierRows: rows, callouts: [] });
  assert.equal(plan.ok, true, plan.errors.join("; "));
});