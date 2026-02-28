# Documentation Index

This repository uses docs as a system of record.

## Process

- `process/anvil/README.md`: ANVIL overview — 5 phases, 2 roles, gating mechanics.
- `skills/anvil/SKILL.md`: orchestrator skill for autonomous phase management.
- `skills/anvil/prompts/`: phase-specific prompts (define, spec, verify, build, ship).

## CLI

- `bin/anvil`: zero-dependency POSIX shell CLI.
  - `anvil init <id>` — scaffold a feature
  - `anvil status <id>` — print phase status
  - `anvil status <id> --json` — machine-readable phase status
  - `anvil check <id>` — validate gates
  - `anvil check <id> --json` — machine-readable gate validation
  - `anvil list --json` — machine-readable feature listing
  - `anvil advance <id>` — move to next phase

## Active Work

- `work/features/<feature-id>/README.md`: single pane of glass for each feature.
- `work/features/<feature-id>/state.yaml`: machine-readable state (derived cache).

## Templates

- `process/anvil/templates/feature/`: canonical templates for all 5 phases.
