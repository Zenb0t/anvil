# tests

Would a regression in the changed behaviour be caught? Map each behaviour change in the diff to a test in `src/` that fails without it.

Findings:
- Behaviour change with no test → `should-fix`; `blocker` when blast radius is external.
- Test that cannot fail: asserts nothing meaningful, mocks the unit under test, or only checks it ran.
- Edge cases named by the ticket or by the correctness of the code (empty, boundary, error path) left untested.
- Tests changed to match new behaviour without the ticket asking for that behaviour.

Cite the behaviour and the test file (or its absence).
