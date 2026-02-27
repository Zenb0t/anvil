# Anvil

**Agent Navigated Verified Implementation Lifecycle**

Anvil is a simplified agentic SDLC that fuses rigorous phase-gating with practical simplicity. It drives features through five phases:

`Define → Spec → Verify → Build → Ship`

It includes:
- A zero-dependency POSIX shell CLI for scaffolding, checking, and advancing features.
- Mechanical gate validation (required files, checklists, git-based staleness detection).
- Feature templates and phase prompts for structured execution.
- Two roles (Architect + Builder) with transparent diff-based enforcement.
- Falsification-first verification with executable acceptance tests.

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).

## Prerequisites

- Git
- POSIX shell (sh/bash/zsh)

## Quick Start

```bash
bin/anvil init F-2026-03-my-feature
bin/anvil status F-2026-03-my-feature
bin/anvil check F-2026-03-my-feature
bin/anvil advance F-2026-03-my-feature
```

## Common Commands

```bash
anvil init <feature-id>       # Scaffold a new feature from templates
anvil status <feature-id>     # Print phase status and blockers
anvil check <feature-id>      # Validate current gate (files, checklist, staleness)
anvil advance <feature-id>    # Move to next phase (runs check first)
```

## Repository Layout

- `process/anvil/` — ANVIL process definition, templates, and README.
- `skills/anvil/` — Orchestrator skill and phase prompts.
- `bin/anvil` — CLI entry point (POSIX shell script).
- `work/features/` — Generated feature workspaces.
- `docs/` — Documentation index.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md).
