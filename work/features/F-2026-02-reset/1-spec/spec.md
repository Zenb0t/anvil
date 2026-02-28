# Specification: F-2026-02-reset

## Behavioral Requirements

### BR-1: `anvil reset <id>` rebuilds state.yaml from gate files
Walk all 5 phases, read each `gate.md`'s `Status:` line, and regenerate `state.yaml` with derived status, phase pointer, and git anchors.

### BR-2: `anvil reset <id> <phase>` resets a single phase with downstream cascade
Reset the specified phase entry in `state.yaml`. All downstream phases are also reset (cascade). Phase pointer is recomputed.

### BR-3: Status derivation from gate files
For each phase, read `Status:` from `gate.md`:
- `PASS` → status: pass, anchor: current git HEAD
- `PENDING` → status: pending, no anchor
- `FAIL` → status: fail, no anchor
- Missing `Status:` line or missing `gate.md` → status: pending

### BR-4: Phase pointer derivation
`phase:` field = lowest phase that is not PASS. If all phases are PASS, phase = `4-ship`.

### BR-5: Anchor recomputation for PASS gates
For PASS gates, compute git anchor from `needs:` files' current HEAD SHA. Use the same anchor mechanism as `anvil advance`.

### BR-6: Print changes on stderr
Print before→after diff of `state.yaml` on stderr. If no changes, print "state.yaml is already consistent" on stderr.

### BR-7: Create state.yaml if missing
If `state.yaml` does not exist but the feature directory does, generate it from scratch.

### BR-8: Exit codes
- Exit 0: reset successful (changes applied or already consistent)
- Exit 1: feature not found or invalid arguments

## State Transitions

### Valid
- Corrupted state.yaml → correct state.yaml (via full reset)
- Missing state.yaml → newly created state.yaml
- Consistent state.yaml → no change (idempotent)
- Single phase reset → cascaded downstream reset

### Illegal
- IT-1: Reset must NOT modify gate.md files (read-only)
- IT-2: Reset must NOT modify any file other than state.yaml
- IT-3: Reset must NOT create phase directories or gate files

## Invariants

- INV-1: After `anvil reset <id>`, `anvil check <id>` must not report structural errors
- INV-2: Running reset twice produces the same state.yaml (idempotent)
- INV-3: Phase pointer always equals the lowest non-PASS phase
- INV-4: PASS gates always have an anchor; non-PASS gates never have an anchor

## Error Handling

- ERR-1: Feature directory does not exist → error on stderr, exit 1
- ERR-2: Invalid phase name (not in 0-define..4-ship) → error on stderr, exit 1
- ERR-3: Feature exists but has no phase directories → generate minimal state.yaml with all PENDING

## Hardening Seeds

### Security
- Directory traversal: reject feature IDs containing `..`
- No shell injection via feature ID (same guard as other commands)

### Performance
- Single pass through gate files — no repeated parsing
- Reuse `validate_gate` where it makes sense, but avoid full validation overhead (we only need status, not full check)

### Observability
- Stderr output shows exactly what changed for agent debugging
- Silent on stdout (consistent with lint's pattern)
