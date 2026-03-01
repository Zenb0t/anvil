# Specification: quiet-flag

## Behavioral Requirements

### BEH-1: `--quiet` suppresses all stdout
When `--quiet` or `-q` is passed to `check`, `status`, or `lint`, the command MUST write zero bytes to stdout. Stderr is unaffected (errors still appear).

### BEH-2: Exit code is the only signal
With `--quiet`, the exit code conveys the result:
- `0` — success (CLEAN for check/status, no errors for lint)
- `1` — failure (any gate not passing, lint errors found)

Exit code semantics MUST match the non-quiet behavior — `--quiet` only suppresses output, it does not change what counts as success or failure.

### BEH-3: Mutual exclusion with `--output`
If both `--quiet` and `--output` are specified, the CLI MUST exit with code 1 and print an error to stderr: `ERROR: --quiet and --output are mutually exclusive`.

### BEH-4: Commands without `--quiet` are unchanged
When `--quiet` is absent, all existing behavior is preserved identically.

### BEH-5: Hook uses `--quiet`
The `run_anvil_lint_async.ts` hook MUST use `--quiet` instead of `--output json`. On exit code 0, it returns silently (existing behavior). On non-zero exit, it falls back to a second `lint --output json` call to get error details for the system message.

## State Transitions

### Valid
- `anvil check <id>` → `anvil check <id> --quiet` (same validation, no output)
- `anvil lint` → `anvil lint --quiet` (same validation, no output)
- `anvil status <id>` → `anvil status <id> --quiet` (same status evaluation, no output)

### Illegal
- `anvil check <id> --quiet --output json` → ERROR, exit 1
- `anvil check <id> -q --output text` → ERROR, exit 1
- `anvil list --quiet` → ERROR (not a supported command for `--quiet`)
- `anvil init <id> --quiet` → ERROR (not a supported command for `--quiet`)
- `anvil advance <id> --quiet` → ERROR (not a supported command for `--quiet`)
- `anvil reset <id> --quiet` → ERROR (not a supported command for `--quiet`)

## Invariants

- **INV-1:** stdout byte count is exactly 0 when `--quiet` is active and no mutual-exclusion error fires.
- **INV-2:** Exit codes are identical whether `--quiet` is present or not, for the same input state.
- **INV-3:** `--quiet` does not modify `state.yaml` differently than the non-quiet path. The flag is output-only.
- **INV-4:** `-q` is an exact alias for `--quiet` in all contexts.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `--quiet` + `--output` | stderr: error message, exit 1 |
| `--quiet` on unsupported command | stderr: usage error, exit 1 |
| `--quiet` with missing feature ID | stderr: usage error (existing), exit 1 |
| `--quiet` with invalid feature ID | stderr: validation error (existing), exit 1 |

## Hardening Seeds

### Security
- `--quiet` is read-only behavior; no new input vectors. Validate that `-q` cannot be injected as a feature ID (existing `assertValidFeatureId` guards this).

### Performance
- `--quiet` should be marginally faster than `--output json` since it skips serialization. No latency budget needed — CLI is already sub-second.

### Observability
- The hook's fallback (`--quiet` first, then `--output json` on failure) adds one extra process spawn on lint failure. This is acceptable since failures are infrequent and the hook is async.
