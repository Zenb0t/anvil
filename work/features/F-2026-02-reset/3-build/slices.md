# Implementation Slices: F-2026-02-reset

Single slice — `cmd_reset` is one function added to `bin/anvil`.

## Slice 1: cmd_reset implementation
**ETR Claims:** BR-1, BR-2, BR-3, BR-4, BR-5, BR-6, BR-7, BR-8, IT-1, IT-2, IT-3, INV-1, INV-2, INV-3, INV-4, ERR-1, ERR-2, ERR-3, HS-1
**Status:** complete

Implement `cmd_reset()` in `bin/anvil`:
- Parse args: `<id>` required, `<phase>` optional
- Security: reject `..` in feature ID
- Validate feature dir exists
- Validate phase name if provided
- Walk gate files, derive status (PASS/PENDING/FAIL/missing→pending)
- Compute phase pointer (lowest non-PASS)
- Compute git anchors for PASS gates (reuse existing anchor logic)
- For single-phase reset: only reset specified phase + all downstream (cascade)
- Generate new state.yaml
- Diff old vs new, print changes to stderr
- If no changes, print "state.yaml is already consistent" to stderr
- Use `return` not `exit`
- Add `reset` to the case dispatch in main
- Update usage text

Evidence:
- `bash work/features/F-2026-02-reset/2-verify/evidence/run-tests.sh` -> `Results: 60 passed, 0 failed, 60 total`
