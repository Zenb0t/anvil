# Implementation Slices: F-2026-02-dashboard

## Slice 1: Implement `cmd_list` in `bin/anvil`
**ETR Claims:** ETR-1, ETR-2, ETR-3, ETR-4, ETR-5, ETR-6, ETR-7
**Status:** complete

Add `cmd_list` function to `bin/anvil` that:
- Scans `$FEATURES_DIR` for directories containing `state.yaml`
- For each, reads the current phase and runs lightweight gate validation
- Outputs one line per feature: `<id> <effective-phase> <gate-status>`
- Warns on stderr for directories missing `state.yaml`
- Handles empty/missing features dir gracefully
- Is read-only (no calls to `update_state`)
- Register `list` in the `case` dispatch at the bottom of the script
