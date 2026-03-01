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
  - `anvil check <id>` — validate gates
  - `anvil advance <id>` — move to next phase
  - `anvil list` — list all features with effective phase and status
  - `anvil lint [<id>]` — validate process artifact format and structure

## Active Work

- `work/features/<feature-id>/README.md`: single pane of glass for each feature.
- `work/features/<feature-id>/state.yaml`: machine-readable state (derived cache).

## Templates

- `process/anvil/templates/feature/`: canonical templates for all 5 phases.

## Reflections

- `docs/reflections/`: session retrospectives and persistent agent learnings.
