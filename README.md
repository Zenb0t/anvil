# anvil

Reusable agents and prompts.

## PR review

Keeps every open PR in your configured repos reviewed at its head commit, with its ticket and review threads in view.

```
pr-orchestrator   sweep: find PRs lacking a current review, check cross-PR overlap, dispatch
└─ pr-reviewer    one PR: context pack → merge danger → dimensions → verify → post COMMENT review, close addressed threads
   └─ pr-dimension one rubric: intent · correctness · standards · threads · security · tests · errors
```

- Reviews post as `COMMENT` with a recommendation (ready / merge after fixes / needs human review / not ready) from door × blast radius. Never approves, pushes or merges.
- State lives in a hidden marker in each review (`<!-- pr-review v1 sha=… -->`); no database.
- Rubrics: `pr-review/dimensions/`. Config schema: `pr-review/config.example.yaml`.

Install: `./install.sh` (copies into `~/.claude`). First run of `pr-orchestrator` interviews you for repos and tracker access when `~/.claude/pr-review/config.yaml` is missing.

Run: `/loop 30m use the pr-orchestrator agent to run a sweep`, or a scheduled routine with the same prompt.

## Tidy

Finds small structure-only improvements (Kent Beck's _tidyings_) in the hotspots of your configured repos, makes each one in isolation, proves behaviour unchanged, and scores it against ISO/IEC 25010 maintainability.

```
tidy-orchestrator   sweep: sync outcomes, enforce PR budget, dispatch, publish the report artifact
├─ tidy-scout       one repo, read-only: hotspots (churn × complexity) → ranked candidates and ideas
└─ tidy-maker       one tidying: baseline → safety net → tidy → verify → measure → proposal (or draft PR)
```

- Modes per repo: `report` (proposals in a claude.ai artifact, nothing pushed) or `draft-pr`. Act on a report with `promote <id>` or `decline <id> <reason>`; declines are never proposed again.
- Scope is judged, not capped: past ~300 lines or 7 files, or across domains, the maker runs an overreach review (trim, split or keep).
- Language-agnostic agents; language specifics live in `tidy/languages/` (contract: `CONTRACT.md`, first pack: TypeScript). Tidying kinds: `tidy/tidyings/`. Judgement: `tidy/rubric.md`.
- State: `~/.claude/tidy/ledger.yaml` and the `tidy` label on PRs.

Run: `use the tidy-orchestrator agent to run a sweep`, or `/loop 1d` with the same prompt.

## Factory (blueprint)

Tickets from any board in, reviewed PRs out. One dispatcher feeds a pool of agent lanes (herdr panes); each lane splits a ticket into a plan of logical commits, builds them, and hands the PR to `pr-reviewer`. Not runnable yet: this is the design to build against, one step at a time.

```
dispatcher   one loop for the pool: spec check at intake, gates (lane, ready, overlap, QC back-pressure, usage reserve, context), rework routing, event log
└─ lane      one ticket: plan into the ticket → one commit per plan item, each with tests → PR → CI
   └─ QC     pr-reviewer: merge or rework
```

- Rules: `factory/lifecycle.yaml` (states, transitions, gates, plan format, event log). Design and scaling ladder: `factory/BLUEPRINT.md`.
- Config schema: `factory/config.example.yaml`. Interactive mock of the floor: `factory/mock/herdr-floor.html`.
