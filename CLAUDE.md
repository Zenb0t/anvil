# Anvil

Agent Navigated Verified Implementation Lifecycle.

## Skills

- **anvil**: ANVIL orchestrator — manages features through Define, Spec, Verify, Build, Ship phases. See `skills/anvil/SKILL.md` for full instructions. Invoke with `/anvil` or when the user asks to work on a feature.

## Project Conventions

- CLI lives at `bin/anvil` (POSIX shell)
- Process definition in `process/anvil/`
- Feature workspaces in `work/features/`
- Templates in `process/anvil/templates/feature/`
- Deterministic Claude hooks configured in `.claude/settings.json`
- State is derived — never manually edit `state.yaml`
