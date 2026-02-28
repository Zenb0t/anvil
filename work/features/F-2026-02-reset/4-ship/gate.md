---
phase: 4-ship
needs: [../3-build/slices.md]
produces: [review-bundle.md]
---
# Gate: Ship

- [x] Hardening seeds audited (security, performance, observability)
- [x] Contract weakening check passed (acceptance test diffs reviewed)
- [x] Review bundle generated
- [x] External review complete (or waived with justification)
- [x] Release notes written
- [x] Process improvements documented

Status: PASS
Rationale:
  `4-ship/review-bundle.md` captures spec/ETR compliance (`60 passed, 0 failed`), hardening seed outcomes, and verifier commands; acceptance assertions in `2-verify/evidence/run-tests.sh` were not weakened.

Falsification:
- Tried: reviewed `bin/anvil` and acceptance evidence for side effects -> Observed: `cmd_reset` writes only `state.yaml`, matching IT-2.
- Tried: re-ran `bash work/features/F-2026-02-reset/2-verify/evidence/run-tests.sh` after implementation -> Observed: `Results: 60 passed, 0 failed, 60 total`.
