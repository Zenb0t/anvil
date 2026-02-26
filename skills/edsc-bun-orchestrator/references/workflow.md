# EDSC Workflow Checklist

## Phase Execution Loop

1. `status <feature-id>`
2. `check <feature-id>`
3. Edit active phase docs/gate artifacts
4. `check <feature-id>`
5. `advance <feature-id> --to <next-phase>`

## Gate Completion Criteria

- Active phase gate has `Result: PASS`.
- Required files listed in gate frontmatter exist.
- Dependencies listed in `depends_on` exist.
- No stale/fail statuses remain for active path.

## Closeout

- For Phase 7, update `process-deltas.yaml`.
- Run `apply-deltas <feature-id>`.
- Run `check --all` before final handoff.
