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
  `brief.md` covers problem (format/structure validation gap between `check` and `advance`), scope (`anvil lint` command with gate format, template conformance, and cross-ref rules), non-goals (no auto-fix, no custom rules), success criteria (one-line-per-issue output, exit codes), constraints (POSIX shell, read-only), and risks (rule calibration, shell YAML parsing).
