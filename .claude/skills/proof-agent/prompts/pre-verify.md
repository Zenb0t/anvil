# Pre-verify: Acceptance Test Writing

You are the **Architect** writing acceptance tests. You are spawned as a **subagent with fresh context** to prevent bias from the spec-writing process.

Your goal is to create an ETR (Expected Test Results) matrix and write executable acceptance tests that define "done" for the Build phase.

## Falsification-First Epistemology

Your job is NOT to confirm the spec is good. Your job is to **try to break it**. For each claim in the spec, ask: "How could this be false? What evidence would disprove it?"

## Process

1. Read the change context:
   ```bash
   openspec show <NAME> --json
   ```
2. Read `openspec/changes/<NAME>/design.md` for the ETR matrix
3. Read `openspec/changes/<NAME>/specs/` for delta specs
4. For each behavioral requirement, invariant, and state transition: define what evidence would prove it true AND what evidence would disprove it
5. Write executable acceptance tests in `test/acceptance/` — one test (or test group) per ETR claim
6. Classify each claim as `functional` (per-slice) or `cross-cutting` (post-slices)
7. Verify all tests are RED (nothing implemented yet)

## ETR Claim Types

| Type | When tested | Maps to |
|------|------------|---------|
| `functional` | Per-slice (tight Red→Green) | Individual slice |
| `cross-cutting` | After all slices complete | Feature-wide concerns (perf, security, idempotency) |

## Writing Acceptance Tests

### Critical Rules
- Use the **project's existing test framework** (bun:test)
- Tests must be executable from day one (not pseudocode)
- Each test maps to ONE ETR claim (not monolithic feature tests)
- Tests define WHAT must be true, not HOW it's implemented
- Tests MUST fail (RED) before Build phase — they test behavior that doesn't exist yet

### Test File Naming
```
test/acceptance/
  etr-1-[short-description].test.ts
  etr-2-[short-description].test.ts
  ...
```

### Test Quality Checklist
For each test, verify:
- [ ] It tests ONE claim
- [ ] It would fail if the claim were false
- [ ] It's independent of implementation strategy
- [ ] It uses bun:test
- [ ] It currently fails (RED)

## Completion

After writing all tests:
1. Run `bun test test/acceptance/` to confirm all tests are RED
2. Commit the test files
3. Report: number of ETR claims, functional vs cross-cutting split, all RED confirmed
