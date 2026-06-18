import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { importKitchenFromFiles } from "../lib/kitchen-import.js";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || !process.argv[index + 1]) {
    return "";
  }
  return process.argv[index + 1];
}

const pdfPath = readArg("--pdf");
const excelPath = readArg("--excel");
const name = readArg("--name");
const kitchenCode = readArg("--code");
const contractNumber = readArg("--contract");
const layoutTemplateKitchenId = readArg("--template-id");

if (!pdfPath || !excelPath || !name || !kitchenCode) {
  console.error(
    "Usage: node scripts/import-kitchen.mjs --pdf <path> --excel <path> --name <name> --code <code> [--contract <nr>] [--template-id <id>]",
  );
  process.exit(1);
}

if (!fs.existsSync(pdfPath) || !fs.existsSync(excelPath)) {
  console.error("PDF or Excel file not found.");
  process.exit(1);
}

const pdfBuffer = fs.readFileSync(pdfPath);
const excelBuffer = fs.readFileSync(excelPath);
const formData = new FormData();
formData.set("name", name);
formData.set("kitchenCode", kitchenCode);
formData.set("status", "ACTIVE");
if (contractNumber) {
  formData.set("contractNumber", contractNumber);
}
if (layoutTemplateKitchenId) {
  formData.set("layoutTemplateKitchenId", layoutTemplateKitchenId);
}
formData.set(
  "pdfFile",
  new File([pdfBuffer], path.basename(pdfPath), { type: "application/pdf" }),
);
formData.set(
  "excelFile",
  new File([excelBuffer], path.basename(excelPath), {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }),
);

const prisma = new PrismaClient();

try {
  const result = await importKitchenFromFiles(formData);
  console.log(`Imported kitchen ${result.kitchen.slug} (${result.kitchen.id}) with ${result.itemCount} items.`);
  if (result.warnings?.length) {
    console.warn("Warnings:");
    for (const warning of result.warnings) {
      console.warn(`- ${warning}`);
    }
  }
  if (result.hotspotVerification) {
    console.log(
      `Hotspot coverage: ${result.hotspotVerification.hotspotCount}/${result.hotspotVerification.expectedCount}`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
