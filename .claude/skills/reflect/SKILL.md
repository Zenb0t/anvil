---
name: reflect
description: Improve the agent's feedback loop by analyzing a conversation to extract learnings from user corrections, steering, and domain knowledge. Produces persistent artifacts (documentation entries, cursor rules, ESLint rules, or skills) so future agent sessions avoid the same mistakes. Use when the user asks to reflect, do a retrospective, capture learnings, or says "what did you learn?"
---

# Conversation Reflection

Close the agent's feedback loop: when a user corrects, steers, or teaches the agent during a task, that knowledge is lost once the conversation ends. This skill captures those learnings as persistent artifacts so future agent sessions start with the right context.

## When to Use

- User explicitly asks to reflect, retrospect, or capture learnings
- End-of-session wrap-up to codify what the agent learned
- After a correction-heavy exchange where the user had to steer the agent repeatedly

## Procedure

### Step 1: Scan the Conversation

Review the full conversation and identify **learning moments** — points where:

- **Correction:** User fixed an agent mistake (wrong file, wrong pattern, wrong API)
- **Steering:** User redirected the approach ("don't do X, do Y instead")
- **Preference:** User expressed a preference for how things should be done
- **Domain knowledge:** User provided codebase or business context the agent lacked
- **Unblocking:** User gave information that unblocked progress after the agent was stuck
- **Tool/workflow:** User showed a better way to use tools or run commands

For each learning moment, capture:

1. **What happened** — one-sentence summary
2. **What the agent did wrong** (or didn't know)
3. **What the correct approach is**
4. **Why it matters** — what breaks or degrades without this knowledge

### Step 2: Filter and Deduplicate

Not every correction is worth persisting. Discard learnings that are:

- One-off or context-specific (won't recur)
- Already documented in existing project docs (agent just missed it)
- Trivial (typo-level fixes)

If the agent missed existing documentation, note that as a **discovery problem** — the learning may be "this info exists but is hard to find" rather than "this info is missing."

### Step 3: Classify Each Learning

For each surviving learning, determine the best artifact type:

| Learning Type | Artifact | Location |
|---|---|---|
| Codebase convention or pattern | Documentation entry | Nearest relevant doc (e.g., AGENTS.md, CONTRIBUTING.md) |
| Build/tooling/command knowledge | Documentation entry or cursor rule | Root docs or `.cursor/rules/` |
| Multi-step workflow or procedure | Skill (SKILL.md) | `.cursor/skills/` |
| Recurring preference or style | Cursor rule | `.cursor/rules/` |
| Enforceable code pattern | ESLint rule | Custom ESLint plugin (use create-eslint-rule skill) |

**When to choose an ESLint rule:** If the learning is about a code pattern that should be **enforced at build time** (e.g., "always use logger instead of console"), prefer an ESLint rule. ESLint rules are better than documentation when violations are easy to detect statically and the cost of forgetting is high.

**Routing guide:** Map each learning to the narrowest applicable scope in the project's documentation hierarchy. Check the project for existing documentation locations (AGENTS.md, CONTRIBUTING.md, README, etc.).

### Step 4: Propose Changes

Present findings to the user in this format:

```
## Reflection Summary

**Learnings found:** N (M worth persisting)

### Learning 1: [short title]

**What happened:** [one sentence]
**Root cause:** [what the agent lacked]
**Correct approach:** [what to do next time]

**Proposed artifact:** [documentation entry | cursor rule | skill | ESLint rule]
**Target file:** [exact path]
**Proposed content:**

> [the actual text/section to add or modify]

---

### Learning 2: ...
```

If a learning updates an **existing** section, show the current content and the proposed replacement.

### Step 5: Apply After Approval

- Wait for user approval on each proposed change
- User may approve all, some, or modify proposals
- Apply approved changes using the appropriate tool
- For documentation: use StrReplace to add sections or update existing ones
- For cursor rules: create `.cursor/rules/rule-name.mdc` files
- For skills: follow the create-skill workflow

## Quality Checks

Before proposing, verify each learning against:

- [ ] **Recurring:** Will this come up again in future conversations?
- [ ] **Actionable:** Does it give the agent clear guidance on what to do?
- [ ] **Scoped:** Is it placed in the narrowest applicable scope?
- [ ] **Non-redundant:** Does it add information not already documented?
- [ ] **Concise:** Is the proposed text as short as possible while remaining clear?

## Edge Cases

**No learnings found:** Tell the user — "No corrections or new knowledge emerged from this conversation that aren't already documented."

**Discovery problem (info exists but was missed):** Instead of duplicating content, consider:

- Adding cross-references in documentation
- Adding trigger terms to existing skill descriptions
- Creating a cursor rule that points to existing docs

**Conflicting with existing docs:** Flag the conflict. The user decides which is correct.