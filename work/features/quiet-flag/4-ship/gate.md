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
Rationale: `review-bundle.md` covers all 3 hardening seeds (addressed), all 9 ETR claims (37 tests GREEN), and contract weakening check (import paths only). External review waived — dogfood feature, user is the reviewer.

Falsification:
- Tried: `bun test test/` → Observed: 31 tests GREEN across 7 files
- Tried: `bun test evidence/` → Observed: 6 cross-cutting tests GREEN across 2 files
- Tried: hardening seed audit → Observed: all 3 seeds addressed (see `review-bundle.md`)
