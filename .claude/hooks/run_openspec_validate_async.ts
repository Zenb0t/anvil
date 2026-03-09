#!/usr/bin/env bun
import path from "node:path";
import { readFileSync } from "node:fs";

function isUnavailableError(returnCode: number, output: string): boolean {
  return (
    returnCode === 126 ||
    returnCode === 127 ||
    output.toLowerCase().includes("no such file or directory")
  );
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

  const projectRoot = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const bin = path.join(projectRoot, "node_modules", ".bin", "openspec");

  const proc = Bun.spawn([bin, "validate", "--all", "--json"], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  const output = `${stdout}${stderr}`.trim();

  if (code === 0) return;
  if (isUnavailableError(code, output)) return;

  const excerpt = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" | ")
    .slice(0, 600);

  emitSystemMessage(`openspec validate failed after a write operation. ${excerpt}`);
}

main().catch(() => {
  // no-op on hook failures
});
