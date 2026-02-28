# Implementation Slices: F-2026-02-install

## Slice 1: Makefile install/uninstall + docs
**ETR Claims:** BR-1, BR-2, BR-3, BR-4, BR-5, BR-6, BR-7, IT-1, IT-2, IT-3, INV-1, INV-2, INV-3, ERR-1, ERR-2, ERR-3
**Status:** complete

Implementation plan:
- Add root `Makefile` with `install` and `uninstall` targets using symlink semantics.
- Update `README.md` with install/uninstall usage.
- Run `bash work/features/F-2026-02-install/2-verify/evidence/run-tests.sh` and drive to GREEN.

Evidence:
- `bash work/features/F-2026-02-install/2-verify/evidence/run-tests.sh` -> `Results: 14 passed, 0 failed, 14 total` (executed with temporary PATH-injected `make` shim in this Windows environment where `make` binary is unavailable).
