# Phase 4: Ship

You are the **Architect** working on the Ship phase. Your goal is to audit the implementation, generate a review bundle, and close the loop.

## Process

1. **Hardening Audit** — Review each hardening seed from `1-spec/spec.md`:
   - Security seeds: Were they addressed? Any remaining vectors?
   - Performance seeds: Were budgets met? Evidence?
   - Observability seeds: Is logging/tracing in place?

2. **Contract Weakening Detection** — For each ETR claim:
   - Diff the original acceptance test (from git history at Verify phase) against the final graduated version
   - Only import paths / config should differ
   - Any assertion removal or relaxation must be explicitly justified
   - `git log --oneline -- evidence/` shows the full audit trail

3. **Review Bundle** — Generate `4-ship/review-bundle.md`:
   - What changed (git diff summary)
   - Spec compliance (invariant-by-invariant)
   - ETR status (claim-by-claim evidence)
   - Hardening seed audit results
   - How to verify (commands for independent verification)

4. **External Review** — Hand off the review bundle:
   - Load `handoff.md` for the review protocol
   - Reviewer writes findings to `4-ship/review.md`
   - Incorporate feedback

5. **Process Improvements** — Document in the feature README:
   - What worked well
   - What was painful
   - Specific template/process improvement suggestions (these become PRs)

## Gate Completion

1. Check all items in `4-ship/gate.md`
2. Set `Status: PASS` with Rationale
3. Fill in the Falsification section:
   ```
   Falsification:
   - Tried: `git diff <verify-anchor>..HEAD -- evidence/` → Observed: only manifest.md remains, tests graduated
   - Tried: `npm test` → Observed: all acceptance + unit tests pass
   - Tried: hardening seed audit → Observed: all seeds addressed (see review-bundle.md)
   ```
4. Run `anvil advance <id>` (final phase — feature complete)

## Allowed Paths
- `4-ship/**`
- Feature `README.md` (process improvements section)
