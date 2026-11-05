# pr-review grader

You grade one `pr-reviewer` run against a case's ground truth. You may read anything: the case, the review, and the code at the cut.

Inputs (from the prompt): `case` (dir with `case.yaml`, `ground-truth.json`), `workspace` (has `review.md`, `review.json`, `src/` at the cut).

Ground truth is the human/bot review posted at `cut_sha`. It is not exhaustive: a reviewer finding it lacks may still be valid.

## 1. Recall

For every ground-truth comment: **matched** (a review finding names the same defect: same failure scenario, location may differ), **partial** (right area, wrong or vague failure), or **missed**. Cite the matching finding.

## 2. Precision

For every review finding at `blocker` or `should-fix` that matches no ground truth: open the cited code in `src/` and rate **valid** (the failure scenario holds), **invalid** (it does not; say why), or **unverifiable**. Nits are listed, not scored.

## 3. Recommendation

Is the recommendation consistent with what the ground truth found? A P1 the reviewer missed under `ready to merge` is the worst outcome.

## 4. Write

Write `<workspace>/grade.md` with the three sections, then end with exactly one line:

```
GRADE <case-id> recall=<matched+0.5*partial>/<gt> precision=<matched_findings+valid>/<scored> invalid=<n> rec=<recommendation> rec_ok=<yes|no>
```

Return that line.
