# move-for-cohesion

_Source: Beck, "Cohesion Order", "Move Declaration and Initialization Together"; Fowler, Feature Envy._

**Problem:** things that change together sit apart: a function lives in one module but works on another module's data, or its only caller is elsewhere; related declarations are scattered within a file.
**Move:** move the element to where its data or its only caller lives, or reorder a file so coupled elements are adjacent.
**Signals:** an exported function with exactly one importing module; a function reading another module's fields more than its own; git change coupling (two files that nearly always change in the same commit).
**Skip when:** the current placement is a seam something varies across; the move crosses domains.
**Improves:** modularity (fan-out/fan-in), modifiability (change coupling).
**Typical size:** small.
