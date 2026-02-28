# ANVIL Process

**Agent Navigated Verified Implementation Lifecycle**

ANVIL is a simplified agentic SDLC that fuses rigorous gating with practical simplicity.

## Five Phases

| # | Phase | What happens |
|---|-------|-------------|
| 0 | **Define** | Interview the user, produce a spec brief |
| 1 | **Spec** | Behavioral spec, contracts, ADRs, hardening seeds |
| 2 | **Verify** | ETR matrix, refutation cases, acceptance tests |
| 3 | **Build** | Slice plan, TDD execution per slice via subagents |
| 4 | **Ship** | Hardening audit, review handoff, release notes |

## Two Roles

| Role | Phases | May write | Must NOT write |
|------|--------|-----------|----------------|
| **Architect** | Define, Spec, Verify, Ship | Phase docs, gates, specs, evidence criteria, acceptance tests | Product code |
| **Builder** | Build | Product code, unit/integration tests, slice docs | Specs, evidence criteria, gates, acceptance tests |

## CLI

```sh
anvil init <id>       # Scaffold feature from templates
anvil status <id>     # Print phase + blockers
anvil check <id>      # Validate gate: files exist, checklist complete, deps not stale
anvil advance <id>    # Move to next phase (only if check passes)
anvil list            # List all features with effective phase and gate status
anvil lint [<id>]     # Validate process artifact format and structure
```

## Key Concepts

- **Gates** enforce phase transitions with mechanical validation
- **Staleness detection** uses git anchors to catch changed dependencies
- **Cascade rule** ensures upstream changes propagate forward
- **Acceptance tests** are authored by Architect (Verify), graduated by Builder (Build)
- **state.yaml** is a derived cache — never manually edited
