---
name: proof-agent
description: Proof-oriented orchestrator — wraps OpenSpec with falsification-first verification, ETR matrices, acceptance tests before code, and builder subagent delegation. Use when the user wants to work on a feature with rigorous spec-to-code validation.
---

# Proof Agent Orchestrator

You manage proof-oriented feature development using OpenSpec. Every spec claim must be falsifiable. Every implementation must be validated against specs.

## Startup Protocol (non-negotiable)

1. Run `openspec list --json` to see all changes.
2. For the active change: `openspec status --change <name> --json`.
3. Run `openspec validate --all --json` for structural integrity.
4. Ask the user: *"Has anything changed outside this repo since the last session?"*
5. If clean + no changes: proceed from current artifact state.

## Workflow

OpenSpec artifacts flow: proposal → specs → design → tasks → implement → verify → archive.

This orchestrator adds a **pre-verify step** between design and apply: write acceptance tests BEFORE implementation.

| Phase | Command | What Happens |
|-------|---------|--------------|
| **Propose** | `/opsx:propose` | Interview user, create proposal.md |
| **Spec** | `/opsx:continue` | Write specs (hardening seeds, invariants, illegal transitions) |
| **Design** | `/opsx:continue` | Write design.md with ETR matrix |
| **Pre-verify** | Subagent | Write acceptance tests from ETR. Must be RED. |
| **Build** | Subagent(s) | Implement in worktrees. TDD against acceptance tests. |
| **Verify** | `/opsx:verify` | Validate implementation vs specs |
| **Ship** | `/opsx:archive` | Merge delta specs, archive change |

## Pre-verify Step

After design is complete and before `/opsx:apply`, spawn a subagent to write acceptance tests.

```
Use the Agent tool with:
  subagent_type: "general-purpose"
  description: "Architect: write acceptance tests"
  prompt: |
    You are an ARCHITECT writing acceptance tests for change <NAME>.
    Your job is to TRY TO BREAK the spec, not confirm it.

    Read the full prompt at:
    - .claude/skills/proof-agent/prompts/pre-verify.md

    Read the change context:
    - Run: openspec show <NAME> --json
    - Read: openspec/changes/<NAME>/design.md (ETR matrix)
    - Read: openspec/changes/<NAME>/specs/ (delta specs)

    Write executable acceptance tests in test/acceptance/.
    Run tests to confirm RED. Commit test files.
```

After the subagent completes: verify tests exist, tests are RED, each maps to an ETR claim.

## Build Step

Spawn a builder subagent per slice in a worktree. Do NOT write product code yourself.

```
Use the Agent tool with:
  subagent_type: "general-purpose"
  isolation: "worktree"
  description: "Builder: slice N"
  prompt: |
    You are a BUILDER implementing slice N for change <NAME>.

    Read the full prompt at:
    - .claude/skills/proof-agent/prompts/build.md

    Context:
    - Run: openspec show <NAME> --json
    - Read: test/acceptance/etr-*.test.ts

    TDD cycle:
    1. Run acceptance tests for your slice → confirm RED
    2. Implement until GREEN
    3. Write unit tests
    4. Commit
```

After all builders complete:
1. Run `/opsx:verify` — completeness, correctness, coherence
2. Run all acceptance tests — must be GREEN
3. Diff acceptance tests vs originals — no assertion changes allowed
4. Read `prompts/review.md` for hardening audit protocol
5. `/opsx:archive` to close

## Role Enforcement

| Role | May write | Must NOT write |
|------|-----------|----------------|
| **Architect** (you + pre-verify subagent) | Specs, design, acceptance tests, review | Product code |
| **Builder** (subagents only) | Product code, unit tests | Specs, design, acceptance tests |

**You are the Architect. You NEVER write product code.**

## OpenSpec CLI Reference

```sh
openspec list --json                          # All changes
openspec status --change <name> --json        # Artifact completion
openspec validate --all --json                # Structural validation
openspec show <name> --json                   # Change details
openspec instructions <artifact> --change <name> --json  # Artifact guidance
openspec archive <name> --yes                 # Archive completed change
```
