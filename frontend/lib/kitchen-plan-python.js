import { spawnSync } from "child_process";
import path from "path";

function getRepoRoot() {
  return path.join(process.cwd(), "..");
}

function getPythonCommand() {
  return process.platform === "win32" ? "python" : "python3";
}

export function runPython(scriptName, args) {
  const repoRoot = getRepoRoot();
  const scriptPath = path.join(repoRoot, "docs", scriptName);
  const result = spawnSync(getPythonCommand(), [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`Python is required for plan processing (${result.error.message}).`);
  }

  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(details || `Plan processing failed while running ${scriptName}.`);
  }

  return result.stdout.trim();
}
