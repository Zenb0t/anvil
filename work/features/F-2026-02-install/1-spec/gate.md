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
`spec.md` defines install/uninstall behavior, invariants, illegal transitions, and error handling; `contracts/make-contract.md` specifies interface, outputs, exit codes, and safety constraints.
