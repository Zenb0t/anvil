#!/usr/bin/env python3
"""PostToolUse async hook: run lightweight ANVIL validation after writes."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


def is_unavailable_error(return_code: int, output: str) -> bool:
    lowered = output.lower()
    return (
        return_code in (126, 127)
        or "command not found" in lowered
        or "no such file or directory" in lowered
        or "execvpe" in lowered
    )


def run_lint(project_root: Path) -> tuple[int, str]:
    anvil = project_root / "bin" / "anvil"

    candidates: list[list[str]] = []
    if anvil.exists():
        candidates.append([str(anvil), "lint"])

    for shell in ("sh", "bash"):
        if shutil.which(shell):
            candidates.append([shell, str(anvil), "lint"])

    if os.name == "nt":
        program_files = os.environ.get("ProgramFiles")
        if program_files:
            git_bash = Path(program_files) / "Git" / "bin" / "bash.exe"
            if git_bash.exists():
                candidates.append([str(git_bash), str(anvil), "lint"])

    last_output = ""
    for cmd in candidates:
        try:
            completed = subprocess.run(
                cmd,
                cwd=str(project_root),
                capture_output=True,
                text=True,
                check=False,
            )
        except OSError:
            continue

        combined_output = (completed.stdout + completed.stderr).strip()
        if completed.returncode == 0:
            return 0, ""

        if is_unavailable_error(completed.returncode, combined_output):
            last_output = combined_output
            continue

        return completed.returncode, combined_output

    # If no runnable shell exists in this environment, skip quietly.
    return 0, last_output


def emit_message(message: str) -> None:
    print(json.dumps({"systemMessage": message}))


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

    project_root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()).resolve(strict=False)
    return_code, output = run_lint(project_root)
    if return_code == 0:
        return 0

    excerpt = " | ".join(line.strip() for line in output.splitlines() if line.strip())
    excerpt = excerpt[:600]

    if file_path:
        emit_message(f"anvil lint failed after editing {file_path}. {excerpt}")
    else:
        emit_message(f"anvil lint failed after a write operation. {excerpt}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
