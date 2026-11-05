# Language pack contract

The tidy agents are language-agnostic. Everything that depends on the language lives in one pack, `tidy/languages/<language>.md`, named by a repo's `language:` in config. A pack answers each section below, under these exact headings, so the agents can point at a section by name.

- **Source files**: globs for source, for tests, and paths to always exclude.
- **Setup**: detect the toolchain and install dependencies in a fresh worktree.
- **Commands**: typecheck (or compile), test, lint. Detection order, with config `commands:` always winning.
- **Metrics**: one runnable command per measure, and how to read its output: complexity, nesting, duplication, coupling (fan-in/fan-out, cycles), unused code. Any measure the language lacks is marked `unmeasured`.
- **Published surface**: what code outside the repo consumes, and how to prove it unchanged before vs after.
- **Safety net**: how to find the tests exercising a module, and the conventions for adding characterization tests.
- **Signals**: per tidying kind in `tidy/tidyings/`, the language-specific signals and tools. Kinds the pack omits use only the generic signals.
- **Gotchas**: language features that make a structural change alter behaviour.

Adding a language: write the pack, then set `language:` on a repo. No agent changes.
