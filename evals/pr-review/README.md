# pr-review evals

Replays merged PRs whose review is known, cut at the commit that review saw, and scores `pr-reviewer` against it.

## Layout

- Harness (this dir, public): `prepare.sh` builds a workspace; `grader.md` is the grader's prompt.
- Cases (private, `~/.claude/pr-review/evals/cases/<repo>-<pr>/`): `case.yaml` (`repo`, `pr`, `cut_sha`, `base_sha`, `clone`), `title.txt`, `body.md`, `ground-truth.json` (root review comments at the cut). Private because they quote private code and reviews.
- Runs (private, `~/.claude/pr-review/evals/runs/<YYYY-MM-DD>/<case-id>/`): workspace, `review.md`, `grade.md`.

## Isolation

The reviewer sees only the workspace: `src/` holds history up to `cut_sha` with no remote, and `pack.md` has no threads, reviews or later comments. It runs in offline mode (no `gh`, no network). `ground-truth.json` stays in the case dir, which the reviewer is never given.

## Run (an agent follows this)

1. `./install.sh` so the agents under test are current.
2. Per case: `evals/pr-review/prepare.sh <case-dir> <run-dir>/<case-id>`.
3. Per case, in parallel: `evals/pr-review/run-case.sh <case-dir> <run-dir>/<case-id>` (headless `claude -p --agent pr-reviewer`, offline, `gh`/web denied). Token use and cost land in `run.json`.
4. Per case, after its review exists: spawn a grader (`general-purpose`) with `grader.md` and `case`, `workspace`.
5. Write `<run-dir>/results.md`: the GRADE lines, totals (recall, precision, invalid), tokens per case, and the agent commit (`git rev-parse --short HEAD`).

## Adding a case

Pick a merged PR whose review comments were all posted at one commit. `cut_sha` = that commit (`original_commit_id`); `base_sha` = merge-base of the PR base and the cut. Check `body.md` does not restate the review's findings.
