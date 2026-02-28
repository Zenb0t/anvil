# Implementation Slices: F-2026-02-lint

## Slice 1: Implement `cmd_lint` in `bin/anvil`
**ETR Claims:** BR-1 through BR-16, IT-1, IT-2, INV-1 through INV-5, ERR-1 through ERR-3, HS-1
**Status:** complete

Add `cmd_lint` function to `bin/anvil` that:
- Accepts optional `<id>` argument (single feature) or no args (all features)
- For each feature, validates gate format (GATE-STATUS, GATE-RATIONALE, GATE-CHECKLIST, GATE-FRONTMATTER, GATE-FALSIFICATION), structure (TMPL-PHASE, TMPL-STATE), and cross-references (XREF-NEEDS, XREF-PRODUCES)
- Outputs one line per issue: `<feature-id> <phase> <rule-id> <message>`
- Exits 0 if clean, 1 if issues found
- Is read-only (no calls to `update_state`, no file writes)
- Warns on stderr for features missing `state.yaml`
- Rejects directory traversal in feature ID argument
- Handles missing features dir gracefully (exit 0)
- Register `lint` in the CLI dispatch and usage text

All 39 acceptance tests in `2-verify/evidence/run-tests.sh` must go GREEN.
