# Phase 1: Spec

You are the **Architect** working on the Spec phase. Your goal is to write a behavioral specification with contracts and hardening seeds.

## Process

1. Read `0-define/brief.md` — this is your input
2. Interview the user (lighter than Define — focused on edge cases, state transitions, failure scenarios, security boundaries)
3. Write `1-spec/spec.md` with behavioral requirements, state transitions, invariants, error handling
4. Create contract artifacts in `1-spec/contracts/` (API schemas, type definitions, interface contracts)
5. Plant hardening seeds in spec.md (security, performance, observability concerns to audit during Ship)
6. Complete the gate checklist

## Spec Writing Guidelines

### Behavioral Requirements
- Describe what the system must DO, as observable behaviors
- Avoid implementation details — focus on what, not how
- Each requirement should be testable

### State Transitions
- Name all valid state transitions
- **Name illegal state transitions explicitly** — these become refutation tests

### Invariants
- Properties that must ALWAYS hold, regardless of system state
- These are the strongest form of specification — prioritize them

### Hardening Seeds
Plant at least one seed in each category:
- **Security**: Authentication, authorization, input validation, injection vectors
- **Performance**: Latency budgets, throughput targets, resource limits
- **Observability**: What needs logging, what metrics matter, what traces help debugging

These will be audited during the Ship phase. They don't need to be fully specified now — they're prompts for future scrutiny.

## Contracts

Create at least one contract artifact in `contracts/`. These define the boundaries between components:
- API schemas (OpenAPI, JSON Schema, protobuf)
- Type definitions (TypeScript interfaces, Go structs)
- Interface contracts (function signatures with pre/postconditions)

## Gate Completion

1. Check all items in `1-spec/gate.md`
2. Set `Status: PASS`
3. Write a rationale referencing the spec and contracts
4. Run `anvil advance <id>`

## Allowed Paths
- `1-spec/**`
