# Evidence Manifest: quiet-flag

| ETR Claim | Type | Test Location | Graduated in Slice |
|-----------|------|---------------|--------------------|
| ETR-1 | functional | test/etr-1-quiet-suppresses-stdout.test.ts | slice-1 |
| ETR-2 | functional | test/etr-2-exit-code-signal.test.ts | slice-1 |
| ETR-3 | functional | test/etr-3-mutual-exclusion.test.ts | slice-1 |
| ETR-4 | cross-cutting | work/features/quiet-flag/2-verify/evidence/etr-4-unchanged-without-quiet.test.ts | post-slices |
| ETR-5 | functional | test/etr-5-unsupported-commands.test.ts | slice-1 |
| ETR-6 | functional | test/etr-6-q-alias.test.ts | slice-1 |
| ETR-7 | cross-cutting | work/features/quiet-flag/2-verify/evidence/etr-7-state-invariant.test.ts | post-slices |
| ETR-8 | functional | test/etr-8-hook-quiet-usage.test.ts | slice-2 |
| ETR-9 | cross-cutting | test/etr-9-security-q-not-feature-id.test.ts | slice-1 |
