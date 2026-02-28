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
  `review-bundle.md` covers all 4 invariants, all 8 ETR claims (all GREEN), and all 3 hardening seeds. External review waived: dogfooding session where the user is the stakeholder and reviewed artifacts at each gate. No acceptance test assertions were modified.

Falsification:
- Tried: `bash evidence/run-tests.sh` → Observed: 8 passed, 0 failed — all acceptance tests GREEN
- Tried: reviewed `cmd_list` for `update_state` calls → Observed: none present, function is read-only as specified
- Tried: `bash bin/anvil list` with malformed feature dir → Observed: stderr warning, stdout clean, exit 0
- Tried: hardening seed audit → Observed: all 3 seeds addressed (see review-bundle.md sections HS-1, HP-1, HO-1)
