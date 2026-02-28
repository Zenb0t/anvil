# Specification: F-2026-02-lint

## Behavioral Requirements

### Invocation

**BR-1**: `anvil lint <id>` validates a single feature and outputs issues.

**BR-2**: `anvil lint` (no arguments) validates all features under `$FEATURES_DIR`.

**BR-3**: Exit code 0 if no issues found. Exit code 1 if any issues found.

### Output Format

**BR-4**: Each issue is one line: `<feature-id> <phase> <rule-id> <message>`. Fields separated by single space. Rule-id is a short code (e.g., `GATE-FMT`, `TMPL-MISS`).

**BR-5**: No output when all checks pass (clean run = silent).

**BR-6**: Warnings for unreadable/malformed features go to stderr, same as `anvil list`.

### Lint Rules — Gate Format (GATE-*)

**BR-7**: `GATE-STATUS` — Status line must contain exactly one of: `PENDING`, `PASS`, `FAIL`. Anything else is flagged.

**BR-8**: `GATE-RATIONALE` — When Status is PASS, Rationale must have non-empty content on the line(s) after the `Rationale:` header and must contain a file reference (path with `.` extension) or backtick-quoted term.

**BR-9**: `GATE-CHECKLIST` — Every line matching `^- \[` must use exactly `- [ ]` or `- [x]` syntax. Malformed checkboxes are flagged.

**BR-10**: `GATE-FRONTMATTER` — Gate files must have YAML frontmatter delimited by `---` containing `phase`, `needs`, and `produces` fields.

**BR-11**: `GATE-FALSIFICATION` — For `2-verify` and `4-ship` gates with Status PASS, the `Falsification:` section must exist and contain at least one `Tried:` / `Observed:` pair with non-empty content.

### Lint Rules — Structure (TMPL-*)

**BR-12**: `TMPL-PHASE` — Each phase directory (`0-define/` through `4-ship/`) must exist and contain a `gate.md`.

**BR-13**: `TMPL-STATE` — `state.yaml` must exist at the feature root.

### Lint Rules — Cross-Reference (XREF-*)

**BR-14**: `XREF-NEEDS` — Each path in the `needs` frontmatter array must resolve to an existing file or directory relative to the phase directory.

**BR-15**: `XREF-PRODUCES` — Each path in the `produces` frontmatter array, when the gate is PASS, must resolve to an existing file or directory in the phase directory.

### No Overlap with `check`

**BR-16**: Lint does NOT validate: checklist completion vs Status consistency, staleness, dirty state, or anchor validity. Those belong to `anvil check`.

## State Transitions

This command is read-only. It does not modify any files.

### Illegal transitions
- **IT-1**: `anvil lint` must NOT write to any file.
- **IT-2**: `anvil lint` must NOT call `update_state`.

## Invariants

**INV-1**: Output line count equals the total number of issues found.

**INV-2**: Exit code is 0 if and only if stdout line count is 0.

**INV-3**: No stdout output for warnings/errors — only issue lines. Warnings go to stderr.

**INV-4**: Linting a freshly scaffolded feature (`anvil init` then `anvil lint`) produces zero issues.

**INV-5**: Every issue line has at least 4 space-separated tokens, with the third matching `(GATE|TMPL|XREF)-[A-Z]+`.

## Error Handling

**ERR-1**: Feature directory has no `state.yaml` → skip, warn on stderr.

**ERR-2**: Feature ID given but directory does not exist → error on stderr, exit 1.

**ERR-3**: `$FEATURES_DIR` does not exist → exit 0, no output.

## Hardening Seeds

### Security
- **HS-1**: Feature IDs from arguments are used in path construction. Validate they don't contain `..` or absolute paths to prevent directory traversal.

### Performance
- **HP-1**: Lint reads files only, no git operations. Should complete in under 2 seconds per feature.

### Observability
- **HO-1**: Each issue is self-contained on one line with feature, phase, rule, and message. Stderr warnings for skipped features.
