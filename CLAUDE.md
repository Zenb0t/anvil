# Anvil

Agent Navigated Verified Implementation Lifecycle.

## Skills

- **proof-agent**: Proof-oriented orchestrator wrapping OpenSpec with falsification-first verification. Canonical source is `.claude/skills/proof-agent/SKILL.md`.
- **reflect**: Conversation reflection for persistent learnings. Source is `.claude/skills/reflect/SKILL.md`.
- **openspec-\***: Generated OpenSpec skills (propose, apply, archive, explore) in `.claude/skills/`.

## Project Conventions

- Anvil is consumed by LLM agents, not humans. Optimize output for context density and token efficiency.
- Process powered by OpenSpec CLI (`npx openspec`).
- Specifications live in `openspec/specs/`.
- Active changes live in `openspec/changes/`.
- Archived changes live in `openspec/changes/archive/`.
- Project config lives in `openspec/config.yaml`.
- Deterministic Claude hooks are configured in `.claude/settings.json`.
- State is queried via `openspec status --json`, never stored in files.

## Bug Fix Workflow

Bug fixes do not go through the full proof-agent process:
1. Create a GitHub issue describing the bug.
2. Branch from main (`fix/<short-description>`).
3. Apply direct patches. No change scaffolding and no artifact flow.
4. Open a PR linked to the issue (`Closes #N`).

## Testing Conventions

- Acceptance tests live in `test/acceptance/` (created by proof-agent pre-verify step).
- Use bun:test framework.
- Prefer invoking `openspec validate --all --json` for structural validation.
