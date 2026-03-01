#!/usr/bin/env bun
import { readFileSync } from "node:fs";

const BLOCKED_SUBSTRINGS = [
  "rm -rf",
  "rm -fr",
  "git reset --hard",
  "git checkout --",
  "git clean -fd",
  "git clean -xdf",
  "del /f /s /q",
  "remove-item -recurse -force",
];

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

function main(): void {
  const payloadText = readFileSync(0, "utf8").trim();
  if (!payloadText) return;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadText) as Record<string, unknown>;
  } catch {
    return;
  }

  const toolInput = (payload.tool_input ?? {}) as Record<string, unknown>;
  const command = String(toolInput.command ?? "");
  const normalized = command.toLowerCase();

  for (const candidate of BLOCKED_SUBSTRINGS) {
    if (normalized.includes(candidate)) {
      const preview = command.replace(/\s+/g, " ").trim().slice(0, 160);
      emitDeny(`Blocked destructive Bash command pattern: ${preview}`);
      return;
    }
  }
}

main();
