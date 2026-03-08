# Review: Post-build Verification

After all builders complete, verify the implementation before archiving.

## Verification Steps

### 1. OpenSpec Verify

Run `/opsx:verify` to check:
- **Completeness**: All tasks checked, all requirements have corresponding code
- **Correctness**: Implementation matches spec intent, edge cases handled
- **Coherence**: Design decisions reflected in code structure

### 2. Acceptance Test Integrity

```bash
bun test test/acceptance/
```

All acceptance tests must be GREEN.

Check for assertion tampering:
```bash
git diff <pre-build-commit>..HEAD -- test/acceptance/
```

Only import paths and config should differ. Any assertion removal or relaxation must be explicitly justified.

### 3. Hardening Seed Audit

For each hardening seed planted in the specs:

**Security seeds:**
- Were they addressed?
- Any remaining attack vectors?

**Performance seeds:**
- Were budgets met?
- Evidence (benchmarks, measurements)?

**Observability seeds:**
- Is logging/tracing in place?
- Are metrics exposed?

### 4. Summary

Produce a review summary:
- Spec compliance (requirement-by-requirement)
- ETR status (claim-by-claim, all GREEN)
- Hardening seed audit results
- How to verify independently (`bun test`, specific commands)

### 5. Archive

If verification passes:
```bash
openspec archive <NAME> --yes
```

If issues found: fix and re-verify before archiving.
