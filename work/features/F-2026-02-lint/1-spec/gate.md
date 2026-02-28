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
  `spec.md` defines 16 behavioral requirements across 3 rule categories (GATE, TMPL, XREF), 2 illegal transitions, 5 invariants, 3 error cases, and hardening seeds. `contracts/cli-contract.md` defines the CLI interface with field types, rule ID table, examples, and pre/postconditions. User interview confirmed: no overlap with `check`, dynamic template comparison not needed (just check structural minimum), resolve XREF paths, and lint falsification format.
