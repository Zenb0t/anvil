# Contract: CLI --quiet Flag Interface

## Flag Parsing

```
--quiet | -q    Suppress all stdout. Exit code is the only signal.
```

Supported commands: `check`, `status`, `lint`.

## Mutual Exclusion

```
if (quiet && outputMode !== null) → fail("--quiet and --output are mutually exclusive")
```

## Exit Code Contract

| Command | Exit 0 | Exit 1 |
|---------|--------|--------|
| `check <id> -q` | `allPass === true` | `allPass === false` |
| `status <id> -q` | Effective phase status is `CLEAN` | Any other status |
| `lint -q` | Zero lint issues | One or more lint issues |

## Hook Contract (run_anvil_lint_async.ts)

```
1. Run: anvil lint --quiet
2. If exit 0 → return (silent)
3. If exit non-zero → run: anvil lint --output json
4. Parse JSON, format excerpt, emit systemMessage
```
