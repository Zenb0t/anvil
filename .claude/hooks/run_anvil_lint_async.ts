#!/usr/bin/env bun
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function isUnavailableError(returnCode: number, output: string): boolean {
  const lowered = output.toLowerCase();
  return (
    returnCode === 126 ||
    returnCode === 127 ||
    lowered.includes("command not found") ||
    lowered.includes("no such file or directory") ||
    lowered.includes("is not recognized")
  );
}

function runQuietLint(projectRoot: string): number {
  const anvilPath = path.join(projectRoot, "bin", "anvil");
  const result = spawnSync("bun", [anvilPath, "lint", "--quiet"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  return result.status ?? 1;
}

function runLintJson(projectRoot: string): { code: number; output: string } {
  const anvilPath = path.join(projectRoot, "bin", "anvil");
  const result = spawnSync("bun", [anvilPath, "lint", "--output", "json"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return { code: result.status ?? 1, output };
}

function emitSystemMessage(message: string): void {
  console.log(JSON.stringify({ systemMessage: message }));
}

async function main(): Promise<void> {
  const raw = readFileSync(0, "utf8").trim();
  if (!raw) return;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }

  const toolInput = (payload.tool_input ?? {}) as Record<string, unknown>;
  const filePath = String(toolInput.file_path ?? "").trim();

  const projectRoot = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

  // Fast path: check exit code only
  const quietCode = runQuietLint(projectRoot);
  if (quietCode === 0) return;

  // Slow path: get details for error message
  const lint = runLintJson(projectRoot);
  if (isUnavailableError(lint.code, lint.output)) return;

  const excerpt = lint.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" | ")
    .slice(0, 600);

  if (filePath) {
    emitSystemMessage(`anvil lint failed after editing ${filePath}. ${excerpt}`);
  } else {
    emitSystemMessage(`anvil lint failed after a write operation. ${excerpt}`);
  }
}

main().catch(() => {
  // no-op on hook failures
});
