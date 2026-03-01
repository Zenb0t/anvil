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
`4-ship/review-bundle.md` captures implementation diff, updated compliance mapping (including ERR-4), full acceptance evidence, hardening audit outcomes, and independent verification steps.

Falsification:
- Tried: checked install/uninstall path scope in `Makefile` -> Observed: operations are restricted to `~/.local/bin/anvil`.
- Tried: reran acceptance evidence after implementation -> Observed: all assertions GREEN with symlink behavior validated.
