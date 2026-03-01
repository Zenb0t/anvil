# Anvil

Agent Navigated Verified Implementation Lifecycle.

## Skills

- **anvil**: ANVIL orchestrator — manages features through Define, Spec, Verify, Build, Ship phases. Canonical source is `.claude/skills/anvil/SKILL.md`. `skills/anvil/` is a generated mirror (`bin/sync-anvil-skill sync`).

## Project Conventions

- Anvil is consumed by LLM agents, not humans — optimize all output for context density and token efficiency
- CLI lives at `bin/anvil` (POSIX shell)
- Process definition in `process/anvil/`
- Feature workspaces in `work/features/`
- Templates in `process/anvil/templates/feature/`
- Canonical ANVIL skill files live in `.claude/skills/anvil/`
- State is derived — never manually edit `state.yaml`
- `cmd_*` functions use `return` (not `exit`) so tests can source `bin/anvil` via `ANVIL_SOURCED=1`

## Bug Fix Workflow

Bug fixes do NOT go through the full anvil process. Instead:
1. Create a GitHub issue describing the bug
2. Branch from main (`fix/<short-description>`)
3. Direct patches — no feature scaffolding, no phases
4. Create PR linked to the issue (`Closes #N`)

## Testing Conventions

- Batch test fixtures (create all at top, cleanup at bottom) — Windows Git Bash forks are slow
- Source `bin/anvil` in test runners to avoid per-test fork overhead
