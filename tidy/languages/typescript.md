# TypeScript pack

Follows `tidy/languages/CONTRACT.md`. Run every command from the worktree root (or the workspace package root in a monorepo) unless stated.

## Source files

- Source: `**/*.{ts,tsx,mts,cts}`.
- Tests: `**/*.{test,spec}.{ts,tsx}`, `**/__tests__/**`, `test/**`, `tests/**`.
- Always exclude: `**/*.d.ts`, `node_modules/**`, `dist/**`, `build/**`, `out/**`, `coverage/**`, `.next/**`, and generated code (files headed `// @generated` or `DO NOT EDIT`, codegen output dirs).

## Setup

Package manager from the lockfile: `pnpm-lock.yaml` → `pnpm install --frozen-lockfile`; `yarn.lock` → `yarn install --immutable` (Berry) or `--frozen-lockfile` (v1); `bun.lock`/`bun.lockb` → `bun install --frozen-lockfile`; `package-lock.json` → `npm ci`. Monorepo: install at the root once.

Metric tools run without installing into the repo: `npx --yes <tool>`. Complexity uses Python `lizard`: `uvx lizard`, else `python -m lizard` after `python -m pip install --user lizard`.

## Commands

First match wins:
- **typecheck:** config `commands.typecheck` → a `package.json` script named `typecheck`, `type-check`, `tsc` or `check:types` → `npx tsc --noEmit -p tsconfig.json` (in a monorepo with project references, `npx tsc -b`).
- **test:** config `commands.test` → the `test` script, run non-interactively (vitest: add `--run`; jest: add `--ci`). Prefer scoping to related tests while iterating (`vitest related <files> --run`, `jest --findRelatedTests <files>`); run the full suite for baseline and final verify.
- **lint:** config `commands.lint` → the `lint` script → none. Judge only new problems in touched files.

## Metrics

Run on the files in scope, before and after.

- **Complexity, NLOC, parameters, nesting:** `python -m lizard -l typescript -ENS --csv <files>` (covers `.tsx` too). CSV columns: `NLOC, CCN, tokens, PARAM, length, location, file, function, long_name, start, end, max_nesting`. Report max and sum of CCN per file, and the touched functions' CCN and nesting.
- **Duplication:** `npx --yes jscpd --silent --reporters json --output <W>/jscpd <paths>`, read `<W>/jscpd/jscpd-report.json` (`statistics.total.duplicatedLines`, `duplicates[]`).
- **Coupling:** `npx --yes madge --json --ts-config tsconfig.json --extensions ts,tsx <src-root>` gives each module's imports (fan-out); invert for fan-in. Cycles: same command with `--circular`. Resolve `paths` aliases through `--ts-config`.
- **Unused code:** `npx --yes knip --reporter json` (needs installed dependencies). Treat output as candidates; confirm each against **Gotchas** before deleting.
- **Change coupling:** `git log --since=<N>.days --name-only --format=%H -- <globs>`; count how often two files share a commit.

## Published surface

- **Library packages** (a `package.json` without `"private": true`): entry points are `exports`, `main`, `module`, `types`, `bin`. Prove unchanged by emitting declarations before and after and diffing the entry points' `.d.ts`:
  `npx tsc -p tsconfig.json --declaration --emitDeclarationOnly --noEmit false --outDir <W>/dts-<before|after>`
  If emit fails on the repo's config, compare the exported names of each entry file and its re-export chain by reading them.
- **Apps and private packages**: the surface is runtime contracts: HTTP routes and payload keys, CLI flags, env var names, DB/table/column names, event and queue names, `localStorage` keys, anything serialized. In the diff these appear as string literals, so check every changed string literal in non-test code.
- Workspace packages consumed only inside the monorepo are internal: typecheck at the root proves their callers.

## Safety net

- Find tests for a module: test files importing it (`grep -rl "from '.*<module-basename>'" <test globs>`), plus `vitest related` / `jest --findRelatedTests`.
- Characterization tests: use the runner already in `devDependencies` (vitest, jest, `node:test`) and the repo's placement convention (co-located `*.test.ts`, `__tests__/`, or `test/`). Test through the module's exported interface; assert the current outputs, including odd ones, with a comment `// characterization: current behaviour` on surprising cases.

## Signals

| kind | TypeScript signals |
|---|---|
| dead-code | knip unused files/exports/types/enum members; `if (false)`, unused params of non-exported functions; exported but unimported symbols |
| guard-clauses | lizard nesting ≥ 3; `if (x) { …long… } else { throw/return }` |
| explaining-names | repeated literals; long `&&`/`\|\|` chains in conditions; `any`-typed params named `data`/`obj` |
| normalize-symmetries | mixed `null`/`undefined` for absence; mixed `throw` vs `Result`-style returns; mixed `async/await` and `.then` chains in one module |
| extract-helper | jscpd clones inside one domain |
| move-for-cohesion | madge: an exported symbol with fan-in 1 from a different directory; change coupling |
| inline-pass-through | functions whose body is `return other(...args)`; files that only `export … from`; classes whose methods each delegate to one field |
| remove-hypothetical-seam | `interface I…` or abstract class with one `implements`/`extends` and no test fake; factory functions with one return type; DI tokens with one provider |
| deepen-module | the same `try/catch`, validation or mapping wrapped around calls to one module at ≥ 3 sites |
| glossary-rename | identifiers, file names and type names matching glossary _Avoid_ terms |

## Gotchas

- **Barrel files** (`index.ts` re-exports) look like pass-throughs but often are the package's public entry or a convention; deleting one rewrites every import path. Treat barrels at a package root as published surface.
- **Runtime references the type system misses**: framework file conventions (Next.js `app/`/`pages/`, Remix routes, Storybook stories, test setup files), dependency-injection by decorator or token (Nest, Angular, InversifyJS), `reflect-metadata`, dynamic `import()` with computed paths, string-keyed registries.
- **Declaration merging and augmentation** (`declare module`, `declare global`, merged interfaces/namespaces): moving or renaming one declaration silently splits the merge.
- **Side-effect imports** (`import './polyfill'`) and module-level code run at import time: moving or deleting an import changes execution order.
- **`const enum`, `isolatedModules`, `verbatimModuleSyntax`**: moving types between modules can turn a type import into a runtime import or break transpile-only builds; use `import type` for type-only moves.
- **Class field and `this` semantics**: turning a method into an arrow property (or back) changes binding and prototype shape; inlining a getter changes laziness.
- **Guard clauses in async code**: returning early inside a `try` with `finally`, or before an `await` that released a lock, changes ordering.
- **Path aliases**: a moved file must resolve under every `tsconfig` that includes it (app, test, build configs often differ).
