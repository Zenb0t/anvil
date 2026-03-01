# Reflection: 2026-02-28 Fixing Loop

## Scope
Session goal: complete the current fixing loop, then capture reusable learnings.

## Learnings Worth Persisting

1. Invoke ANVIL CLI via Git Bash in this Windows environment.
- What happened: calling `./bin/anvil` directly from PowerShell returned unreliable/no output.
- Correct approach: run `C:\Program Files\Git\bin\bash.exe ./bin/anvil <command> <feature-id>`.
- Why it matters: false-clean or silent runs can hide real gate state.

2. Acceptance evidence for install/uninstall must tolerate missing `make`.
- What happened: `work/features/F-2026-02-install/2-verify/evidence/run-tests.sh` failed with exit `127` when `make` was unavailable.
- Correct approach: test runner now uses `make` when present and a strict fallback that mirrors `Makefile` targets when absent.
- Why it matters: verification should fail only on behavior regressions, not on host tool availability.

3. Treat `anvil check` as the canonical mechanical gate signal during active edits.
- What happened: with uncommitted dependency changes, `anvil check` reported `2-verify: DIRTY` and downstream `STALE`.
- Correct approach: consider this expected during local edits; regain CLEAN state after committing validated changes.
- Why it matters: avoids misinterpreting transient local state as a process failure.

## Concrete Changes Made in This Session

- Updated acceptance script fallback behavior:
  - `work/features/F-2026-02-install/2-verify/evidence/run-tests.sh`
- Added reflections index entry:
  - `docs/index.md`

## Verification Snapshot

- Acceptance evidence: `31 passed, 0 failed, 31 total`.
- Gate check after fixes: `0-define PASS`, `1-spec PASS`, `2-verify DIRTY`, `3-build STALE`, `4-ship STALE`.
