# Specification: F-2026-02-install

## Behavioral Requirements
### BR-1: `make install` creates target bin directory
If `~/.local/bin` does not exist, `make install` creates it.

### BR-2: `make install` installs `anvil` as symlink
`~/.local/bin/anvil` is created/updated as a symlink to `<repo>/bin/anvil`.

### BR-3: `make install` is idempotent
Repeated `make install` invocations exit 0 and keep a valid symlink target.

### BR-4: `make uninstall` removes installed entry
`make uninstall` removes `~/.local/bin/anvil` when present.

### BR-5: `make uninstall` is idempotent
Repeated `make uninstall` invocations exit 0 without error.

### BR-6: Preserve executable source
`bin/anvil` remains executable and is not copied/modified by install target.

### BR-7: Documentation includes install/uninstall usage
Repository docs include concise instructions for `make install` and `make uninstall`.

## State Transitions
### Valid
- Not installed -> installed symlink present (`make install`)
- Installed -> still installed (`make install` again)
- Installed -> not installed (`make uninstall`)
- Not installed -> still not installed (`make uninstall` again)

### Illegal
- IT-1: Install must not overwrite unrelated files outside `~/.local/bin/anvil`.
- IT-2: Uninstall must not delete `~/.local/bin` directory.
- IT-3: Install must not copy `bin/anvil` into target (must be symlink).

## Invariants
- INV-1: When installed, `~/.local/bin/anvil` resolves to repository `bin/anvil`.
- INV-2: `make install` and `make uninstall` always return exit code 0 on expected local scenarios.
- INV-3: `bin/anvil` remains source-of-truth executable after install/uninstall runs.

## Error Handling
- ERR-1: Existing regular file at `~/.local/bin/anvil` is replaced predictably by symlink install.
- ERR-2: Missing target on uninstall is treated as no-op success.
- ERR-3: Missing `~/.local/bin` directory on uninstall is treated as no-op success.

## Hardening Seeds
### Security
- Use quoted shell paths in recipes to avoid path splitting/injection.
- Restrict destructive operations to exact target `~/.local/bin/anvil`.

### Performance
- Install/uninstall should be constant-time filesystem ops with no repo scan.

### Observability
- Make targets print succinct success actions (installed path/removed path).
