---
phase: 3-build
needs: [../2-verify/evidence/]
produces: [slices.md]
---
# Gate: Build

- [x] All slices complete (no BLOCKED tags unresolved)
- [x] All graduated acceptance tests pass (GREEN)
- [x] All cross-cutting acceptance tests pass (GREEN)
- [x] Builder's own unit/integration tests pass
- [x] No acceptance test assertions were modified (diff verified)
- [x] Evidence manifest is complete

Status: PASS
Rationale:
  `bin/anvil` now implements `cmd_reset` with full and phase-cascade rebuild paths, and `work/features/F-2026-02-reset/2-verify/evidence/run-tests.sh` reports `60 passed, 0 failed` with acceptance assertions unchanged.
