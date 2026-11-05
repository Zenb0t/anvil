# guard-clauses

_Source: Beck, "Guard Clauses"._

**Problem:** the main path of a function is buried under nested conditionals; the reader holds every enclosing condition in mind to reach it.
**Move:** return early for the preconditions and edge cases, leaving the main path flat at the bottom.
**Signals:** nesting depth ≥ 3; an `if` with a long body and a short `else` that returns or throws; several levels of `if` around a function's core.
**Skip when:** an early return would skip cleanup the nested form guarantees (resource release, `finally`, ordered async steps).
**Improves:** analysability (nesting depth; cyclomatic complexity usually stays the same, so cite depth).
**Typical size:** small.
