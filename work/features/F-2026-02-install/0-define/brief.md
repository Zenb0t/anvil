# Brief: F-2026-02-install

## Problem
`anvil` currently requires users/agents to invoke `bash bin/anvil` from the repository root, which is awkward for day-to-day usage and scripts.
We need a simple, repo-local install mechanism that exposes `anvil` on PATH via `~/.local/bin/anvil`.

## Scope
### In Scope
- Add a root `Makefile` with:
  - `make install`: create/update a symlink from `bin/anvil` to `~/.local/bin/anvil`.
  - `make uninstall`: remove `~/.local/bin/anvil` if present.
- Ensure behavior is idempotent (`install` and `uninstall` can be run repeatedly).
- Document install/uninstall usage in repository docs.

### Non-Goals
- No package manager integration (brew/apt/choco/etc.).
- No system-wide installation (`/usr/local/bin`).
- No binary packaging or release automation.

## Success Criteria
- `make install` exits 0 and results in `~/.local/bin/anvil` existing as a symlink to repo `bin/anvil`.
- Running `make install` twice remains successful and keeps correct target.
- `make uninstall` exits 0 and removes the symlink.
- Running `make uninstall` twice remains successful.

## Constraints
- Keep solution POSIX-shell compatible and minimal dependency.
- Preserve current CLI behavior (`bin/anvil` remains source of truth).
- Must work in common Unix-like shells and Git Bash contexts where `~/.local/bin` is used.

## Risks
- User PATH may not include `~/.local/bin`; install succeeds but command may still not resolve.
- On platforms with restricted symlink permissions, `ln -s` may fail.
- If a real file already exists at target path, install semantics must remain safe and predictable.
