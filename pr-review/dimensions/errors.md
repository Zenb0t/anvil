# errors

When something fails, does the failure stay visible? Trace every catch, fallback, default value, retry and early return the diff adds or changes.

Findings:
- Error caught and dropped, or logged and execution continues as if it succeeded.
- Fallback or default that hides a failure from the caller or user (empty list for "request failed").
- Broad catch that swallows unrelated errors.
- Retry without bound or backoff; retrying non-idempotent work.
- Error message that loses the cause or leaks internals.
- Partial work left behind on failure (half-written files, rows, state).

Name the failing operation and what the caller sees instead of the error.
