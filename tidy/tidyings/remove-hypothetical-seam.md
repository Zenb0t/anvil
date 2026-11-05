# remove-hypothetical-seam

_Source: `codebase-design`: one adapter means a hypothetical seam, two adapters mean a real one._

**Problem:** an abstraction (interface, abstract base, factory, injection token) with exactly one adapter, paid for in indirection with nothing varying across it.
**Move:** collapse the abstraction onto its only adapter; callers use the concrete module directly.
**Signals:** an interface with one implementing class and no test fake; a factory returning one concrete type; configuration that selects among a single option.
**Skip when:** a test adapter exists (that is the second adapter); an ADR or open ticket names a second adapter as planned; it is the published surface.
**Improves:** analysability, modularity (fewer modules and indirections).
**Typical size:** small to medium.
