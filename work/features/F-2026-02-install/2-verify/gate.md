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
`evidence/run-tests.sh` defines executable acceptance checks for BR-1..BR-7, IT-1..IT-3, INV-1..INV-3, and ERR-1..ERR-4 across install, uninstall, idempotency, and managed-target safety behavior. Before implementation, it failed RED because install/uninstall targets did not exist yet.

Falsification:
- Tried: ran `bash work/features/F-2026-02-install/2-verify/evidence/run-tests.sh` before adding `Makefile` -> Observed: non-zero exit with failing install assertions (RED as expected).
- Tried: added non-managed uninstall and directory-preservation checks to the evidence matrix -> Observed: explicit assertions now cover ERR-4 and IT-2.
