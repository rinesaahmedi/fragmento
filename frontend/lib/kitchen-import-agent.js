import fs from "fs";
import path from "path";
import { spawn } from "child_process";

function repoRootPath() {
  return path.resolve(process.cwd(), "..");
}

function scriptPath() {
  return path.join(process.cwd(), "scripts", "run-kitchen-codex-agent.mjs");
}

function relativeFromFrontend(absolutePath) {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

function boolFromForm(value, defaultValue = true) {
  if (value == null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return defaultValue;
  return !["0", "false", "off", "no"].includes(normalized);
}

export function shouldStartKitchenImportAgent(formData) {
  const values = typeof formData.getAll === "function" ? formData.getAll("startCodexAgent") : [formData.get("startCodexAgent")];
  const submitted = values.filter((value) => value != null);
  if (!submitted.length) return true;
  return submitted.some((value) => boolFromForm(value, false));
}

export function buildKitchenImportAgentPrompt({
  kitchen,
  supplierExcelPath,
  planPdfPath,
}) {
  const frontendDir = process.cwd();
  const publicPdfPath = planPdfPath
    ? path.join(frontendDir, "public", ...decodeURIComponent(String(planPdfPath).replace(/^\//, "")).split("/"))
    : "";

  return [
    "You are Codex. A kitchen was uploaded through Fragmento's Import Kitchen from PDF + Excel form.",
    "",
    "Your entire job is to finish this kitchen by doing exactly this:",
    "1. Read docs/kitchen-from-pdf-agent-guide.md completely.",
    "2. Look at the uploaded plan PDF.",
    "3. Look at the uploaded supplier Excel/CSV.",
    "4. Follow docs/kitchen-from-pdf-agent-guide.md entirely until the kitchen is finished.",
    "",
    "Do not invent a different workflow. Do not treat the preliminary import as final truth. The PDF, Excel, and guide are the source of truth.",
    "",
    "Inputs:",
    "- Guide: docs/kitchen-from-pdf-agent-guide.md",
    `- Plan PDF: ${publicPdfPath || planPdfPath || ""}`,
    `- Supplier Excel/CSV: ${supplierExcelPath || ""}`,
    "",
    "Kitchen record created by the upload:",
    `- Kitchen id: ${kitchen.id}`,
    `- Kitchen slug: ${kitchen.slug}`,
    `- Kitchen name: ${kitchen.name}`,
    `- Kitchen code: ${kitchen.kitchenCode || ""}`,
    "",
    "Do not update the Kitchen importAgentStatus, importAgentStartedAt, importAgentFinishedAt, importAgentLogPath, or importAgentLastMessage fields. The runner updates those fields after your process exits.",
    "",
    "When you are done, leave the kitchen working and verified according to the guide.",
  ].join("\n");
}

export async function startKitchenImportAgent({ prisma, kitchenId, importResult }) {
  const kitchen = importResult?.kitchen;
  if (!kitchen?.id || kitchen.id !== kitchenId) {
    return { started: false, warning: "Codex agent was not started because the imported kitchen record was missing." };
  }

  const runnerPath = scriptPath();
  if (!fs.existsSync(runnerPath)) {
    return { started: false, warning: "Codex agent runner script is missing." };
  }

  const workspacePath = importResult.importWorkspacePath || path.join(process.cwd(), ".kitchen-imports", kitchen.slug);
  fs.mkdirSync(workspacePath, { recursive: true });
  const logPath = path.join(workspacePath, "codex-agent.log");
  const promptPath = path.join(workspacePath, "codex-agent-prompt.md");
  const finalMessagePath = path.join(workspacePath, "codex-agent-final.md");
  const prompt = buildKitchenImportAgentPrompt({
    kitchen,
    supplierExcelPath: importResult.supplierExcelPath,
    planPdfPath: kitchen.planPdfPath,
  });
  fs.writeFileSync(promptPath, prompt, "utf8");

  await prisma.kitchen.update({
    where: { id: kitchen.id },
    data: {
      status: "DRAFT",
      importAgentStatus: "QUEUED",
      importAgentStartedAt: new Date(),
      importAgentFinishedAt: null,
      importAgentLogPath: relativeFromFrontend(logPath),
      importAgentLastMessage: `Codex finisher queued after import. Public status is held as DRAFT until completion; target status is ${kitchen.status}.`,
    },
  });

  const child = spawn(process.execPath, [
    runnerPath,
    "--kitchen-id",
    kitchen.id,
    "--prompt",
    promptPath,
    "--log",
    logPath,
    "--final",
    finalMessagePath,
    "--target-status",
    kitchen.status,
  ], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  child.unref();

  return {
    started: true,
    logPath: relativeFromFrontend(logPath),
    promptPath: relativeFromFrontend(promptPath),
  };
}
