# Anvil

Agent Navigated Verified Implementation Lifecycle.

## Skills

- **anvil**: ANVIL orchestrator. Canonical source is `.claude/skills/anvil/SKILL.md`. `skills/anvil/` is a generated mirror via `bin/sync-anvil-skill`.

## Project Conventions

- Anvil is consumed by LLM agents, not humans. Optimize output for context density and token efficiency.
- CLI lives at `bin/anvil` (POSIX shell).
- Process definition lives in `process/anvil/`.
- Feature workspaces live in `work/features/`.
- Templates live in `process/anvil/templates/feature/`.
- Canonical ANVIL skill files live in `.claude/skills/anvil/`.
- Deterministic Claude hooks are configured in `.claude/settings.json`.
- State is derived. Never manually edit `state.yaml`.
- `cmd_*` functions use `return` (not `exit`) so tests can source `bin/anvil` via `ANVIL_SOURCED=1`.

## Bug Fix Workflow

Bug fixes do not go through the full anvil process:
1. Create a GitHub issue describing the bug.
2. Branch from main (`fix/<short-description>`).
3. Apply direct patches. No feature scaffolding and no phase flow.
4. Open a PR linked to the issue (`Closes #N`).

## Testing Conventions

- Batch test fixtures at top and cleanup at bottom (Windows Git Bash forks are slow).
- Source `bin/anvil` in test runners to avoid per-test fork overhead.
