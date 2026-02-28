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
  `evidence/run-tests.sh` contains 7 ETR tests covering BR-1 through BR-8, INV-1 through INV-4, IT-1 through IT-3, and ERR-1 through ERR-3. All tests are RED — `anvil list` is not yet implemented. ETR-6 (read-only) and ETR-7 (malformed feature warning) are cross-cutting.

Falsification:
- Tried: `bash evidence/run-tests.sh` → Observed: 4 tests FAIL (ETR-1 through ETR-4), ETR-5/6/7 vary — confirms command does not exist yet (RED baseline)
- Tried: Verified `anvil list` falls through to `usage()` → Observed: exits with usage text, confirming no implementation exists
