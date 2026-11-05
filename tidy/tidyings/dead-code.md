# dead-code

_Source: Beck, "Delete Dead Code"._

**Problem:** code nothing reaches: unused exports and files, unreachable branches, flags that only ever take one value, commented-out blocks. Every reader pays to read it.
**Move:** delete it. Version control remembers it.
**Signals:** the language pack's unused-code tool; a flag or parameter passed the same value at every call site; branches guarded by a constant.
**Skip when:** reached by convention or at runtime rather than by import (framework routes, CLI bins, plugin registries, reflection, string lookups); part of the published surface; a side-effect import.
**Improves:** analysability (NLOC, unused-export count), modifiability (fewer places a change must consider).
**Typical size:** small.
