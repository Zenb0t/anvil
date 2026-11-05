# explaining-names

_Source: Beck, "Explaining Variables", "Explaining Constants"; Fowler, Mysterious Name._

**Problem:** meaning a reader has to reconstruct: a dense expression inline, a magic number or string, a name that hides what it holds.
**Move:** name the sub-expression or the constant, or rename the symbol to say what it is.
**Signals:** literals repeated across a module; conditions with three or more boolean operands; names like `data`, `tmp`, `handle`, `process`, or single letters outside tiny scopes.
**Skip when:** the name is fixed by an external contract (wire fields, DB columns, event names, the published surface); the right name is a domain term the glossary has not settled (a question for a human).
**Improves:** analysability.
**Typical size:** small.
