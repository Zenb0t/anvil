# Documentation Index

This repository uses docs as a system of record.

## Process

- `process/anvil/README.md`: ANVIL overview — 5 phases, 2 roles, gating mechanics.
- `.claude/skills/anvil/SKILL.md`: canonical orchestrator skill for autonomous phase management.
- `.claude/skills/anvil/prompts/`: canonical phase-specific prompts (define, spec, verify, build, ship).
- `skills/anvil/`: generated mirror for non-Claude tooling (`bin/sync-anvil-skill sync`).

## CLI

- `bin/anvil`: zero-dependency POSIX shell CLI.
  - `anvil init <id>` — scaffold a feature
  - `anvil status <id>` — print phase status
  - `anvil check <id>` — validate gates
  - `anvil advance <id>` — move to next phase
  - `anvil list` — list all features with effective phase and status
  - `anvil lint [<id>]` — validate process artifact format and structure

## Active Work

- `work/features/<feature-id>/README.md`: single pane of glass for each feature.
- `work/features/<feature-id>/state.yaml`: machine-readable state (derived cache).

## Templates

- `process/anvil/templates/feature/`: canonical templates for all 5 phases.
