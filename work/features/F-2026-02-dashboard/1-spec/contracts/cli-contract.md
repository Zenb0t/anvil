# Contract: `anvil list` CLI

## Interface

```
anvil list
```

- Arguments: none
- Stdin: not read
- Exit code: always 0

## Output Contract (stdout)

```
<feature-id> <effective-phase> <gate-status>\n
```

One line per valid feature. Fields separated by single space. No header row. No trailing blank line.

### Field definitions

| Field | Type | Values |
|-------|------|--------|
| `feature-id` | string | Directory name under `work/features/` |
| `effective-phase` | enum | `0-define`, `1-spec`, `2-verify`, `3-build`, `4-ship` |
| `gate-status` | enum | `PENDING`, `PASS`, `FAIL`, `STALE`, `DIRTY`, `MISSING`, `CLEAN` |

### Examples

```
F-2026-02-dashboard 0-define PENDING
F-2026-03-auth 2-verify FAIL
F-2026-01-core 4-ship CLEAN
```

## Stderr

Warnings for malformed features:
```
warning: <feature-id> has no state.yaml, skipping
```

## Preconditions
- Script can resolve `$REPO_ROOT` (same mechanism as other commands)

## Postconditions
- No files modified
- No git state changed
