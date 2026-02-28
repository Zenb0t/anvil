# Brief: F-2026-02-reset

## Problem

When `state.yaml` becomes corrupted or out-of-sync — through interrupted `anvil advance`, bad sed match, or unexpected tool behavior — there is no recovery path. The project convention forbids manual editing of `state.yaml`, but the CLI provides no repair mechanism. The agent is stuck.

**Who:** LLM agents running anvil workflows.
**How they cope today:** Manual editing of `state.yaml` (violates project rules) or re-scaffolding the feature from scratch (loses all phase work).

## Scope

### In Scope
- `anvil reset <id>` — full rebuild of `state.yaml` from gate files
- `anvil reset <id> <phase>` — reset a single phase entry
- Re-derive status (PENDING/PASS/FAIL) from gate.md `Status:` lines
- Recompute phase pointer (lowest non-PASS phase)
- Recompute git anchors for PASS gates from current HEAD
- Print what changed (before → after) on stderr

### Non-Goals
- Interactive confirmation (just do it, agent-friendly)
- Modifying gate files (read-only with respect to gates)
- Backup/undo of previous state.yaml
- Reset of multiple features at once (one at a time)

## Success Criteria

- Corrupted `state.yaml` recoverable without manual editing
- `anvil check <id>` passes after `anvil reset <id>`
- Idempotent: running reset on an already-correct state produces no changes
- Agent can self-heal from state corruption without user intervention

## Constraints

- POSIX shell, zero dependencies (consistent with existing CLI)
- Reuse existing `validate_gate` logic where possible
- Must not write to any file other than `state.yaml`
- `return` not `exit` in the function (source-able for tests)

## Risks

- **Anchor recomputation may mask real staleness:** If a gate was PASS but its dependencies changed, resetting the anchor to HEAD erases that staleness signal. Mitigated by: this is intentional — reset means "trust current state of disk."
- **Partial gate files:** A gate.md with no `Status:` line should default to PENDING, not error.
