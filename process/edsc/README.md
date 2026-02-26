# EDSC Process Kit v0.1

EDSC is a repo-native process harness that moves work through:

PRD -> Framing -> Spec -> ADR/contracts -> Verification + Oracle -> Implementation -> Hardening -> Release/Learning

## Layout

- `templates/feature/`: phase templates used by `edsc scaffold`
- `prompts/`: role prompts for conductor, oracle validator, and implementer
- `scripts/edsc.js`: CLI entrypoint
- `scripts/edsc-lib.js`: library for checks, fingerprints, and state updates
- `references/`: short process references

## CLI

Run from repo root:

```bash
bun process/edsc/scripts/edsc.js scaffold <feature-id>
bun process/edsc/scripts/edsc.js status <feature-id>
bun process/edsc/scripts/edsc.js check <feature-id>
bun process/edsc/scripts/edsc.js check --all
bun process/edsc/scripts/edsc.js advance <feature-id> --to <phase>
bun process/edsc/scripts/edsc.js invalidate <feature-id> --phase <phase> --reason "..."
bun process/edsc/scripts/edsc.js apply-deltas <feature-id>
```

## Operational Rules

- Every phase has `README.md`, `gate.md`, and `appendix/`.
- `gate.md` frontmatter defines dependencies, required files, and TTL.
- `edsc check` computes dependency fingerprints and marks stale phases.
- Stale or failed gates block progression.
- Oracle assets are scaffolded separately under `/oracle-repo-template/`.
