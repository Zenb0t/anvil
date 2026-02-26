# EDSC Gap Analysis

## Addressed Gaps

- Every feature template onboarding section (`## Phase.yaml Summary`) now includes explicit placeholders for:
- `Current blockers: {{CURRENT_BLOCKERS}}`
- `Decisions needed: {{DECISIONS_NEEDED}}`
- The root feature template and all phase templates (`00` through `07`) use the same placeholder pattern for consistent resume behavior.
- `AGENTS.md` and `docs/index.md` now link this document so agents can find the gap analysis quickly.

## Remaining Ambiguous Items

- Placeholder structure is not yet standardized (`single-line text` vs `list with owner/date`).
- Decision lifecycle is unclear (`needed`, `made`, `superseded`) and not encoded in a shared schema.
- It is not explicit whether canonical status should live first in `phase.yaml`, phase README, or both.

## Recommendations

1. Define `phase.yaml` schema fields for blockers and decisions (status, owner, target date, source link).
2. Add one short formatting rule in EDSC docs for how placeholders should be filled during active work.
3. Add a lightweight lint/check step to flag unresolved placeholder tokens in active feature workspaces.
