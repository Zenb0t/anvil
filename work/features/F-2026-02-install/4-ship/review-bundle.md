# Review Bundle: F-2026-02-install

## What Changed
- Added root `Makefile` with `install` and `uninstall` targets.
- `install` creates/updates symlink `~/.local/bin/anvil -> <repo>/bin/anvil`.
- `uninstall` removes only managed symlink installs and refuses non-managed targets.
- Updated `README.md` with install/uninstall usage docs and repository layout entry.
- Added `make` to README prerequisites.

## Spec Compliance
- BR-1..BR-7: covered by acceptance script and implementation (`Makefile`, `README.md`).
- IT-1..IT-3: install/uninstall scope constrained to target path, no directory deletion, symlink semantics used.
- INV-1..INV-3: install target validity, command idempotency, and source executable preservation validated.
- ERR-1..ERR-4: covered, including explicit refusal to remove non-managed targets.

## ETR Status
- Evidence command:
  - `bash work/features/F-2026-02-install/2-verify/evidence/run-tests.sh`
- Result:
  - All acceptance assertions pass (GREEN), including non-managed symlink refusal coverage.

## Hardening Seeds Audit
- Security:
  - All target paths are quoted.
  - Uninstall removes only managed `~/.local/bin/anvil` symlink targets and refuses non-managed paths.
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
