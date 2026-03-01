# Claude Hooks for ANVIL Guardrails

This repository uses deterministic Claude Code hooks to enforce high-confidence safety rules.
All hooks run with Bun (`bun <hook-script>.ts`) for cross-shell portability.

## Enabled Guardrails

1. `block_destructive_bash.ts` (PreToolUse, matcher: `Bash`)
   - Blocks obviously destructive commands (`rm -rf`, `git reset --hard`, `git clean -fd`, etc.).

2. `block_illegal_path_edits.ts` (PreToolUse, matcher: `Edit|Write|MultiEdit`)
   - Blocks edits outside the repo root.
   - Blocks edits under `.git/`.
   - Blocks edits to `.claude/settings.local.json`.
   - Blocks edits inside `.claude/worktrees/`.
   - Blocks manual edits to derived `work/features/<id>/state.yaml`.

3. `run_anvil_lint_async.ts` (PostToolUse async, matcher: `Edit|Write|MultiEdit`)
   - Runs `bin/anvil lint` asynchronously after writes.
   - Emits a system message only on failure.

## Migration / Rollout Notes

- Start with the high-confidence destructive Bash denylist.
- Expand/adjust path rules based on observed false positives.
- Keep async validation lightweight to avoid noisy feedback loops.
