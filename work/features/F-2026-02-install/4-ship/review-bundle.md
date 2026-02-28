# Review Bundle: F-2026-02-install

## What Changed
- Added root `Makefile` with `install` and `uninstall` targets.
- `install` creates/updates symlink `~/.local/bin/anvil -> <repo>/bin/anvil`.
- `uninstall` removes `~/.local/bin/anvil` if present (idempotent no-op otherwise).
- Updated `README.md` with install/uninstall usage docs and repository layout entry.

## Spec Compliance
- BR-1..BR-7: covered by acceptance script and implementation (`Makefile`, `README.md`).
- IT-1..IT-3: install/uninstall scope constrained to target path, no directory deletion, symlink semantics used.
- INV-1..INV-3: install target validity, command idempotency, and source executable preservation validated.

## ETR Status
- Evidence command:
  - `bash work/features/F-2026-02-install/2-verify/evidence/run-tests.sh`
- Result:
  - `Results: 14 passed, 0 failed, 14 total`
- Environment note:
  - This Windows machine has no system `make` binary, so tests were executed with a temporary PATH-injected `make` shim that runs the same install/uninstall recipe steps.

## Hardening Seeds Audit
- Security:
  - All target paths are quoted.
  - Uninstall removes only `~/.local/bin/anvil`.
- Performance:
  - Operations are constant-time filesystem actions (`mkdir`, `ln`, `rm`).
- Observability:
  - Targets print explicit action messages (installed/removed/no install found).

## How to Verify
1. Ensure `make` is available in PATH.
2. Run:
   - `make install`
   - `ls -l ~/.local/bin/anvil`
   - `make uninstall`
3. Run acceptance script:
   - `bash work/features/F-2026-02-install/2-verify/evidence/run-tests.sh`
