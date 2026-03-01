# Review Bundle: quiet-flag

## What Changed

| File | Change |
|------|--------|
| `src/cli.ts` | Added `--quiet`/`-q` parsing to `cmdCheck`, `cmdStatus`, `cmdLint`. Added rejection in `cmdList`, `cmdInit`, `cmdAdvance`, `cmdReset`. Updated `usage()`. |
| `.claude/hooks/run_anvil_lint_async.ts` | Two-phase lint: `--quiet` first (fast path), `--output json` fallback on failure. |
| `test/etr-{1,2,3,5,6,8,9}-*.test.ts` | 7 graduated acceptance tests (moved from evidence/). |

## Spec Compliance

| Invariant | Status | Evidence |
|-----------|--------|----------|
| INV-1: stdout = 0 bytes when quiet | PASS | ETR-1: 6 tests verify zero stdout across all 3 commands |
| INV-2: exit codes identical quiet vs non-quiet | PASS | ETR-2: 5 tests compare exit codes |
| INV-3: state.yaml unchanged by quiet | PASS | ETR-7: 2 cross-cutting tests verify state identity |
| INV-4: `-q` exact alias for `--quiet` | PASS | ETR-6: 6 tests verify identical behavior |

## ETR Status

| Claim | Type | Tests | Result |
|-------|------|-------|--------|
| ETR-1: stdout suppressed | functional | 6 | GREEN |
| ETR-2: exit code signal | functional | 5 | GREEN |
| ETR-3: mutual exclusion | functional | 6 | GREEN |
| ETR-4: unchanged without quiet | cross-cutting | 4 | GREEN |
| ETR-5: unsupported commands | functional | 4 | GREEN |
| ETR-6: -q alias | functional | 6 | GREEN |
| ETR-7: state invariant | cross-cutting | 2 | GREEN |
| ETR-8: hook uses quiet | functional | 2 | GREEN |
| ETR-9: -q not feature ID | cross-cutting | 2 | GREEN |
| **Total** | | **37** | **37 GREEN** |

## Hardening Seeds Audit

### Security
- **Seed:** `-q` cannot be injected as a feature ID.
- **Audit:** `assertValidFeatureId` rejects strings starting with `-`. Flag parsing intercepts `--quiet`/`-q` before positional assignment. ETR-9 confirms.
- **Status:** Addressed.

### Performance
- **Seed:** `--quiet` should skip serialization.
- **Audit:** When quiet, all `console.log` calls are guarded — no JSON.stringify, no string formatting. The hook's fast path avoids a second process spawn on success (most common case).
- **Status:** Addressed.

### Observability
- **Seed:** Hook fallback adds one extra spawn on lint failure.
- **Audit:** Failure path still gets full JSON error details via fallback call. The excerpt is still capped at 600 chars. No observability regression.
- **Status:** Addressed.

## Contract Weakening Check
- Graduated tests differ from originals only in import path (`"../../../../.."` → `".."`).
- No assertion logic, conditions, or expected values were modified.
- Cross-cutting tests (ETR-4, ETR-7) remain in evidence/ untouched.

## How to Verify

```bash
# Run all graduated acceptance tests
bun test test/

# Run cross-cutting tests
bun test work/features/quiet-flag/2-verify/evidence/

# Manual smoke test
bin/anvil check quiet-flag --quiet; echo "exit: $?"
bin/anvil check quiet-flag --quiet --output json  # should error
bin/anvil list --quiet  # should error
```
