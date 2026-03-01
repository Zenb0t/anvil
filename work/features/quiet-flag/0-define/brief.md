# Brief: quiet-flag

## Problem

Anvil CLI commands (`check`, `status`, `lint`) always produce stdout, even when the caller only needs pass/fail. Agent harnesses (e.g., the `run_anvil_lint_async` hook) currently parse JSON output to determine success — wasting tokens and adding fragile parsing logic. There is no way to say "just give me the exit code."

## Scope

### In Scope
- Add `--quiet` / `-q` flag to `check`, `status`, and `lint` commands.
- When `--quiet` is set: suppress all stdout, exit code is the only signal (0 = pass, non-zero = fail).
- `--quiet` and `--output` are mutually exclusive — error if both specified.
- Update `run_anvil_lint_async.ts` hook to use `--quiet` instead of parsing JSON.

### Non-Goals
- No new output formats (logfmt, TSV, porcelain). Existing `text`/`json`/`auto` are sufficient.
- No `--quiet` on `list`, `advance`, `init`, or `reset`.
- No rich exit codes (2=STALE, 3=DIRTY, etc.). Keep simple 0/1.
- No `--out <path>` file-writing mode (separate concern).

## Success Criteria

- `anvil check <id> -q` exits 0 on CLEAN, 1 on failure, with zero bytes on stdout.
- `anvil lint -q` exits 0 when no errors, 1 otherwise, with zero bytes on stdout.
- `anvil status <id> -q` exits 0 when effective phase is CLEAN, 1 otherwise, zero stdout.
- `anvil check <id> -q --output json` produces an error message and exits non-zero.
- The lint hook uses `--quiet` and checks only the exit code.

## Constraints

- Bun runtime required (existing constraint).
- Must not change existing behavior when `--quiet` is absent.
- Exit code semantics must match current behavior (commands that currently exit 1 on failure continue to do so).

## Risks

- **Low risk:** Minimal surface area. Three commands, one flag, one hook update.
- **Behavioral ambiguity:** `status` doesn't currently have a clear pass/fail — need to define what exit 0 means (effective phase is CLEAN).
