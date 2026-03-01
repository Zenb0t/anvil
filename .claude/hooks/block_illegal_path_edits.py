#!/usr/bin/env python3
"""PreToolUse hook: block illegal path edits for ANVIL constraints."""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path


DERIVED_STATE_RE = re.compile(r"^work/features/[^/]+/state\.yaml$")


def emit_deny(reason: str) -> None:
    payload = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }
    print(json.dumps(payload))


def normalize_path(project_root: Path, raw_path: str) -> Path:
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        candidate = project_root / candidate
    return candidate.resolve(strict=False)


def path_outside_project(project_root: Path, target: Path) -> bool:
    try:
        target.relative_to(project_root)
        return False
    except ValueError:
        return True


def main() -> int:
    raw = sys.stdin.read().strip()
    if not raw:
        return 0

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return 0

    tool_input = payload.get("tool_input") or {}
    file_path = str(tool_input.get("file_path") or "").strip()
    if not file_path:
        return 0

    project_root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()).resolve(strict=False)
    target = normalize_path(project_root, file_path)

    if path_outside_project(project_root, target):
        emit_deny(f"Blocked edit outside repository root: {file_path}")
        return 0

    rel = target.relative_to(project_root).as_posix()

    if rel == ".git" or rel.startswith(".git/"):
        emit_deny("Blocked edits under .git/")
        return 0

    if rel == ".claude/settings.local.json":
        emit_deny("Blocked edits to local-only Claude settings (.claude/settings.local.json)")
        return 0

    if rel.startswith(".claude/worktrees/"):
        emit_deny("Blocked edits inside .claude/worktrees/")
        return 0

    if DERIVED_STATE_RE.match(rel):
        emit_deny("Blocked manual edits to derived state cache: work/features/<id>/state.yaml")
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
