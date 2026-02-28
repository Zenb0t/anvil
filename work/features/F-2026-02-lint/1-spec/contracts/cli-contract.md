# Contract: `anvil lint` CLI

## Interface

```
anvil lint [<feature-id>]
```

- Arguments: optional feature ID (if omitted, lint all features)
- Stdin: not read
- Exit code: 0 = clean, 1 = issues found (or feature not found)

## Output Contract (stdout)

```
<feature-id> <phase> <rule-id> <message>\n
```

One line per issue. No output when clean.

### Field definitions

| Field | Type | Values |
|-------|------|--------|
| `feature-id` | string | Directory name under `work/features/` |
| `phase` | string | `0-define`, `1-spec`, `2-verify`, `3-build`, `4-ship`, or `root` (for feature-level issues) |
| `rule-id` | enum | See rule table below |
| `message` | string | Human/LLM-readable description of the issue |

### Rule IDs

| Rule | Category | Description |
|------|----------|-------------|
| `GATE-STATUS` | Gate format | Invalid Status line |
| `GATE-RATIONALE` | Gate format | Missing/malformed rationale when PASS |
| `GATE-CHECKLIST` | Gate format | Malformed checkbox syntax |
| `GATE-FRONTMATTER` | Gate format | Missing/malformed YAML frontmatter |
| `GATE-FALSIFICATION` | Gate format | Missing Tried/Observed pairs on verify/ship PASS gates |
| `TMPL-PHASE` | Structure | Missing phase directory or gate.md |
| `TMPL-STATE` | Structure | Missing state.yaml |
| `XREF-NEEDS` | Cross-ref | Needs path does not resolve |
| `XREF-PRODUCES` | Cross-ref | Produces path missing when gate PASS |

### Examples

```
F-2026-02-lint 0-define GATE-RATIONALE Rationale is empty but Status is PASS
F-2026-02-lint root TMPL-STATE state.yaml missing
F-2026-02-lint 1-spec XREF-NEEDS needs path ../0-define/brief.md does not exist
```

## Stderr

```
warning: <feature-id> has no state.yaml, skipping
ERROR: Feature <id> not found at <path>
```

## Preconditions
- Script can resolve `$REPO_ROOT`

## Postconditions
- No files modified
- No git state changed
