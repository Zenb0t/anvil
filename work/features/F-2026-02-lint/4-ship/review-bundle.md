# Review Bundle: F-2026-02-lint

## What Changed

```
bin/anvil | 230 insertions (+), 1 deletion (-)
```

Single file modified: `bin/anvil`. Added `cmd_lint` function (~200 lines) implementing 9 lint rules across 3 categories (GATE, TMPL, XREF). Also added `lint` to CLI dispatch and usage text. One infrastructure change: `FEATURES_DIR` now supports env override (`${FEATURES_DIR:-default}`).

New files (feature workspace):
- `work/features/F-2026-02-lint/` — full phase artifacts

## Spec Compliance

| Invariant | Status | Evidence |
|-----------|--------|----------|
| INV-1: Line count = issue count | PASS | Tests INV-1, INV-5 confirm no blank lines, all lines are issues |
| INV-2: Exit 0 iff no stdout | PASS | Tests INV-2a (clean=0), INV-2b (broken=1) |
| INV-3: No warnings on stdout | PASS | Tests INV-3, BR-6b confirm warnings go to stderr only |
| INV-4: Scaffolded feature = zero issues | PASS | Tests INV-4a, INV-4b scaffold with `anvil init` then lint |
| INV-5: Issue format matches `(GATE\|TMPL\|XREF)-[A-Z]+` | PASS | Tests INV-5a (>=4 tokens), INV-5b (rule-id pattern) |

## ETR Status

| Claims | Tests | Status |
|--------|-------|--------|
| BR-1, BR-2 (command recognition) | 2 tests | PASS |
| BR-3 (exit codes) | 2 tests | PASS |
| BR-4 (output format) | 3 tests | PASS |
| BR-5 (silent clean) | 1 test | PASS |
| BR-6 (stderr warnings) | 2 tests | PASS |
| BR-7..BR-11 (GATE-* rules) | 5 tests | PASS |
| BR-12, BR-13 (TMPL-* rules) | 2 tests | PASS |
| BR-14, BR-15 (XREF-* rules) | 2 tests | PASS |
| BR-16 (no overlap with check) | 1 test | PASS |
| IT-1, IT-2 (read-only) | 3 tests | PASS |
| INV-1..INV-5 (invariants) | 7 tests | PASS |
| ERR-1..ERR-3 (error handling) | 4 tests | PASS |
| HS-1 (traversal prevention) | 1 test | PASS |
| **Total** | **39 tests** | **39 PASS** |

No acceptance test assertions were modified. Tests remain in `2-verify/evidence/run-tests.sh` as authored by the Architect subagent.

## Hardening Seeds Audit

### HS-1 (Security): Directory traversal prevention
**Status:** Addressed. `cmd_lint` rejects feature IDs containing `..` with an error message. Test HS-1 confirms `anvil lint ../../etc/passwd` does not process the path.

### HP-1 (Performance): <2s per feature
**Status:** Acknowledged. Lint does no git operations (unlike `check`), only file reads and greps. On Windows/Git Bash the test suite takes longer due to shell fork overhead, but individual lint invocations are fast. Acceptable for v1.

### HO-1 (Observability): Self-contained issue lines
**Status:** Addressed. Each issue line contains feature ID, phase, rule ID, and message. Stderr warnings for skipped features. Tests confirm separation.

## Role Separation Audit

This feature was built with proper role enforcement:
- **Define, Spec**: Orchestrator (Architect) — direct conversation
- **Verify**: Architect subagent (fresh context, agent ID `a7c4477f0c86c2f82`)
- **Build**: Builder subagent in worktree (isolated copy, worktree `agent-afe30632`)
- **Ship**: Orchestrator (Architect) — direct

No role violations detected. Builder only modified `bin/anvil`.

## How to Verify

```sh
git checkout feat/anvil-lint

# Run all 39 acceptance tests
bash work/features/F-2026-02-lint/2-verify/evidence/run-tests.sh

# Manual: lint a clean feature
bash bin/anvil lint F-2026-02-lint

# Manual: lint all features
bash bin/anvil lint

# Verify read-only
bash bin/anvil lint >/dev/null 2>&1
git diff --stat  # should show no new changes from lint
```
