import fs from "fs";
import path from "path";
import { buildComponentSlotKeys, buildHotspotsFromJpg, extractCalloutsFromPdf } from "./kitchen-hotspots.js";
import { runPython } from "./kitchen-plan-python.js";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function encodePublicPath(relativePath) {
  return `/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function derivePlanBaseName({ kitchenCode, kitchenName, pdfFileName }) {
  const fromFile = String(pdfFileName || "")
    .replace(/\.pdf$/i, "")
    .trim();
  if (fromFile) return fromFile;

  const fromCode = String(kitchenCode || "")
    .replace(/\s+/g, " ")
    .trim();
  if (fromCode) {
    return fromCode.toUpperCase().startsWith("AB") ? fromCode : `AB ${fromCode}`;
  }

  const fromName = String(kitchenName || "").trim();
  if (fromName) return fromName;

  throw new Error("Could not determine a plan file name from the PDF, kitchen code, or kitchen name.");
}

export async function processKitchenPlanFiles({ pdfBytes, planBaseName, componentItems }) {
  const publicDir = path.join(process.cwd(), "public");
  const pdfDir = path.join(publicDir, "pdfs");
  const planDir = path.join(publicDir, "plans");
  const jpgDir = path.join(publicDir, "jpg");
  ensureDir(pdfDir);
  ensureDir(planDir);
  ensureDir(jpgDir);

  const safeBaseName = planBaseName.replace(/[<>:"/\\|?*]/g, "-");
  const pdfPath = path.join(pdfDir, `${safeBaseName}.pdf`);
  const svgPath = path.join(planDir, `${safeBaseName}.svg`);
  const jpgPath = path.join(jpgDir, `${safeBaseName}_page-0001.jpg`);

  fs.writeFileSync(pdfPath, Buffer.from(pdfBytes));

  let svgCreated = false;
  try {
    runPython("render-plan-svg.py", [pdfPath, svgPath]);
    svgCreated = fs.existsSync(svgPath) && fs.statSync(svgPath).size > 0;
  } catch {
    svgCreated = false;
  }

  runPython("render-plan-pdf.py", [pdfPath, jpgPath]);

  let hotspots = null;
  if (componentItems?.length) {
    const callouts = extractCalloutsFromPdf(pdfPath);
    const componentSlotKeys = buildComponentSlotKeys(componentItems, callouts);
    hotspots = buildHotspotsFromJpg(jpgPath, componentSlotKeys, { pdfPath });
  }

  const planImagePath = svgCreated
    ? encodePublicPath(`plans/${safeBaseName}.svg`)
    : encodePublicPath(`jpg/${safeBaseName}_page-0001.jpg`);

  return {
    planBaseName: safeBaseName,
    planImagePath,
    planPdfPath: encodePublicPath(`pdfs/${safeBaseName}.pdf`),
    hotspots,
    usedVectorPlan: svgCreated,
  };
}
