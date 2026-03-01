# Contract: Makefile Install Targets

## Interface

```sh
make install
make uninstall
```

## Inputs

- `HOME` (optional override): base for installation target. Defaults to shell `HOME`.
- Repository root current directory containing `bin/anvil`.

## Outputs

- `install`:
  - Ensures `$(HOME)/.local/bin` exists.
  - Creates/updates symlink `$(HOME)/.local/bin/anvil -> <repo>/bin/anvil`.
- `uninstall`:
  - Removes `$(HOME)/.local/bin/anvil` only if it is a managed symlink to `<repo>/bin/anvil`.
  - Refuses removal for non-managed targets.

## Exit Codes

- `0`: success (including idempotent no-op cases).
- `1`: uninstall refused because target is non-managed.
- Non-zero (>1): unexpected filesystem/system failure.

## Safety Constraints

- Do not remove directories.
- Do not write outside `$(HOME)/.local/bin/anvil` for install artifact operations.
- Use symlink, not copy.
