# Anvil

Agent Navigated Verified Implementation Lifecycle.

## Skills

- **anvil**: ANVIL orchestrator — manages features through Define, Spec, Verify, Build, Ship phases. See `skills/anvil/SKILL.md` for full instructions. Invoke with `/anvil` or when the user asks to work on a feature.

## Project Conventions

- Anvil is consumed by LLM agents, not humans — optimize all output for context density and token efficiency
- CLI lives at `bin/anvil` (POSIX shell)
- Process definition in `process/anvil/`
- Feature workspaces in `work/features/`
- Templates in `process/anvil/templates/feature/`
- State is derived — never manually edit `state.yaml`
