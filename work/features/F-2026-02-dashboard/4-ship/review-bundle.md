# Review Bundle: F-2026-02-dashboard

## What Changed

```
bin/anvil | 62 insertions (+)
```

Single file modified: `bin/anvil`. Added `cmd_list` function (~45 lines) and registered `list` in the command dispatch. Also added `list` to the usage text.

New files (feature workspace):
- `work/features/F-2026-02-dashboard/` — full phase artifacts (define, spec, verify, build, ship)
- `CLAUDE.md` — project skill configuration

## Spec Compliance

| Invariant | Status | Evidence |
|-----------|--------|----------|
| INV-1: Output line count = feature dirs with `state.yaml` | PASS | ETR-2 tests this directly |
| INV-2: Exit code always 0 | PASS | ETR-5 confirms exit 0; ETR-7 confirms exit 0 even with malformed features |
| INV-3: No stdout for warnings/errors | PASS | ETR-7b confirms warnings go to stderr only |
| INV-4: Output consistent with `anvil status` | PASS | ETR-4 cross-checks effective phase against `anvil status` output |

## ETR Status

| Claim | Description | Type | Status |
|-------|-------------|------|--------|
| ETR-1 | `anvil list` is a recognized command (BR-8) | functional | PASS |
| ETR-2 | One line per feature (BR-1, INV-1) | functional | PASS |
| ETR-3 | Output format `<id> <phase> <status>` (BR-2) | functional | PASS |
| ETR-4 | Effective phase matches `anvil status` (BR-3, INV-4) | functional | PASS |
| ETR-5 | Empty/missing features dir exits 0 (BR-7, ERR-3) | functional | PASS |
| ETR-6 | Read-only — no files modified (IT-1/2/3) | cross-cutting | PASS |
| ETR-7a | Malformed feature warns on stderr (ERR-1) | cross-cutting | PASS |
| ETR-7b | Warning not on stdout (INV-3) | cross-cutting | PASS |

All 8 assertions pass. No acceptance test assertions were modified — tests remain in `2-verify/evidence/run-tests.sh` as authored during Verify phase.

## Hardening Seeds Audit

### HS-1 (Security): No user-supplied input in shell expansion
**Status:** Addressed. `cmd_list` takes no arguments. Feature IDs come from `basename` of directory names iterated via glob — no user input is interpolated into commands. Directory names with spaces or special characters are handled by quoting (`"$dir"`, `"$id"`).

### HP-1 (Performance): <2s for >50 features
**Status:** Acknowledged risk, acceptable for v1. Each feature runs `validate_gate` which parses gate files. For 50+ features this could be slow. Mitigation: a future optimization could read `state.yaml` directly instead of full gate validation. Current approach is correct-first.

### HO-1 (Observability): Stderr warnings
**Status:** Addressed. Malformed features produce `warning: <id> has no state.yaml, skipping` on stderr. Verified by ETR-7.

## How to Verify

```sh
git checkout feat/anvil-dashboard

# Run acceptance tests
bash work/features/F-2026-02-dashboard/2-verify/evidence/run-tests.sh

# Manual verification
bash bin/anvil list

# Verify read-only (run twice, check no side effects)
bash bin/anvil list > /dev/null 2>&1
git diff --stat  # should show no new changes from list
```
