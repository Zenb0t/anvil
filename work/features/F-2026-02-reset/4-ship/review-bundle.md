# Review Bundle: F-2026-02-reset

## What Changed
- Added `cmd_reset()` to `bin/anvil` for state recovery/rebuild.
- Added `reset` command to CLI usage and dispatch.
- Implemented:
  - `anvil reset <id>` full rebuild from gate status.
  - `anvil reset <id> <phase>` target phase + downstream cascade rebuild.
  - Feature ID traversal rejection and phase validation.
  - Missing `state.yaml` creation.
  - Stderr-only reporting for before/after updates and no-op consistency.

## Spec Compliance
- BR-1..BR-8: verified by acceptance evidence script.
- IT-1..IT-3: verified (no `gate.md` mutation, no non-`state.yaml` feature file mutation, no phase/gate creation).
- INV-1..INV-4: verified, including phase pointer derivation and anchor presence constraints.
- ERR-1..ERR-3 and HS-1: verified with explicit negative-path assertions.

## ETR Status
- Evidence command:
  - `bash work/features/F-2026-02-reset/2-verify/evidence/run-tests.sh`
- Result:
  - `Results: 60 passed, 0 failed, 60 total`
- Claim coverage:
  - BR-1, BR-2, BR-3, BR-4, BR-5, BR-6, BR-7, BR-8
  - IT-1, IT-2, IT-3
  - INV-1, INV-2, INV-3, INV-4
  - ERR-1, ERR-2, ERR-3
  - HS-1

## Hardening Seeds Audit
- Security:
  - Directory traversal on feature IDs rejected (`*..*`) with stderr error and non-zero return.
- Performance:
  - Single-pass phase derivation loop over `PHASES`; no repeated full gate validation.
- Observability:
  - Stderr output includes before/after state details or explicit consistency message, stdout remains empty.

## How to Verify
1. `bash work/features/F-2026-02-reset/2-verify/evidence/run-tests.sh`
2. `bash bin/anvil check F-2026-02-reset`
3. Manual spot checks:
   - `bash bin/anvil reset F-2026-02-reset`
   - `bash bin/anvil reset F-2026-02-reset 3-build`
