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
Rationale:
`evidence/run-tests.sh` defines executable acceptance checks for Makefile install/uninstall behavior and safety invariants. Before implementation, it fails RED because install/uninstall targets do not exist yet.

Falsification:
- Tried: ran `bash work/features/F-2026-02-install/2-verify/evidence/run-tests.sh` before adding `Makefile` -> Observed: non-zero exit with failing install assertions (RED as expected).
- Tried: included missing target/dir uninstall checks in acceptance evidence -> Observed: ERR-2/ERR-3 have explicit assertions.
