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
