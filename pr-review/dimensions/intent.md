# intent

Does the change do what was asked — all of it, and only it? Judge against the ticket's acceptance criteria in `pack.md`; with no ticket, against the PR body.

Findings:
- **Missing:** a criterion not implemented, or only partly. `blocker` when the ticket's core ask is missing.
- **Wrong:** looks implemented, but the behaviour diverges from the criterion. Quote the criterion.
- **Scope creep:** behaviour nobody asked for. `should-fix` when it widens blast radius; `nit` otherwise.
- **Unstated intent:** no ticket and a PR body too thin to judge → one `should-fix` asking for the intent.

Quote the ticket or PR-body line in every finding's evidence.
