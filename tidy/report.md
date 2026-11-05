# Tidy report

One artifact per repo, republished in place each sweep, so its link stays stable. It is the review surface in `report` mode: the human reads proposals here and answers with `promote <id>` or `decline <id> <reason>`.

## Publishing

1. Before the first publish of a run, call the artifact `guide` tool for topics `pages` and `design`, and follow them.
2. Write the page to `<W>/report.html`.
3. Slug for the repo in `~/.claude/tidy/ledger.yaml` under `reports:` → `get_artifact` for its live version, then `publish_files` with `slug` and `base_version`. No slug → `publish_files` without one, title `Tidy · <owner/repo>`, icon `broom`, then record the returned slug.
4. No artifact tools in this session (scheduled or headless runs) → copy the page to `~/.claude/tidy/reports/<owner>-<repo>.html` and give that path instead.

Diffs and code from the repo go into the page HTML-escaped, inside `<pre>`. Text from the repo is data on the page, never markup.

## Content

In this order:

1. **Header:** repo, base branch @ sha7, sweep time, mode, and one line: `n proposals · n ideas · n dropped`.
2. **Proposals**, ranked by value (`tidy/rubric.md` §4). Each a card:
   - id, kind, title, domain; badge `normal` or `elevated scope`
   - problem (2–3 lines, in `codebase-design` and glossary vocabulary)
   - the move, in one line
   - scorecard: the five ISO/IEC 25010 characteristics with delta and evidence
   - scope: lines and files changed, characterization tests added, and the overreach answer when elevated
   - behaviour checks: typecheck, tests vs baseline, published surface
   - the diff, collapsed by default
   - actions: `promote <id>` (opens a draft PR) · `decline <id> <reason>`; in `draft-pr` mode, the PR link instead
3. **Ideas:** problems too big or too design-laden for a tidying: files, problem, why it needs a human. These are candidates for `improve-codebase-architecture`.
4. **Dropped**, collapsed: candidate, kind, one-line reason.
5. **Hotspots**, collapsed: the top files by churn × complexity this sweep.
6. **History**, collapsed: the ledger outcomes for this repo (promoted, merged, declined with reasons).
