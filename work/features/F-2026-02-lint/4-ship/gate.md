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
  `review-bundle.md` covers all 5 invariants, all 39 ETR tests (all GREEN), all 3 hardening seeds, and role separation audit. External review waived: user is stakeholder and reviewed artifacts at each gate. No acceptance test assertions modified — tests authored by Architect subagent, implementation by Builder subagent in worktree.

Falsification:
- Tried: `bash evidence/run-tests.sh` → Observed: 39 passed, 0 failed
- Tried: `git diff --stat` in Builder worktree → Observed: only `bin/anvil` modified (230 insertions), no spec/verify/gate files touched
- Tried: `bash bin/anvil lint F-2026-02-lint` → Observed: no output, exit 0 (clean feature)
- Tried: hardening audit → Observed: HS-1 (traversal) addressed and tested, HP-1 (perf) acceptable, HO-1 (observability) confirmed
