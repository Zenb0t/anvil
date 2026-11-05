# correctness

Will the changed code do the wrong thing for some input or state? Trace the changed paths through their callers in `src/`.

Look for: off-by-one and boundary values; null/undefined/empty; wrong condition or inverted branch; ordering and races; stale state or cache; changed function contracts whose callers were not updated; resource leaks; type coercion; locale, timezone, encoding; partial failure mid-sequence.

`blocker` when the failure is reachable in normal use. `should-fix` when it needs an unusual but valid input. Style is not correctness.
