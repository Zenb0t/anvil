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
  - Removes `$(HOME)/.local/bin/anvil` if present.

## Exit Codes

- `0`: success (including idempotent no-op cases).
- Non-zero: unexpected filesystem/system failure.

## Safety Constraints

- Do not remove directories.
- Do not write outside `$(HOME)/.local/bin/anvil` for install artifact operations.
- Use symlink, not copy.
