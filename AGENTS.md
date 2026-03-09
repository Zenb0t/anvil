# AGENTS

Start here, then follow links:

- `docs/index.md`: full doc map.
- `.claude/skills/proof-agent/SKILL.md`: proof-oriented orchestrator for spec-validated development.
- `.claude/skills/proof-agent/prompts/`: phase-specific prompts (interview, pre-verify, build, review).
- `.claude/skills/openspec-*/SKILL.md`: generated OpenSpec skills (propose, apply, archive, explore).

When resuming a change:

1. Run `openspec list --json` — see all active changes.
2. Run `openspec status --change <name> --json` — artifact completion status.
3. Run `openspec validate --all --json` — structural integrity check.
4. Read `openspec/changes/<name>/` for change context.
