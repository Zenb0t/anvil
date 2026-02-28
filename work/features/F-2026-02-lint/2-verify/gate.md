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
39 acceptance tests in `evidence/run-tests.sh` covering all 16 BRs, 5 INVs, 2 ITs, 3 ERRs, and 1 HS. Functional claims (BR-1 through BR-15, ERR-1 through ERR-3) map to per-slice implementation. Cross-cutting claims (BR-16, IT-1, IT-2, INV-1 through INV-5, HS-1) validated post-slices. 29 of 39 tests are RED as expected.

Falsification:
- Tried: `bash work/features/F-2026-02-lint/2-verify/evidence/run-tests.sh` -> Observed: 29 failed, 10 passed, 39 total. All failures are due to `anvil lint` not existing yet (falls through to usage). The 10 passes are read-only invariants (IT-1, IT-2, INV-3, etc.) that hold trivially when the command is unrecognized.
- Tried: creating a feature with GATE-STATUS violation (Status: BANANA) and running `anvil lint` -> Observed: command not recognized, outputs Usage text instead of GATE-STATUS issue line. Confirms RED.
- Tried: creating a freshly scaffolded feature via `anvil init` and running `anvil lint` -> Observed: exit 1 with Usage output instead of exit 0 with no output. Confirms INV-4 is RED.
- Tried: running `anvil lint _nonexistent_feature` -> Observed: exit 1 (correct code) but no error message on stderr (falls to usage instead of proper error handling). Confirms ERR-2 partially RED.
