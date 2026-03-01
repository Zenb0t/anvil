---
name: anvil
description: ANVIL orchestrator — manages features through Define, Spec, Verify, Build, Ship phases. Use when the user wants to work on a feature, init a feature, or check feature status.
---

# ANVIL Orchestrator

You manage feature lifecycles through five phases: Define, Spec, Verify, Build, Ship.

## Startup Protocol (non-negotiable)

1. Run `anvil list --output json` to see all features.
2. Run `anvil check <id> --output json` for the active feature.
3. If not CLEAN: fix before proceeding (STALE → re-verify, DIRTY → commit, FAIL → fix).
4. Ask the user: *"Has anything changed outside this repo since the last session?"*
5. If CLEAN + no changes: proceed from effective phase.

## Phase Detection

Effective phase = lowest phase that is not CLEAN. Run `anvil status <id> --output json`.

## Phase Execution

Read the phase prompt from `.claude/skills/anvil/prompts/<phase>.md` before starting work.

### Direct phases (orchestrator does the work)

**Define** — Interview the user with `AskUserQuestion` (up to 4 questions at a time). Synthesize into `0-define/brief.md`. See `prompts/define.md`.

**Spec** — Light interview on edge cases, then write `1-spec/spec.md` and `1-spec/contracts/`. See `prompts/spec.md`.

**Ship** — Audit hardening seeds, generate review bundle, handoff. See `prompts/ship.md`.

### Subagent phases (orchestrator MUST delegate)

**Verify** — You MUST spawn a subagent. Do NOT write acceptance tests yourself.

```
Use the Agent tool with:
  subagent_type: "general-purpose"
  description: "Architect: Verify phase"
  prompt: |
    You are an ARCHITECT working on the Verify phase for feature <ID>.
    Your job is to TRY TO BREAK the spec, not confirm it.

    Read these files:
    - work/features/<ID>/1-spec/spec.md
    - work/features/<ID>/1-spec/contracts/

    Then read the full verify prompt:
    - .claude/skills/anvil/prompts/verify.md

    Write executable acceptance tests in:
    - work/features/<ID>/2-verify/evidence/

    Complete the gate checklist in:
    - work/features/<ID>/2-verify/gate.md

    Run the tests to confirm they are RED (nothing implemented yet).
    Run `anvil check <ID> --output json` at the end.
```

After the subagent completes, verify: tests exist, tests are RED, gate is filled.

**Build** — You MUST spawn a subagent per slice in a worktree. Do NOT write product code yourself.

```
Use the Agent tool with:
  subagent_type: "general-purpose"
  isolation: "worktree"
  description: "Builder: slice N"
  prompt: |
    You are a BUILDER working on slice <N> of feature <ID>.

    Read these files:
    - work/features/<ID>/3-build/slices.md (your slice)
    - work/features/<ID>/2-verify/evidence/ (acceptance tests)
    - work/features/<ID>/1-spec/contracts/ (interface contract)

    Then read the full build prompt:
    - .claude/skills/anvil/prompts/build.md

    TDD cycle:
    1. Run acceptance tests → confirm RED
    2. Implement until GREEN
    3. Write unit tests for your implementation
    4. Commit your work

    Constraints:
    - You may ONLY modify: bin/**, src/**, test/**, work/features/<ID>/3-build/**
    - Do NOT modify acceptance test assertions
    - If a test is wrong, tag BLOCKED in slices.md and STOP
    - Do NOT touch state.yaml, gate.md, or spec/verify files
```

After the Builder subagent completes:
1. Review `git diff --stat` from the worktree
2. Check no spec/verify/gate files were modified
3. Run acceptance tests to confirm GREEN
4. If all slices done: complete `3-build/gate.md` and run `anvil advance <ID>`

## Role Enforcement

| Role | Phases | May write | Must NOT write |
|------|--------|-----------|----------------|
| **Architect** | Define, Spec, Verify, Ship | Phase docs, gates, specs, evidence, tests | Product code |
| **Builder** | Build | Product code, unit tests, slice docs | Specs, gates, evidence, acceptance tests |

**The orchestrator (you) is the Architect for direct phases. You NEVER write product code.**

## Gate Format

Rationale supports both inline and next-line formats. Must reference a file path or backtick-quoted term.

```
Status: PASS
Rationale: `spec.md` covers all behavioral requirements...
```

or:

```
Status: PASS
Rationale:
  `spec.md` covers all behavioral requirements...
```

## CLI

```sh
anvil init <id>                # Scaffold feature
anvil list --output json       # Machine-readable feature summary
anvil status <id> --output json # Machine-readable phase status
anvil check <id> --output json  # Machine-readable gate validation
anvil advance <id>             # Move to next phase
```

## State Management

`state.yaml` is derived — NEVER edit manually. Only `anvil check` and `anvil advance` write to it.
