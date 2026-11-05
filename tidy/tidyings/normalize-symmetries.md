# normalize-symmetries

_Source: Beck, "Normalize Symmetries"._

**Problem:** the same thing done several different ways within one module or domain, so readers wonder whether the differences matter.
**Move:** pick the clearest existing form and make the others match it.
**Signals:** sibling functions handling the same shape with different idioms (loop vs map, throw vs returned error, `null` vs `undefined` for "none"); parallel modules with mismatched layout.
**Skip when:** a difference carries meaning (a performance path, different error semantics, ordering); the module has no majority form and no doc settles the convention.
**Improves:** analysability, reusability (one form invites one helper later).
**Typical size:** small to medium.
