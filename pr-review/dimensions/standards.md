# standards

Does the change follow this repo's documented standards? Sources: the files listed under **Standards sources** in `pack.md`. Cite file + rule for every violation. Skip anything a linter or formatter in the repo already enforces.

Documented-standard breaches may be `blocker` or `should-fix`. A documented repo standard always overrides the smell baseline below; where the repo endorses something the baseline would flag, drop the smell.

## Smell baseline

Always judgement calls (`should-fix` at most, phrased "possible <smell>"). Match against the diff only:

- **Mysterious Name**: name hides what it does or holds → rename.
- **Duplicated Code**: same logic shape in more than one hunk or file → extract.
- **Feature Envy**: reaches into another object's data more than its own → move it there.
- **Data Clumps**: same fields/params travel together → bundle into a type.
- **Primitive Obsession**: primitive standing in for a domain concept → give it a type.
- **Repeated Switches**: same switch/if-cascade on the same type recurs → one map or polymorphism.
- **Shotgun Surgery**: one logical change scattered across many files → gather it.
- **Divergent Change**: one module edited for unrelated reasons → split.
- **Speculative Generality**: abstraction or params for needs the ticket lacks → inline it.
- **Message Chains**: long `a.b().c().d()` navigation → hide behind one method.
- **Middle Man**: mostly delegates onward → call the target directly.
- **Refused Bequest**: ignores most of what it inherits → composition.
