# AGENTS

Start here, then follow links:

- `docs/index.md`: full doc map.
- `process/anvil/README.md`: how ANVIL works (5 phases, 2 roles, gating).
- `skills/anvil/SKILL.md`: orchestrator skill for autonomous phase management.
- `skills/anvil/prompts/`: phase-specific prompts (define, spec, verify, build, ship).

When resuming a feature:

1. Run `anvil check <id>` — always start with a mechanical check.
2. Open `work/features/<id>/README.md` for context and decisions.
3. Open `work/features/<id>/state.yaml` for machine-readable state.
4. Run `anvil status <id>` for current phase and blockers.
