# Phase 2: Verify

**Goal:** Create ETR matrix, write acceptance tests, define refutation cases and test strategy.

## Architect Role (spawned as subagent for fresh context)
- Build ETR matrix mapping claims to evidence
- Write executable acceptance tests in `evidence/` (one per ETR claim)
- Tests must be executable and RED before Build phase
- Define both functional (per-slice) and cross-cutting (post-slices) claim types
- All acceptance tests use the project's test framework

## Outputs
- `evidence/` — Executable acceptance tests (one per ETR claim), initially RED
- ETR matrix documented in gate's Falsification section

## Allowed paths (for Architect role)
- `2-verify/**`
