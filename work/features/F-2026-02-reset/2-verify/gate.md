---
phase: 2-verify
needs: [../1-spec/spec.md, ../1-spec/contracts/]
produces: [evidence/]
---
# Gate: Verify

- [x] ETR matrix complete — every claim has evidence criteria
- [x] Acceptance tests are executable
- [x] Acceptance tests are RED (nothing implemented yet)
- [x] Each functional claim maps to a specific slice
- [x] Cross-cutting claims identified and separated
- [x] Refutation cases documented

Status: PASS
Rationale:
60 acceptance tests in `evidence/run-tests.sh` covering all spec claims: BR-1 through BR-8 (behavioral), IT-1 through IT-3 (illegal transitions), INV-1 through INV-4 (invariants), ERR-1 through ERR-3 (error cases), and HS-1 (hardening/security). All 33 behavioral tests are RED (cmd_reset returns exit 127 — function does not exist yet). 27 vacuous passes are from fixture-state assertions that will become meaningful once cmd_reset is implemented.

Functional claims (per-slice):
- Slice 1 (core reset): BR-1, BR-3, BR-4, BR-7, BR-8, ERR-1, ERR-3
- Slice 2 (phase reset + cascade): BR-2, ERR-2
- Slice 3 (anchors + diff output): BR-5, BR-6
- Slice 4 (input validation): HS-1

Cross-cutting claims (post-slices):
- IT-1, IT-2, IT-3 (read-only invariants)
- INV-1, INV-2, INV-3, INV-4 (structural invariants + idempotency)

Falsification:
- Tried: `bash work/features/F-2026-02-reset/2-verify/evidence/run-tests.sh` -> Observed: 33 tests RED, 27 vacuous PASS, 60 total (cmd_reset not found, exit 127)
- Tried: verified no spec claim left uncovered -> Observed: every BR, IT, INV, ERR item has at least one test assertion
- Tried: checked for false positives in passing tests -> Observed: 27 passes are vacuous (assert fixture unchanged when cmd_reset is a no-op); they will become meaningful after implementation
