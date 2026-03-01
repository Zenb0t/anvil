# Anvil

**Agent Navigated Verified Implementation Lifecycle**

Anvil is a simplified agentic SDLC that fuses rigorous phase-gating with practical simplicity. It drives features through five phases:

`Define -> Spec -> Verify -> Build -> Ship`

It includes:
- A Bun-native CLI for scaffolding, checking, and advancing features.
- Mechanical gate validation (required files, checklists, git-based staleness detection).
- Deterministic Claude Code hooks for safety and post-write validation.
- Feature templates and phase prompts for structured execution.
- Two roles (Architect + Builder) with transparent diff-based enforcement.
- Falsification-first verification with executable acceptance tests.

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).

## Prerequisites

- Git
- Bun (`1.3.9+`)
- make

## Quick Start

```bash
bun bin/anvil init F-2026-03-my-feature
bun bin/anvil status F-2026-03-my-feature
bun bin/anvil check F-2026-03-my-feature
bun bin/anvil advance F-2026-03-my-feature
```

On Windows, you can also run `bin\\anvil.cmd ...` directly from PowerShell or cmd.

## Common Commands

```bash
anvil init <feature-id>       # Scaffold a new feature from templates
anvil status <feature-id>     # Print phase status and blockers
anvil check <feature-id>      # Validate current gate (files, checklist, staleness)
anvil advance <feature-id>    # Move to next phase (runs check first)
bin/sync-anvil-skill check    # Verify skills/anvil mirror is in sync
anvil status <feature-id> --json  # Machine-readable phase/status payload
anvil check <feature-id> --json   # Machine-readable gate validation payload
anvil list --json                 # Machine-readable feature summary
anvil lint --output json          # Machine-readable frontmatter/schema diagnostics
```

## Install CLI Symlink

```bash
make install    # Symlink bin/anvil to ~/.local/bin/anvil
make uninstall  # Remove managed ~/.local/bin/anvil symlink
```

If `~/.local/bin` is not on your PATH, add it in your shell profile.

## Repository Layout

- `process/anvil/` - ANVIL process definition, templates, and README.
- `.claude/skills/anvil/` - Canonical ANVIL skill source for Claude Code.
- `skills/anvil/` - Generated mirror for non-Claude tooling.
- `.claude/hooks/` - Deterministic Claude guardrails and async lint hook.
- `.claude/settings.json` - Hook configuration.
- `bin/anvil` - CLI entry point (Bun runtime).
- `bin/sync-anvil-skill` - Sync/check helper for skill mirror consistency.
- `Makefile` - install/uninstall helper targets for `~/.local/bin/anvil`.
- `work/features/` - Generated feature workspaces.
- `docs/` - Documentation index.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md).
