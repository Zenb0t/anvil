# glossary-rename

_Source: `domain-modeling`._

**Problem:** code names a domain concept with a synonym, or with a term `GLOSSARY.md` marks _Avoid_, so code and conversation use different words for one thing.
**Move:** rename the identifiers (types, functions, variables, files) to the glossary's canonical term.
**Signals:** an identifier matching an _Avoid_ entry or a listed synonym; one concept named two ways within a domain.
**Skip when:** the repo has no `GLOSSARY.md` (only a human settles terminology); the name reaches the published surface or persisted data (DB columns, event names, wire fields); the glossary entry itself is ambiguous (return it as an idea).
**Improves:** analysability.
**Typical size:** small to medium; large fan-out is mechanical and passes the overreach review.
