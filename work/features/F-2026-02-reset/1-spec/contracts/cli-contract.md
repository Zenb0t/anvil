# CLI Contract: anvil reset

## Interface

```
anvil reset <feature-id>            # Full rebuild
anvil reset <feature-id> <phase>    # Single phase + downstream cascade
```

## Inputs

| Argument | Required | Valid values |
|----------|----------|-------------|
| feature-id | Yes | Any string matching an existing directory under FEATURES_DIR |
| phase | No | `0-define`, `1-spec`, `2-verify`, `3-build`, `4-ship` |

## Outputs

| Channel | Content |
|---------|---------|
| stdout | Nothing (silent) |
| stderr | Before→after changes, or "state.yaml is already consistent" |

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Reset successful or already consistent |
| 1 | Feature not found, invalid phase, or invalid arguments |

## Generated state.yaml format

```yaml
feature: <feature-id>
phase: <lowest-non-pass-phase>
gates:
  0-define: { status: <pass|pending|fail>[, anchor: <sha>] }
  1-spec: { status: <pass|pending|fail>[, anchor: <sha>] }
  2-verify: { status: <pass|pending|fail>[, anchor: <sha>] }
  3-build: { status: <pass|pending|fail>[, anchor: <sha>] }
  4-ship: { status: <pass|pending|fail>[, anchor: <sha>] }
```

Anchors are only present for `status: pass` gates.

## Function signature

```sh
cmd_reset()  # uses return, not exit
```
