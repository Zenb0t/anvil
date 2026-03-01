# Documentation Index

This repository uses docs as a system of record.

## Process

- `process/anvil/README.md`: ANVIL overview - 5 phases, 2 roles, gating mechanics.
- `.claude/skills/anvil/SKILL.md`: canonical orchestrator skill for autonomous phase management.
- `.claude/skills/anvil/prompts/`: canonical phase-specific prompts (define, spec, verify, build, ship).
- `skills/anvil/`: generated mirror for non-Claude tooling (`bin/sync-anvil-skill sync`).
- `.claude/hooks/README.md`: deterministic Claude hook guardrails and async validation.

## CLI

- `bin/anvil`: Bun-native CLI.
  - `anvil init <id>` - scaffold a feature
  - `anvil status <id>` - print phase status
  - `anvil status <id> --json` - machine-readable phase status
  - `anvil check <id>` - validate gates
  - `anvil check <id> --json` - machine-readable gate validation
  - `anvil list` - list all features with effective phase and status
  - `anvil list --json` - machine-readable feature listing
  - `anvil advance <id>` - move to next phase
  - `anvil lint [<id>]` - validate process artifacts, frontmatter, and schema structure

## Active Work

- `work/features/<feature-id>/README.md`: single pane of glass for each feature.
- `work/features/<feature-id>/state.yaml`: machine-readable state (derived cache).

## Templates

- `process/anvil/templates/feature/`: canonical templates for all 5 phases.

## Reflections

- `docs/reflections/`: session retrospectives and persistent agent learnings.
