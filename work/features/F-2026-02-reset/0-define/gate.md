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
`brief.md` covers problem (state.yaml corruption), scope (reset command with full rebuild), success criteria (idempotent recovery), constraints (POSIX, return not exit), and risks (anchor recomputation tradeoff).
