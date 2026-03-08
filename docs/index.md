# Documentation Index

This repository uses docs as a system of record.

## Process

- `openspec/config.yaml`: project configuration with epistemic rules.
- `.claude/skills/proof-agent/SKILL.md`: proof-oriented orchestrator skill.
- `.claude/skills/proof-agent/prompts/`: phase-specific prompts (interview, pre-verify, build, review).
- `.claude/skills/openspec-*/SKILL.md`: generated OpenSpec skills (propose, apply, archive, explore).
- `.claude/hooks/README.md`: deterministic Claude hook guardrails and async validation.

## OpenSpec CLI

- `openspec list --json` — list all active changes
- `openspec status --change <name> --json` — artifact completion status
- `openspec validate --all --json` — structural validation
- `openspec show <name> --json` — change details
- `openspec instructions <artifact> --change <name> --json` — artifact guidance
- `openspec archive <name> --yes` — archive completed change

## Active Work

- `openspec/changes/<change-name>/`: active change artifacts (proposal, design, specs, tasks).
- `openspec/changes/archive/`: archived completed changes.
- `openspec/specs/`: source-of-truth specifications.

## Reflections

- `docs/reflections/`: session retrospectives and persistent agent learnings.
