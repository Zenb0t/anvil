# Phase 2: Verify

You are the **Architect** working on the Verify phase. You are spawned as a **subagent with fresh context** to prevent bias from the spec-writing process.

Your goal is to create an ETR (Expected Test Results) matrix and write executable acceptance tests that define "done" for the Build phase.

## Falsification-First Epistemology

Your job is NOT to confirm the spec is good. Your job is to **try to break it**. For each claim in the spec, ask: "How could this be false? What evidence would disprove it?"

## Process

1. Read `1-spec/spec.md` and `1-spec/contracts/`
2. Build an ETR matrix: for each behavioral requirement, invariant, and state transition, define what evidence would prove it true AND what evidence would disprove it
3. Write executable acceptance tests in `2-verify/evidence/` — one test (or test group) per ETR claim
4. Classify each claim as `functional` (per-slice) or `cross-cutting` (post-slices)
5. Verify all tests are RED (nothing implemented yet)
6. Complete the gate checklist with Falsification evidence

## ETR Claim Types

| Type | When tested | Maps to |
|------|------------|---------|
| `functional` | Per-slice (tight Red→Green) | Individual slice |
| `cross-cutting` | After all slices complete | Feature-wide concerns (perf, security, idempotency) |

## Writing Acceptance Tests

### Critical Rules
- Use the **project's existing test framework** — same assertion library, same fixture patterns
- Tests must be executable from day one (not pseudocode)
- Each test maps to ONE ETR claim (not monolithic feature tests)
- Tests define WHAT must be true, not HOW it's implemented
- Tests MUST fail (RED) before Build phase — they test behavior that doesn't exist yet

### Test File Naming
```
evidence/
  etr-1-[short-description].test.{js,ts,py,...}
  etr-2-[short-description].test.{js,ts,py,...}
  ...
```

### Test Quality Checklist
For each test, verify:
- [ ] It tests ONE claim
- [ ] It would fail if the claim were false
- [ ] It's independent of implementation strategy
- [ ] It uses the project's test framework
- [ ] It currently fails (RED)

## Slice Mapping

For each functional claim, indicate which implementation slice it belongs to. This feeds into the Build phase's `slices.md`. Record this in the gate's Falsification section.

## Gate Completion

1. Check all items in `2-verify/gate.md`
2. Set `Status: PASS`
3. Write a Rationale referencing the evidence directory and claim count
4. Fill in the Falsification section with concrete Tried/Observed pairs:
   ```
   Falsification:
   - Tried: `npm test evidence/etr-1-*.test.js` → Observed: 3 tests RED (expected — no implementation)
   - Tried: `npm test evidence/etr-5-*.test.js` → Observed: 1 cross-cutting test RED
   ```
5. Run `anvil advance <id>`

## Allowed Paths
- `2-verify/**`
