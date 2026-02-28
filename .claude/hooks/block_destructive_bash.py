#!/usr/bin/env python3
"""PreToolUse hook: block obviously destructive Bash commands."""

from __future__ import annotations

import json
import sys


BLOCKED_SUBSTRINGS = (
    "rm -rf",
    "rm -fr",
    "git reset --hard",
    "git checkout --",
    "git clean -fd",
    "git clean -xdf",
    "del /f /s /q",
    "remove-item -recurse -force",
)


def emit_deny(reason: str) -> None:
    payload = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }
    print(json.dumps(payload))


def main() -> int:
    raw = sys.stdin.read().strip()
    if not raw:
        return 0

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return 0

    tool_input = payload.get("tool_input") or {}
    command = str(tool_input.get("command") or "")
    normalized = command.lower()

    for candidate in BLOCKED_SUBSTRINGS:
        if candidate in normalized:
            preview = command.strip().replace("\n", " ")
            preview = preview[:160]
            emit_deny(f"Blocked destructive Bash command pattern: {preview}")
            return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
