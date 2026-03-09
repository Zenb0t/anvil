# Claude Hooks

Deterministic Claude Code hooks for safety and validation.
All hooks run with Bun (`bun <hook-script>.ts`) for cross-shell portability.

## Enabled Guardrails

1. `block_destructive_bash.ts` (PreToolUse, matcher: `Bash`)
   - Blocks obviously destructive commands (`rm -rf`, `git reset --hard`, `git clean -fd`, etc.).

2. `block_illegal_path_edits.ts` (PreToolUse, matcher: `Edit|Write|MultiEdit`)
   - Blocks edits outside the repo root.
   - Blocks edits under `.git/`.
   - Blocks edits to `.claude/settings.local.json`.
   - Blocks edits inside `.claude/worktrees/`.
   - Blocks edits to `openspec/schemas/` (use `openspec schema` commands instead).

3. `run_openspec_validate_async.ts` (PostToolUse async, matcher: `Edit|Write|MultiEdit`)
   - Runs `openspec validate --all --json` asynchronously after writes.
   - Emits a system message only on failure.
