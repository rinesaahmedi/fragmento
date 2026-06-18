import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { PrismaClient } from "@prisma/client";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || !process.argv[index + 1]) {
    return "";
  }
  return process.argv[index + 1];
}

function codexCommand() {
  if (process.env.FRAGMENTO_CODEX_COMMAND) {
    return process.env.FRAGMENTO_CODEX_COMMAND;
  }
  return process.platform === "win32" ? "codex.cmd" : "codex";
}

function codexModel() {
  return process.env.FRAGMENTO_CODEX_MODEL || "gpt-5.5";
}

function codexReasoningEffort() {
  return process.env.FRAGMENTO_CODEX_REASONING_EFFORT || "medium";
}

function repoRootPath() {
  return path.resolve(process.cwd(), "..");
}

function appendLog(logPath, message) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, message, "utf8");
}

function readFinalMessage(finalMessagePath, fallback) {
  if (finalMessagePath && fs.existsSync(finalMessagePath)) {
    const message = fs.readFileSync(finalMessagePath, "utf8").trim();
    if (message) {
      return message.slice(0, 12000);
    }
  }
  return fallback;
}

async function updateKitchen(prisma, kitchenId, data) {
  await prisma.kitchen.update({
    where: { id: kitchenId },
    data,
  });
}

function runCodex({ prompt, logPath, finalMessagePath }) {
  return new Promise((resolve) => {
    const args = [
      "--ask-for-approval",
      "never",
      "exec",
      "--model",
      codexModel(),
      "-c",
      `model_reasoning_effort="${codexReasoningEffort()}"`,
      "--cd",
      repoRootPath(),
      "--sandbox",
      "danger-full-access",
      "--output-last-message",
      finalMessagePath,
      "-",
    ];

    appendLog(logPath, `Starting Codex: ${codexCommand()} ${args.join(" ")}\n\n`);

    const child = spawn(codexCommand(), args, {
      cwd: process.cwd(),
      env: process.env,
      shell: process.platform === "win32",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => appendLog(logPath, chunk.toString()));
    child.stderr.on("data", (chunk) => appendLog(logPath, chunk.toString()));
    child.on("error", (error) => {
      appendLog(logPath, `\nCodex failed to start: ${error.message}\n`);
      resolve({ code: 127, error });
    });
    child.on("close", (code, signal) => {
      appendLog(logPath, `\nCodex exited with code ${code ?? "null"}${signal ? ` signal ${signal}` : ""}.\n`);
      resolve({ code: code ?? 1, signal });
    });

    child.stdin.end(prompt);
  });
}

const kitchenId = readArg("--kitchen-id");
const promptPath = readArg("--prompt");
const logPath = readArg("--log");
const finalMessagePath = readArg("--final");
const targetStatus = readArg("--target-status") || "ACTIVE";

if (!kitchenId || !promptPath || !logPath || !finalMessagePath) {
  console.error("Usage: node scripts/run-kitchen-codex-agent.mjs --kitchen-id <id> --prompt <path> --log <path> --final <path> [--target-status ACTIVE|DRAFT|ARCHIVED]");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const prompt = fs.readFileSync(promptPath, "utf8");
  appendLog(logPath, `Kitchen Codex finisher started at ${new Date().toISOString()}.\n`);
  await updateKitchen(prisma, kitchenId, {
    importAgentStatus: "RUNNING",
    importAgentStartedAt: new Date(),
    importAgentFinishedAt: null,
    importAgentLastMessage: "Codex finisher is running.",
  });

  const result = await runCodex({ prompt, logPath, finalMessagePath });
  const ok = result.code === 0;
  await updateKitchen(prisma, kitchenId, {
    importAgentStatus: ok ? "COMPLETED" : "FAILED",
    status: ok ? targetStatus : "DRAFT",
    importAgentFinishedAt: new Date(),
    importAgentLastMessage: readFinalMessage(
      finalMessagePath,
      ok ? "Codex finisher completed." : `Codex finisher failed with exit code ${result.code}. Check the log.`,
    ),
  });
  process.exit(ok ? 0 : 1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  appendLog(logPath, `\nRunner failed: ${message}\n`);
  try {
    await updateKitchen(prisma, kitchenId, {
      importAgentStatus: "FAILED",
      importAgentFinishedAt: new Date(),
      importAgentLastMessage: message,
    });
  } catch (updateError) {
    appendLog(logPath, `Could not update kitchen agent status: ${updateError instanceof Error ? updateError.message : updateError}\n`);
  }
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
