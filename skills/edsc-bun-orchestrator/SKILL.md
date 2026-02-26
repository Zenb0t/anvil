---
name: edsc-bun-orchestrator
description: Run and govern the EDSC feature lifecycle in this repository using bun-based commands. Use when work involves scaffolding features, checking gate integrity and staleness, advancing phases, invalidating phases with reasons, applying Phase 7 process deltas, or reporting EDSC status.
---

# EDSC Bun Orchestrator

## Quick Start

- Run from repository root (`cwd` must contain `process/edsc/scripts/edsc.js`).
- Run `bun process/edsc/scripts/edsc.js status <feature-id>` first.
- Run `bun process/edsc/scripts/edsc.js check <feature-id>` before and after edits.
- Advance with `bun process/edsc/scripts/edsc.js advance <feature-id> --to <phase>` only after check passes.

## Workflow

1. Confirm target feature and current phase with `status`.
2. Run `check` and treat any nonzero exit as a blocker.
3. Edit only files required for the active phase gate.
4. Re-run `check` until `Result: PASS`.
5. Advance one phase at a time.
6. In Phase 7, validate and apply deltas with `apply-deltas`.
7. Finish with `bun process/edsc/scripts/edsc.js check --all`.

## Command Set

- Scaffold: `bun process/edsc/scripts/edsc.js scaffold <feature-id> [--mode complicated|complex]`
- Status: `bun process/edsc/scripts/edsc.js status <feature-id>`
- Check one: `bun process/edsc/scripts/edsc.js check <feature-id>`
- Check all: `bun process/edsc/scripts/edsc.js check --all`
- Advance: `bun process/edsc/scripts/edsc.js advance <feature-id> --to <phase>`
- Invalidate: `bun process/edsc/scripts/edsc.js invalidate <feature-id> --phase <phase> --reason "..."`
- Apply deltas: `bun process/edsc/scripts/edsc.js apply-deltas <feature-id>`

## Operating Rules

- Keep each phase `README.md` short; put heavy detail in `appendix/`.
- Never manually force `phase.yaml` statuses to bypass checks.
- Use `invalidate` when evidence regresses; include explicit reason text.
- Do not run `advance` if `check` fails or any upstream phase is stale/fail.

## Bundled Resources

- `references/workflow.md`: phase-by-phase execution checklist.
- `references/recovery.md`: stale/fail recovery and troubleshooting flow.
- `scripts/edsc-bun.ps1`: PowerShell wrapper for bun EDSC commands.
- `scripts/edsc-bun.sh`: POSIX shell wrapper for bun EDSC commands.
