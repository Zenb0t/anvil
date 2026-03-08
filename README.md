# Anvil

**Agent Navigated Verified Implementation Lifecycle**

Anvil is a proof-oriented agentic SDLC powered by [OpenSpec](https://github.com/Fission-AI/OpenSpec). It validates output code against specs using falsification-first verification.

It includes:
- OpenSpec-driven artifact flow (proposal → specs → design → tasks → implement → verify → archive).
- Falsification-first acceptance tests written BEFORE implementation.
- ETR (Expected Test Results) matrices mapping spec requirements to test evidence.
- Builder subagent delegation with TDD in isolated worktrees.
- Deterministic Claude Code hooks for safety and post-write validation.
- Hardening seeds (security, performance, observability) planted in specs and audited at review.

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).

## Prerequisites

- Git
- Node.js (for OpenSpec CLI)
- Bun (`1.3.9+`) (for hooks and tests)

## Quick Start

```bash
npm install
openspec list --json
openspec status --json
```

## Common Commands

```bash
openspec list --json                          # List all active changes
openspec status --change <name> --json        # Artifact completion status
openspec validate --all --json                # Structural validation
openspec show <name> --json                   # Change details
openspec instructions <artifact> --change <name> --json  # Artifact guidance
openspec archive <name> --yes                 # Archive completed change
```

## Repository Layout

- `openspec/` - OpenSpec project root (specs, changes, config).
- `.claude/skills/proof-agent/` - Proof-oriented orchestrator skill and prompts.
- `.claude/skills/openspec-*/` - Generated OpenSpec skills (propose, apply, archive, explore).
- `.claude/skills/reflect/` - Conversation reflection skill.
- `.claude/hooks/` - Deterministic Claude guardrails and async validation.
- `.claude/settings.json` - Hook configuration.
- `.claude/commands/opsx/` - OpenSpec slash commands.
- `docs/` - Documentation index.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md).
