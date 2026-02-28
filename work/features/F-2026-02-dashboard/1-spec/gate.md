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
  `spec.md` defines 8 behavioral requirements, 3 illegal transitions (read-only invariant), 4 invariants, 3 error handling cases, and hardening seeds across all categories. `contracts/cli-contract.md` defines the full CLI interface contract with field types, examples, and pre/postconditions.
