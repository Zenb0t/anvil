---
phase: 0-define
needs: []
produces: [brief.md]
---
# Gate: Define

- [x] Problem statement is clear and scoped
- [x] Non-goals are explicitly stated
- [x] Success criteria are measurable
- [x] Constraints and risks identified
- [x] Brief reviewed with user

Status: PASS
Rationale:
  `brief.md` covers problem (no multi-feature listing for LLM agents), scope (anvil list command, one line per feature), success criteria (correct output, zero-feature handling), constraints (POSIX shell), and risks (low, additive read-only command).
