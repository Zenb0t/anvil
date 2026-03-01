---
phase: 2-verify
needs: [../1-spec/spec.md, ../1-spec/contracts/]
produces: [evidence/]
---
# Gate: Verify

- [x] ETR matrix complete - every claim has evidence criteria
- [x] Acceptance tests are executable
- [x] Acceptance tests are RED (nothing implemented yet)
- [x] Each functional claim maps to a specific slice
- [x] Cross-cutting claims identified and separated
- [x] Refutation cases documented

Status: PASS
Rationale: 9 ETR test files in `evidence/` covering 37 tests across 9 claims. 19 tests RED (feature not implemented), 18 GREEN (existing behavior guards and coincidental error-path matches). All feature-specific behavior (flag recognition, output suppression, exit-code semantics, mutual exclusion, hook modification, security) confirmed RED.

ETR Matrix:
| ETR | Claim | Type | Slice | Tests |
|-----|-------|------|-------|-------|
| ETR-1 | `--quiet` suppresses stdout (BEH-1, INV-1) | functional | flag-parsing + output-suppression | 6 RED |
| ETR-2 | Exit code is the only signal (BEH-2, INV-2) | functional | exit-code-semantics | 1 RED, 4 accidental-pass |
| ETR-3 | Mutual exclusion with `--output` (BEH-3) | functional | flag-validation | 3 RED, 3 accidental-pass |
| ETR-4 | Commands without `--quiet` unchanged (BEH-4) | cross-cutting | regression-guard | 4 GREEN (expected) |
| ETR-5 | Unsupported commands reject `--quiet` | functional | flag-validation | 3 RED, 1 accidental-pass |
| ETR-6 | `-q` exact alias for `--quiet` (INV-4) | functional | flag-parsing | 2 RED, 4 accidental-pass |
| ETR-7 | `--quiet` does not alter `state.yaml` (INV-3) | cross-cutting | state-invariant | 2 GREEN (expected) |
| ETR-8 | Hook uses `--quiet` (BEH-5) | functional | hook-modification | 2 RED |
| ETR-9 | `-q` not treated as feature ID | cross-cutting | security | 2 RED |

Slice mapping for Build:
- Slice 1 (flag-parsing): ETR-1, ETR-6 — parse `--quiet`/`-q` in `check`, `status`, `lint`
- Slice 2 (exit-code-semantics): ETR-2 — throw `CliError` on failure when quiet
- Slice 3 (flag-validation): ETR-3, ETR-5 — mutual exclusion and unsupported command rejection
- Slice 4 (hook-modification): ETR-8 — update `run_anvil_lint_async.ts`
- Cross-cutting (post-slices): ETR-4, ETR-7, ETR-9 — regression, state invariant, security

Refutation cases:
- Current `check` exits 0 even when `allPass=false`. The spec contract (BEH-2) requires exit 1 on failure with `--quiet`. This is new behavior, not just output suppression. Build must add `throw new CliError("", 1)` when `!allPass && quiet`.
- Current `status` exits 0 even when `allClean=false`. Same issue — `--quiet` needs exit 1.
- `-q` is currently parsed as a feature ID by `check`/`status` (error: "Feature -q not found"). Flag parsing must intercept before positional arg assignment.

Falsification:
- Tried: `bun test evidence/etr-1-*.test.ts` -> Observed: 6 tests RED — `--quiet` not recognized, usage errors on stderr
- Tried: `bun test evidence/etr-2-*.test.ts` -> Observed: 1 test RED — lint `--quiet` exit code mismatch
- Tried: `bun test evidence/etr-3-*.test.ts` -> Observed: 3 tests RED — no mutual-exclusion error message
- Tried: `bun test evidence/etr-5-*.test.ts` -> Observed: 3 tests RED — no `--quiet`-specific rejection
- Tried: `bun test evidence/etr-6-*.test.ts` -> Observed: 2 tests RED — flags not recognized
- Tried: `bun test evidence/etr-8-*.test.ts` -> Observed: 2 tests RED — hook source lacks `--quiet`
- Tried: `bun test evidence/etr-9-*.test.ts` -> Observed: 2 tests RED — `-q` treated as feature ID
- Tried: `bun test evidence/etr-4-*.test.ts` -> Observed: 4 tests GREEN (expected — existing behavior)
- Tried: `bun test evidence/etr-7-*.test.ts` -> Observed: 2 tests GREEN (expected — state not modified)
