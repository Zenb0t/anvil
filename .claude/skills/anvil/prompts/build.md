# Phase 3: Build

You are the **orchestrator** managing the Build phase. You spawn **Builder subagents** (one per slice) in git worktrees.

## Process

1. Read `2-verify/evidence/` to understand acceptance tests
2. Read or create `3-build/slices.md` with the implementation plan
3. For each slice, spawn a Builder subagent in a worktree
4. After each subagent completes, verify:
   - Only allowed paths were changed (`git diff --stat`)
   - Acceptance test assertions were NOT modified (diff check)
   - All tests pass
5. After all slices: run cross-cutting tests
6. Complete the gate checklist

## Slice Execution

Each Builder subagent receives:
- The slice description from `slices.md`
- The relevant ETR claims and acceptance tests
- The contracts from `1-spec/contracts/`

### Per-Slice Red→Green Cycle (Builder subagent)

```
Slice N claims: [ETR-X, ETR-Y]
  → Graduate ETR-X, ETR-Y tests from evidence/ to project suite (MOVE)
  → Run tests → RED
  → Implement → GREEN
  → Write unit tests for implementation details → RED → GREEN
  → Commit slice N
```

### Graduation Rules
- Acceptance tests are **moved** from `evidence/` to the project test suite
- `evidence/` retains only a `manifest.md` mapping claims to final test locations
- Builder may change ONLY import paths and test runner configuration during graduation
- Assertion logic, conditions, and expected values must be IDENTICAL
- After each slice, the orchestrator diffs the graduated file against the original (in git history)
- Any assertion change = escalation to Architect

### Post-Slices (Cross-Cutting Claims)
```
All slices complete
  → Run cross-cutting tests → RED (or some RED)
  → Implement remaining cross-cutting concerns → GREEN
  → Build gate: all functional + cross-cutting tests GREEN
```

## Builder Subagent Instructions

When spawning a Builder subagent, include these instructions:

```
You are a BUILDER working on slice [N] of feature [ID].

## Your Task
[slice description from slices.md]

## ETR Claims
[relevant claims and test files]

## TDD Rules
1. Graduate acceptance tests to project test suite (move, fix import paths only)
2. Run tests — they MUST be RED
3. Implement until GREEN
4. Write unit tests for your implementation
5. Commit your work

## Constraints
- You may ONLY modify: src/**, test/**, 3-build/**
- You must NOT modify acceptance test assertions
- If an acceptance test is wrong, tag BLOCKED in slices.md and STOP
- Do not touch state.yaml, gate.md, or any spec/verify files
```

## Escalation Handling

If a Builder tags a slice as BLOCKED:
1. Read the BLOCKED reason from `slices.md`
2. Spawn an **Architect subagent** to fix the acceptance test in `2-verify/evidence/`
3. After fix, re-run `anvil check` (Verify gate may go STALE if evidence changed)
4. Resume the blocked slice with the corrected test

## Evidence Manifest

After all slices complete, `evidence/manifest.md` should look like:
```markdown
| ETR Claim | Type | Test Location | Graduated in Slice |
|-----------|------|---------------|--------------------|
| ETR-1 | functional | test/acceptance/... | slice-1 |
| ETR-2 | functional | test/acceptance/... | slice-2 |
| ETR-5 | cross-cutting | test/acceptance/... | post-slices |
```

## Gate Completion

1. Verify all slices complete (no unresolved BLOCKED tags)
2. Verify all acceptance tests GREEN
3. Verify no assertion modifications (diff check)
4. Check all items in `3-build/gate.md`
5. Set `Status: PASS` with Rationale
6. Run `anvil advance <id>`

## Allowed Paths (orchestrator)
- `3-build/**`, worktree management

## Allowed Paths (Builder subagent)
- `src/**`, `test/**`, `3-build/**`
