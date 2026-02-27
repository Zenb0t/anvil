---
phase: 3-build
needs: [../2-verify/evidence/]
produces: [slices.md]
---
# Gate: Build

- [ ] All slices complete (no BLOCKED tags unresolved)
- [ ] All graduated acceptance tests pass (GREEN)
- [ ] All cross-cutting acceptance tests pass (GREEN)
- [ ] Builder's own unit/integration tests pass
- [ ] No acceptance test assertions were modified (diff verified)
- [ ] Evidence manifest is complete

Status: PENDING
Rationale:
