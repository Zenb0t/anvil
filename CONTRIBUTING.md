# Contributing

Thanks for contributing.

## Development Setup

1. Install Bun (`1.3.9+`).
2. Run tests:
   - `bun test`
3. Run process checks:
   - `bun process/edsc/scripts/edsc.js check --all`
4. Validate ANVIL skill mirror consistency:
   - `bin/sync-anvil-skill check`

## Pull Requests

1. Keep changes focused and atomic.
2. Add or update tests for behavior changes.
3. Ensure CI passes (`bun test` and `edsc check --all`).
4. Include a clear summary of behavior changes and migration impacts.

## Issues

- Use issue templates for bugs and feature requests.
- Include reproduction steps and expected vs actual behavior.

## Style

- Prefer small, reviewable diffs.
- Keep docs and templates aligned with CLI behavior.
