# Implementation Slices: quiet-flag

## Slice 1: CLI --quiet flag
**ETR Claims:** ETR-1, ETR-2, ETR-3, ETR-5, ETR-6, ETR-9
**Status:** complete

Add `--quiet` / `-q` flag parsing to `cmdCheck`, `cmdStatus`, and `cmdLint` in `src/cli.ts`:
- Parse `--quiet` and `-q` in each command's arg loop (before positional assignment)
- Validate mutual exclusion with `--output` (error to stderr, exit 1)
- Reject `--quiet` on unsupported commands (`list`, `init`, `advance`, `reset`)
- When quiet: skip all `console.log` calls, exit 1 via `CliError` when not passing
- Update `usage()` text to document the flag
- `-q` must not be treated as a feature ID

## Slice 2: Hook update
**ETR Claims:** ETR-8
**Status:** complete

Update `.claude/hooks/run_anvil_lint_async.ts`:
- Primary call: `lint --quiet` (exit code only)
- On exit 0: return silently (existing behavior)
- On non-zero: fallback to `lint --output json` to get error details for system message
