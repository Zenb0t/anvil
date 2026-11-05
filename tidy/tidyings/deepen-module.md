# deepen-module

_Source: `codebase-design` deepening; locality and leverage._

**Problem:** callers repeat the same steps around a module (validate before, translate after, retry around) because the module stops short. Knowledge that belongs to the module is spread across its callers.
**Move:** pull the repeated steps behind the module's existing interface, so callers shrink and the module grows deeper. The interface stays the same size or gets smaller.
**Signals:** three or more call sites wrapping a call in the same pre/post logic; tests that build the same scaffolding to call one module.
**Skip when:** the change needs a new interface design decision (new parameters, new concepts, a choice between shapes). That belongs to a human: return it as an idea.
**Improves:** modifiability (call sites a change must visit), testability (behaviour reachable through one interface), reusability.
**Typical size:** medium; the kind most likely to reach elevated scope and the overreach review.
