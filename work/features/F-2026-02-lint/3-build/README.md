# Phase 3: Build

**Goal:** Execute slice plan via TDD, one subagent per slice.

## Builder Role (spawned as subagent per slice, in git worktrees)
- Graduate acceptance tests from `evidence/` into the project test suite (MOVE, not copy)
- Implement until acceptance tests go GREEN
- Write unit/integration tests for implementation details
- Must NOT modify acceptance test assertion logic (escalate if wrong)
- Tag blocked slices as `BLOCKED: <reason>` in `slices.md`

## Allowed paths (for Builder role)
- `src/**`, `test/**`, `3-build/**`
- Acceptance test graduation: import path changes only

## Outputs
- `slices.md` — Slice plan with status tracking
- Product code + tests committed per slice
- `evidence/manifest.md` — ETR claim to final test location mapping (after graduation)
