import assert from "node:assert/strict";
import test from "node:test";
import path from "path";
import { extractCalloutsFromPdf } from "../lib/kitchen-hotspots.js";
import { planSupplierImportMappings } from "../lib/kitchen-import-rules.js";

function row(nr, articles, dimensions = "", rowNumber = nr + 3) {
  const articlesUpper = String(articles || "").toUpperCase();
  return {
    nr: String(nr),
    articles,
    articlesUpper,
    dimensions,
    isDefault: /^DEFAULT$/i.test(String(articles || "").trim()),
    rowNumber,
    componentKey: "",
  };
}

const AB_105811_ROWS = [
  row(1, "DEFAULT"),
  row(2, "DEFAULT"),
  row(3, "DEFAULT"),
  row(4, "US60", "600/600 mm"),
  row(5, "A-EGSPV597210 + TGV60"),
  row(6, "OL-KGCN388140E", "178 cm"),
  row(7, "H6002", "600/720/340 mm", 10),
  row(8, "H6002", "600/720/340 mm", 11),
  row(9, "H6002", "600/720/340 mm", 12),
  row(10, "FH664621E + HD6002", "", 13),
];

test("planSupplierImportMappings maps AB 105811 excel against its PDF without duplicate slots", () => {
  const pdfPath = path.join(process.cwd(), "public/pdfs/AB 105811.pdf");
  const callouts = extractCalloutsFromPdf(pdfPath);
  const plan = planSupplierImportMappings({
    supplierRows: AB_105811_ROWS,
    callouts,
  });

  assert.equal(plan.ok, true, plan.errors.join("; "));
  assert.equal(plan.assignments.length, 10);
  assert.equal(plan.assignments.find((entry) => entry.row.nr === "1")?.componentKey, "oven-module");
  assert.equal(plan.assignments.find((entry) => entry.row.nr === "7")?.componentKey, "wall-cabinet-1");
  assert.equal(plan.assignments.find((entry) => entry.row.nr === "10")?.componentKey, "wall-cabinet-4");
});

test("planSupplierImportMappings rejects duplicate oven when wall rows were mis-tagged as DEFAULT", () => {
  const badRows = AB_105811_ROWS.map((entry) =>
    entry.nr === "7" ? { ...entry, isDefault: true } : entry,
  );
  const plan = planSupplierImportMappings({
    supplierRows: badRows,
    callouts: [],
  });

  assert.equal(plan.ok, false);
  assert.match(plan.errors.join(" "), /duplicate component slot "oven-module"/i);
});

test("empty CMIMI price does not make H6002 a DEFAULT placeholder row", () => {
  const plan = planSupplierImportMappings({
    supplierRows: [row(7, "H6002", "600/720/340 mm")],
    callouts: [{ nr: 7, xPct: 10, yPct: 30 }],
  });

  assert.equal(plan.ok, true, plan.errors.join("; "));
  assert.equal(plan.assignments[0].componentKey, "wall-cabinet-1");
});
