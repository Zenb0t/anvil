# threads

Every unresolved review thread in `pack.md` gets a verdict. A thread closes only when its ask is met in code or answered in writing.

For each thread, read its full comment chain, then the code at `path` in `src/` and the commits after the thread's last comment (`git log --format='%h %s' <first-comment-time>.. -- <path>` and `git show`).

- **addressed**: a commit after the ask makes the change asked for, or the author answered a question and the asker did not push back. Name the commit.
- **open**: the ask is not met, or the last word is an unanswered question or request.
- **disputed**: the code changed, but not in the way asked, or the author pushed back and the asker has not replied.

Return this shape instead of `findings`:

```
dimension: threads
threads:
- id: <thread id>
  url: <first comment url>
  verdict: addressed | open | disputed
  sha: <commit for addressed, else null>
  reason: <one line>
```
