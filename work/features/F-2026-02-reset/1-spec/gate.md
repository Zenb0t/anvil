---
phase: 1-spec
needs: [../0-define/brief.md]
produces: [spec.md, contracts/]
---
# Gate: Spec

- [x] Invariants are testable
- [x] Illegal state transitions named
- [x] At least one contract artifact exists
- [x] Hardening seeds complete (security, performance, observability)
- [x] Edge cases and failure scenarios documented

Status: PASS
Rationale:
`spec.md` covers 8 behavioral requirements, 4 illegal transitions, 4 invariants, 3 error cases. `contracts/cli-contract.md` defines CLI interface, exit codes, and state.yaml format.
