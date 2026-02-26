# Anvil EDSC Process Kit

Anvil is a repo-native engineering workflow kit (EDSC) that drives features through:

`PRD -> Framing -> Spec -> Arch -> Verification -> Implementation -> Hardening -> Release/Learning`

It includes:
- A Bun-based CLI to scaffold/check/advance feature phases.
- Mechanical gate validation (required files, dependencies, TTL, staleness).
- Feature templates and prompts for structured execution.
- An oracle-repo template for independent verification workflows.

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).

## Prerequisites

- Bun `1.3.9+`

## Quick Start

```bash
bun process/edsc/scripts/edsc.js scaffold F-2026-02-demo
bun process/edsc/scripts/edsc.js check F-2026-02-demo
bun process/edsc/scripts/edsc.js status F-2026-02-demo
```

Or use wrapper scripts:

```bash
bin/edsc check --all
```

## Common Commands

```bash
bun process/edsc/scripts/edsc.js scaffold <feature-id> [--mode complicated|complex]
bun process/edsc/scripts/edsc.js status <feature-id>
bun process/edsc/scripts/edsc.js check <feature-id>
bun process/edsc/scripts/edsc.js check --all
bun process/edsc/scripts/edsc.js advance <feature-id> --to <phase>
bun process/edsc/scripts/edsc.js invalidate <feature-id> --phase <phase> --reason "..."
bun process/edsc/scripts/edsc.js apply-deltas <feature-id>
```

## Development

```bash
bun test
bun process/edsc/scripts/edsc.js check --all
```

## Repository Layout

- `process/edsc/` - EDSC templates, scripts, prompts, references.
- `work/features/` - generated feature workspaces.
- `oracle-repo-template/` - independent oracle validation skeleton.
- `skills/` - agent skills (including Bun-based EDSC skill).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md).
