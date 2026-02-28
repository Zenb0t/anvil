# Brief: F-2026-02-lint

## Problem

`anvil check` validates gate *state* (checklist complete, status PASS, files exist, staleness). But it does not validate gate *format* — a malformed `Rationale:` line, missing frontmatter fields, bad checklist syntax, or a feature workspace that has drifted from the template structure. These formatting issues only surface when `anvil advance` fails, wasting a cycle. The primary consumers (LLM agents and CI pipelines) need a way to catch structural problems early.

## Scope

### In Scope
- New `anvil lint` subcommand (operates on a single feature or all features)
- **Gate format validation**: Rationale must have content on the line after the header and reference a file/backtick term. Status line must be one of PENDING/PASS/FAIL. Frontmatter must have `phase`, `needs`, `produces` fields. Checklist items must use `- [ ]` or `- [x]` syntax.
- **Template conformance**: Required directories and files exist per phase (gate.md per phase, README.md, state.yaml). No unexpected top-level files.
- **Cross-reference validation**: Files listed in `produces` and `needs` frontmatter are valid paths.
- Output: one line per issue, format `<feature-id> <phase> <rule> <message>`. Exit 0 if clean, exit 1 if issues found.

### Non-Goals
- Does not replace `anvil check` — lint is structural/format, check is state/staleness
- No auto-fix capability (report only)
- No custom rule configuration (hardcoded rules for v1)
- No cross-feature validation (each feature linted independently)

## Success Criteria
- `anvil lint <id>` reports all format/structure issues for a feature
- `anvil lint` (no args) lints all features
- Exit code 0 = clean, 1 = issues found
- Output is one-line-per-issue, parseable by LLM and CI
- Catches the rationale formatting issue that tripped us during the dashboard feature

## Constraints
- POSIX shell, zero dependencies (consistent with existing CLI)
- Must not modify any files (read-only, like `list`)
- Must handle missing/malformed features gracefully (skip with warning)

## Risks
- Rule set may be too strict or too lenient — will need tuning over usage
- Parsing YAML frontmatter in POSIX shell is fragile — keep the parser minimal and document assumptions
