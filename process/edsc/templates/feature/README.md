# Feature: {{FEATURE_ID}}

## What to read first

1. `README.md` (this page)
2. `{{CURRENT_PHASE}}/README.md`
3. `phase.yaml`

## Pointers via AGENTS

- `../../../../AGENTS.md`
- `../../../../docs/index.md`

## Phase.yaml Summary

- Mode: `{{MODE}}`
- Current phase: `{{CURRENT_PHASE}}`
- Current blockers: `{{CURRENT_BLOCKERS}}`
- Decisions needed: `{{DECISIONS_NEEDED}}`

## Outcome by Phase

- 00 Intake: capture PRD and choose mode (`complicated` or `complex`)
- 01 Framing: define problem boundaries and success signals
- 02 Spec: define behavior, invariants, and hardening seeds
- 03 Arch: record ADRs and contracts needed for safe delivery
- 04 Verification: produce ETR + legibility harness
- 05 Implementation: deliver slices against accepted evidence contract
- 06 Hardening: audit assumptions vs evidence and close gaps
- 07 Release/Learning: release notes plus machine-readable process deltas

## Working Agreements

- Keep each phase `README.md` single page.
- Put heavy detail under that phase `appendix/`.
- Use `gate.md` checklists for PASS/FAIL decisions.
- Run `edsc check {{FEATURE_ID}}` after meaningful edits.
