# inline-pass-through

_Source: `codebase-design` deletion test; Fowler, Middle Man._

**Problem:** a **shallow** module whose interface is as large as its implementation; it only forwards calls. Readers bounce through it and learn nothing.
**Move:** apply the deletion test. If deleting it moves no complexity into callers, inline it and point callers at the target.
**Signals:** functions or classes whose bodies are a single delegating call; wrapper modules re-exporting another under new names; layers that add no invariant, error handling or translation.
**Skip when:** two or more adapters sit behind it (a real seam); it is the published surface; an ADR records it as a deliberate layer; it translates between domain languages (anti-corruption).
**Improves:** modularity (modules on the call path), analysability.
**Typical size:** small; medium when many callers import it (mechanical fan-out).
