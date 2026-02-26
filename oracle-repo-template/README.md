# Oracle Repository Template

This folder is a skeleton for a separate oracle repository.

## Contract

- Oracle repo checks out product repo at an exact commit SHA.
- Oracle suite executes independently against built artifacts.
- Product implementer role must not modify oracle assets.

## Suggested Flow

1. Clone this template into a sibling repository.
2. Wire `harness/` to pull or mount product artifacts.
3. Implement evidence checks in `oracle-tests/`.
4. Store deterministic fixtures in `fixtures/`.
5. Keep `etr.md` aligned with Phase 4 ETR matrix.

See `ci-example.yml` for an example CI job.
