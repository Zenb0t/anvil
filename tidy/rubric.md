# Tidy rubric

A **tidying** (Kent Beck, _Tidy First?_) changes structure and leaves behaviour exactly as it was. One tidying per proposal. This rubric decides whether a finished tidying is proposed or dropped. The scout uses it to predict; the maker uses it to judge.

## 1. Behaviour preserved

All must hold, or the verdict is `drop`:

- Typecheck is green after.
- The test suite fails on exactly the same set of tests after as at the **baseline** (usually none).
- Existing tests changed only mechanically, as the tidying forced (imports, renamed symbols). An edited assertion means behaviour moved.
- No literal value in non-test code changed, unless moved verbatim or renamed under `glossary-rename` away from the published surface. Literals carry routes, keys and messages.
- The **published surface** is unchanged: whatever code outside the repo consumes (package entry points, public HTTP/CLI contracts, persisted names). The language pack says how to check it. Interfaces internal to the repo may change when typecheck proves every caller was updated.
- The touched code had a **safety net** before the tidying: tests that exercise it through its interface, existing or added as characterization tests in a separate commit.

## 2. Scope

Count changed lines and files from `git diff --numstat <base>..HEAD`, characterization tests reported separately and excluded from the count.

- **Normal:** ≤ `scrutiny.lines` lines, ≤ `scrutiny.files` files, all in one **domain** (one glossary context, monorepo package, or top-level source area).
- **Elevated:** beyond any of those. Run the **overreach** review and record its answer as one line in the proposal:
  1. Does every hunk serve the one tidying named in the problem?
  2. Would it split into a sequence of tidyings that each stand alone and each improve something?
  3. Does the size come from mechanical fan-out (one rename, many call sites) or from judgement spread across many places?

  Then act: _trim_ hunks that fail (1); _split_ when (2) holds, keep the first step and list the rest as follow-ups; _keep_ when the size is mechanical fan-out. Judgement spread across domains → `drop`, and return it as an idea.

## 3. Maintainability score

Score each **ISO/IEC 25010** maintainability characteristic as `improved`, `neutral`, `worse` or `unmeasured`, on the files the tidying touched, before vs after. Every `improved` and `worse` cites evidence: a metric delta from the language pack's tools, or a concrete reading-cost argument when no metric reaches it (name what a reader no longer has to hold in mind).

| characteristic | question | typical evidence |
|---|---|---|
| Modularity | Did coupling between modules drop, or cohesion within one rise? | fan-out/fan-in, import cycles, modules on the call path |
| Reusability | Is logic now in one place others can call? | duplicated lines (clones) |
| Analysability | Is it faster to understand and diagnose? | cyclomatic complexity, nesting depth, NLOC, glossary-aligned names |
| Modifiability | Will the next change touch fewer places? | change coupling from git history, call sites a change must visit |
| Testability | Can behaviour be exercised through a smaller interface? | setup/mocks a test needs, behaviour reachable per interface |

The Maintainability Index may appear as context. It is never the evidence for a verdict: it folds several metrics into one number and rewards gaming.

## 4. Verdict

`propose` when §1 holds, §2 resolved, at least one characteristic is `improved` with evidence, and every `worse` names why the gain outweighs it. Otherwise `drop`, with the reason in one line.

**Value**, used to rank proposals in the report: the size of the improvement, weighted by how hot the file is (churn × complexity rank from the scout). A modest tidying in a file changed every week beats a large one in a file nobody touches.
