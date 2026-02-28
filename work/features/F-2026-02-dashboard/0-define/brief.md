# Brief: F-2026-02-dashboard

## Problem

Anvil's primary consumer is an LLM agent. Currently there is no way to list all active features without running `anvil status <id>` per feature individually. This wastes context tokens and requires the agent to already know which feature IDs exist. A single command that lists all features with their state in minimal output is needed.

## Scope

### In Scope
- New `anvil list` subcommand
- One line per feature: `<feature-id> <effective-phase> <gate-status>`
- Scan all directories under `work/features/`
- Handle zero features gracefully (empty output, exit 0)
- POSIX shell, no new dependencies

### Non-Goals
- No filtering or sorting flags (v1 lists everything)
- No per-phase detail expansion (that's `anvil status <id>`)
- No color or formatting for human readability — optimize for token density
- No `dashboard` or rich TUI — this is `list`, not `dashboard`

## Success Criteria
- `anvil list` with no arguments outputs all features, one per line
- Output is correct: effective phase and gate status match `anvil status` for each feature
- Zero-feature case produces no output and exits cleanly
- Total output tokens scale linearly with feature count (one line each)

## Constraints
- Must be POSIX shell, integrated into existing `bin/anvil` script
- Must work on macOS and Linux (same as existing CLI)
- No runtime dependencies beyond git + POSIX utilities

## Risks
- Low risk overall — this is an additive, read-only command
- Minor risk: `state.yaml` parsing in shell may be fragile; keep the parser minimal
