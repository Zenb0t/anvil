# Specification: F-2026-02-dashboard

## Behavioral Requirements

**BR-1**: When invoked as `anvil list`, the command scans `$FEATURES_DIR` and outputs one line per feature directory found.

**BR-2**: Each output line has the format: `<feature-id> <effective-phase> <gate-status>` separated by single spaces.

**BR-3**: `<effective-phase>` is the lowest phase whose gate is not PASS (same logic as `cmd_status`).

**BR-4**: `<gate-status>` is the status of the effective phase's gate: one of `PENDING`, `PASS`, `FAIL`, `STALE`, `DIRTY`, `MISSING`.

**BR-5**: If all phases are PASS/CLEAN, effective-phase is `4-ship` and gate-status is `CLEAN`.

**BR-6**: Features are listed in lexicographic order (default `ls` / glob order).

**BR-7**: When `$FEATURES_DIR` is empty or does not exist, the command produces no stdout output and exits 0.

**BR-8**: The command takes no arguments. `anvil list` is the complete invocation.

## State Transitions

This command is read-only. It does not modify `state.yaml` or any gate files.

### Valid transitions
- None. `list` is a pure query.

### Illegal transitions
- **IT-1**: `anvil list` must NOT write to any file.
- **IT-2**: `anvil list` must NOT call `update_state`.
- **IT-3**: `anvil list` must NOT modify `state.yaml`.

## Invariants

**INV-1**: Output line count equals the number of directories in `$FEATURES_DIR` that contain a `state.yaml` file. Directories without `state.yaml` are skipped (with stderr warning).

**INV-2**: Exit code is always 0, even if some features are malformed (warnings go to stderr).

**INV-3**: No stdout output is produced for warnings or errors — only feature lines.

**INV-4**: Output for a given feature is consistent with what `anvil status <id>` reports for that feature's effective phase.

## Error Handling

**ERR-1**: Feature directory exists but has no `state.yaml` → skip, print warning to stderr: `warning: <id> has no state.yaml, skipping`.

**ERR-2**: `state.yaml` exists but current phase's `gate.md` is missing → report phase as effective, status as `MISSING`.

**ERR-3**: `$FEATURES_DIR` does not exist → exit 0, no output.

## Hardening Seeds

### Security
- **HS-1**: No user-supplied input is used in shell expansion (feature IDs come from directory names, not arguments). Verify no injection risk from directory names containing special characters.

### Performance
- **HP-1**: For repositories with many features (>50), `list` should complete in under 2 seconds. Current approach (one `validate_gate` call per feature) may be too slow — consider lightweight parsing (read `state.yaml` phase + grep gate status) instead of full gate validation.

### Observability
- **HO-1**: Stderr warnings for skipped features provide observability. No additional logging needed for a CLI tool.
