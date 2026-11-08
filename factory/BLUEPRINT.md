# Factory blueprint

Tickets in, reviewed PRs out. One dispatcher feeds a pool of agent lanes; each lane turns one ticket into a plan of logical commits, builds them, and hands a PR to QC. The rules live in [`lifecycle.yaml`](./lifecycle.yaml); this page explains them and how to grow the factory.

```
board ─► spec check ─► dispatcher ─► lane × N ─────────────► CI ─► QC (pr-reviewer) ─► human merge
(any tracker)   │         ▲ gates      │ plan → commits + tests    │        │
          needs spec      │            ◄──────── red ──────────────┘        │
                          │            ◄──────── rework ────────────────────┘
                          └── herdr socket (lane state) · usage · context
```

## Roles

| Role | Is | Owns | Never |
|---|---|---|---|
| **Dispatcher** | One loop for the whole pool. Mostly code; asks a model only to choose among ready tickets or to judge overlap. | `ready → planning`, rework routing, lane restarts, the event log. | Writes code. |
| **Lane** | One agent in one herdr pane, in its own worktree. | `planning → building → in_qc` for one ticket at a time. | Picks its own work. |
| **CI** | The repo's own checks: lint, types, existing tests, the ticket's new tests. Deterministic, runs before any model review. | `ci → in_qc` or back to `building`. | Gets skipped. |
| **QC** | `pr-reviewer` from `pr-review/`. | The verdict: `merge` or `rework`. | Approves or merges. |
| **Human** | You. | Answers to blocked lanes, merges. | Has to watch a terminal: blocks surface on Herdr Floor. |

Every lane writes tests: existing tests must pass after each commit, and each commit adds or updates tests for what it changes. The spec check runs before a ticket can be ready, so weak tickets are fixed by people at the start instead of failing at QC.

One dispatcher, not one per lane: usage limits, QC capacity, file overlap and epic priority are all shared, so only a global view can decide well. Group lanes into pools only when they differ in a limit (account, repo, skill); each pool then gets its own limits under the same dispatcher.

## Contracts

**Tracker adapter.** The only tracker-specific part. Any board that supports these works:

| Operation | Used for |
|---|---|
| `list(epic)` → id, title, column, dependencies, area | Ready and backlog sets |
| `claim(id, lane)` | Move to In progress, record the lane |
| `write_plan(id, items)` / `tick(id, n)` | The plan checklist |
| `set_column(id, state)` | Mirror lifecycle state onto the board |
| `link_pr(id, url)`, `comment(id, text)` | Traceability, hold reasons |

**Herdr.** The dispatcher subscribes to `pane.agent_state_changed` on herdr's socket. `idle` frees a lane, `blocked` raises the human alert, `working` clears it. Dispatching is `pane.send_text` + `Enter` with `/ticket-to-plan <id>` into the lane's pane. A pane is linked to a ticket by its branch name (`config.repo.branch`).

**Plan.** One checklist item per logical commit, written as the commit message. Each item builds and passes tests alone. Commit-level progress (what Herdr Floor draws inside a lane) is just ticked items over total.

**Context.** Every lane loads the ticket, the repo conventions and the ADRs before planning (paths in `config.repo.context`).

**Access.** For now: lanes push their own branch and open PRs; nothing merges without a person. The full model (secrets, environments, tool permissions) is still to be defined; `lifecycle.yaml` → `access` holds the current policy.

**Events.** Every transition and hold is one JSON line in `~/.claude/factory/events.jsonl`. Herdr Floor reads that log plus herdr's socket, so the view needs no database.

## Scaling ladder

Move up a step only when the exit check of the current one holds.

| Step | What runs | Gates on | Exit check |
|---|---|---|---|
| **1. One ticket, by hand** | You run the lane on one chosen ticket: plan → commits with tests → CI → PR → `pr-reviewer`. No dispatcher. | spec check | 3 tickets where the plan matched the commits, CI passed, and the board updated without help. |
| **2. One lane, automated** | Dispatcher on `/loop`, `max_lanes: 1`. Fresh session per ticket, so the context gate is moot. | ready, qc, usage | 5 tickets through with no manual board edits; first-pass QC ≥ 60%. |
| **3. Lanes in herdr** | `max_lanes` 2 → 4. Lanes are herdr panes; the dispatcher listens to the socket. | all six | No two lanes ever touched the same area; blocked lanes answered within the hour. |
| **4. Watch the floor** | Herdr Floor reads the event log and the socket live. | all six | The view matches the board without refreshing it by hand. |

## Measurement and improvement

Metrics come from the event log (`lifecycle.yaml` → `metrics`): lead time, time in each state, CI and QC first-pass rates, rework per ticket, usage per ticket, and bugs filed against shipped tickets. Each CI failure and QC rejection gets a category (spec, plan, tests, conventions); a weekly look at the categories says what to fix in the plan skill, the conventions or the spec check. After a fix, replay past tickets the way `evals/` replays PRs for `pr-reviewer`.

Not covered yet: deploy and production monitoring. The line ends at merge.

## Open questions

- **Usage.** The dispatcher needs a usage number per window. Until there is a reliable source, step 2 uses a cap: at most `N` tickets started per window.
- **Access.** Secrets, environments and tool permissions per lane.
- **Area.** Start with a board property. Later, derive it from the paths named in the plan.
- **Ticket-to-plan skill.** The plan format above should match your existing skill's output; adjust `lifecycle.yaml` → `plan` to fit it rather than the other way round.

The interactive mock of the floor is in [`mock/herdr-floor.html`](./mock/herdr-floor.html).
