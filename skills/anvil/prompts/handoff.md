# Review Handoff Protocol

Protocol for handing off completed features to external reviewers (Codex, humans, other agents).

## Generating the Review Bundle

The review bundle (`4-ship/review-bundle.md`) is the single artifact a reviewer needs. It must be self-contained.

### Required Sections

1. **What Changed** — `git diff --stat` summary from feature branch vs. base
2. **Spec Compliance** — For each invariant in `1-spec/spec.md`, state whether it's satisfied and point to evidence
3. **ETR Status** — For each ETR claim, show:
   - Claim text
   - Test location (from `evidence/manifest.md`)
   - Pass/fail status
   - Any assertion changes with justification
4. **Hardening Seeds Audit** — For each seed in `1-spec/spec.md`:
   - What was done
   - What evidence exists
   - Any remaining concerns
5. **How to Verify** — Step-by-step commands to independently verify:
   ```
   git checkout <branch>
   <install deps>
   <run all tests>
   <any manual verification steps>
   ```

## Handoff Process

1. Commit the review bundle to `4-ship/review-bundle.md`
2. Provide the bundle to the reviewer (PR comment, file link, etc.)
3. Reviewer writes findings to `4-ship/review.md`
4. Orchestrator incorporates feedback:
   - Bug fixes → back to Build (re-check gates)
   - Spec issues → back to Spec (cascade)
   - Approved → complete Ship gate

## Reviewer Types

### Human Reviewer
- Share the review bundle and a link to the PR
- Wait for written feedback in `4-ship/review.md`

### Codex Agent
- Provide the review bundle as context
- Ask Codex to run the verification commands
- Capture findings in `4-ship/review.md`

### No External Review (waiver)
- Document justification in the Ship gate Rationale
- "External review waived: [reason]"
- The Falsification section must be extra thorough to compensate
