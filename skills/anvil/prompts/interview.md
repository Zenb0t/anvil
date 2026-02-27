# Interview Protocol

Reusable structured interview protocol for Define and Spec phases.

## Principles

1. **One category at a time** — Don't overwhelm with all questions at once
2. **Follow up** — If an answer is vague, ask for specifics
3. **Push for non-goals** — Explicit exclusions prevent scope creep
4. **Synthesize, don't transcribe** — The output is a structured document, not a chat log
5. **Respect the user's time** — Skip categories they've already answered; don't re-ask

## Define Interview (comprehensive)

### Category 1: Problem
- What problem are we solving?
- Who experiences this problem?
- How do they cope with it today?
- What's the cost of not solving it?

### Category 2: Scope
- What's included in this feature?
- What's explicitly NOT included? (Push hard here)
- Are there related features that should be separate work?
- What's the minimum viable version?

### Category 3: Success
- How will we know this feature is working?
- What's the measurable signal?
- What does "done" look like to the user?
- Is there a quantitative target (latency, accuracy, throughput)?

### Category 4: Constraints
- Technical constraints (language, framework, platform)?
- Time constraints?
- Resource constraints?
- Compatibility requirements (APIs, data formats, existing systems)?

### Category 5: Risks
- What could go wrong?
- What's most uncertain?
- What's the worst-case scenario?
- Are there external dependencies we don't control?

## Spec Interview (lighter)

The spec interview is focused and targeted. Only ask about:
- Edge cases the spec doesn't cover
- State transitions that might be missing
- Failure scenarios and recovery
- Security boundaries and trust model
- Performance expectations for specific operations

Don't re-interview about problem/scope/success — those are settled in Define.
