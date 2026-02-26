# Recovery Guide

## If `check` returns nonzero

1. Read `ERROR` lines first.
2. Fix missing files or gate metadata issues.
3. Re-run `check <feature-id>`.

## If a phase is stale

1. Re-validate dependencies and update phase docs.
2. Ensure gate is `Result: PASS`.
3. Re-run `check` to refresh status.

## If `advance` is blocked

- Run `check` and resolve all failures.
- Ensure current phase status is `pass`.
- Advance only to the immediate next phase.

## If delta apply fails

- Fix invalid targets in `07-release-learning/process-deltas.yaml`.
- Ensure all delta targets exist under `process/edsc/templates/feature/`.
- Re-run `apply-deltas`.
