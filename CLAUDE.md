# Anvil

Agent Navigated Verified Implementation Lifecycle.

## Skills

- **anvil**: ANVIL orchestrator — manages features through Define, Spec, Verify, Build, Ship phases. Canonical source is `.claude/skills/anvil/SKILL.md`. `skills/anvil/` is a generated mirror (`bin/sync-anvil-skill sync`).

## Project Conventions

- CLI lives at `bin/anvil` (POSIX shell)
- Process definition in `process/anvil/`
- Feature workspaces in `work/features/`
- Templates in `process/anvil/templates/feature/`
- Canonical ANVIL skill files live in `.claude/skills/anvil/`
- State is derived — never manually edit `state.yaml`
