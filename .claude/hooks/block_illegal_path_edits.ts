#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import path from "node:path";

function emitDeny(reason: string): void {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
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
  if (!filePath) return;

  const projectRoot = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const target = path.resolve(projectRoot, filePath);
  const rel = path.relative(projectRoot, target);
  const relPosix = rel.split(path.sep).join("/");

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    emitDeny(`Blocked edit outside repository root: ${filePath}`);
    return;
  }

  if (relPosix === ".git" || relPosix.startsWith(".git/")) {
    emitDeny("Blocked edits under .git/");
    return;
  }

  if (relPosix === ".claude/settings.local.json") {
    emitDeny("Blocked edits to local-only Claude settings (.claude/settings.local.json)");
    return;
  }

  if (relPosix.startsWith(".claude/worktrees/")) {
    emitDeny("Blocked edits inside .claude/worktrees/");
    return;
  }

  if (relPosix.startsWith("openspec/schemas/")) {
    emitDeny("Blocked edits to openspec/schemas/ (use openspec schema commands instead)");
  }
}

main().catch(() => {
  // no-op on hook failures
});
