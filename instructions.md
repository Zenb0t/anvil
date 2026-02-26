# Plan: Build the Base of EDSC (Process Kit, Repo-Native) v0.1

## 0) What we’re building

A lightweight, repo-native “harness” that turns a PRD into a phase-by-phase cascade:

**PRD → Framing → Spec → ADR/contracts → ETR + Oracle → Slices/Implementation → Hardening → Release/Learning**

Key properties:

* **One page per phase for humans** (`README.md`), self-contained.
* Everything else goes to `appendix/` (AI-heavy detail).
* **Gates are mechanical**, not honor-system: a checker validates gate completeness + staleness.
* **Oracle separation is structural** by default (separate oracle repo skeleton).
* **Docs are a system of record**: `AGENTS.md` is a short ToC into `/docs/**` (not a monolithic brain dump).
* Phase 7 produces **process deltas** that have an explicit path to update templates + checks.

---

## 1) Repository layout (the substrate)

Codex should add this to the repo:

```text
/process/edsc/
  README.md                      # overview + how to run
  /templates/
    /feature/
      README.md                  # feature “single pane of glass”
      phase.yaml
      /00-intake/README.md + gate.md + appendix/
      /01-framing/README.md + gate.md + appendix/
      /02-spec/README.md + gate.md + appendix/
      /03-arch/README.md + gate.md + appendix/ + contracts/
      /04-verification/README.md + gate.md + appendix/ + etr.md
      /05-implementation/README.md + gate.md + appendix/ + slices.md
      /06-hardening/README.md + gate.md + appendix/
      /07-release-learning/README.md + gate.md + appendix/ + process-deltas.yaml
  /prompts/
    conductor.md                 # how to run the process
    oracle-validator.md          # produces ETR + oracle assets; no implementation access
    implementer.md               # implements slices; no oracle access
    (optional) hardener.md
  /scripts/
    edsc.ts                      # CLI entry (or edsc.js)
    edsc-lib.ts                  # parsing/fingerprints/staleness/checks
  /references/
    epistemology.md              # short: “verification = falsification” framing
    example-feature.md           # toy worked example
/docs/
  index.md                       # doc map
AGENTS.md                        # ToC pointer into /docs/** (keep short)
/work/features/                  # generated feature instances live here
```

### Doc philosophy (enforced)

* `AGENTS.md` is **≤ ~100 lines**, just a map into `/docs/**`.
* All human docs are **single page per phase**; appendices can be large.

---

## 2) Phase definitions (what each phase means)

Each phase folder contains:

* `README.md` (one page for humans)
* `gate.md` (checklist + PASS/FAIL + machine-readable dependencies)
* `appendix/` (AI-heavy details)

### Mode distinction must be operational (Phase 0 sets this)

`mode: complicated | complex`

**Complicated:** aim for completeness upfront (spec, ADRs, broad oracle).
**Complex:** aim for safe-to-fail probes; spec is hypothesis-driven; ADRs minimized to safety boundaries; oracle focuses on “must never” + observability + experiment criteria.

---

## 3) `phase.yaml` (state machine + anti-staleness)

Each feature has a root `phase.yaml` controlling:

* current phase
* per-phase status (`not_started|in_progress|pass|fail|stale`)
* `last_verified_at`
* `inputs_fingerprint`
* `mode`
* open questions/decisions/hypotheses

Example schema:

```yaml
feature_id: F-YYYY-MM-name
mode: complicated
current_phase: 01-framing

phases:
  00-intake:
    status: pass
    last_verified_at: "2026-02-25T20:00:00-08:00"
    inputs_fingerprint: "sha256:..."
  01-framing:
    status: in_progress
    last_verified_at: null
    inputs_fingerprint: null
  02-spec: { status: not_started }
  03-arch: { status: not_started }
  04-verification: { status: not_started }
  05-implementation: { status: not_started }
  06-hardening: { status: not_started }
  07-release-learning: { status: not_started }

open_questions: []
decisions_needed: []
open_hypotheses: []
```

**Staleness rule (non-negotiable):**
If a phase’s dependency fingerprint changes OR TTL expires, that phase becomes `stale` (even if it previously passed).

---

## 4) `gate.md` metadata (dependencies + required files)

Every `gate.md` must have YAML frontmatter:

```md
---
phase: 02-spec
depends_on:
  - ../01-framing/README.md
  - ../00-intake/appendix/PRD.md
required_files:
  - README.md
  - gate.md
ttl_days: 14
---
# Gate Checklist
- [ ] ...
Result: PASS/FAIL
Rationale:
Next actions:
```

---

## 5) Mandatory CLI harness (`./bin/edsc` or `/process/edsc/scripts/edsc`)

Codex should implement a small CLI (TypeScript/Node is fine) with these commands:

* `edsc scaffold <feature-id>`
  Create `/work/features/<feature-id>/` from templates.

* `edsc status <feature-id>`
  Print phase statuses + blockers + next actions.

* `edsc check <feature-id>`
  Mechanical validation:

  * required files exist
  * README one-page heuristic (e.g., <= 150–200 lines)
  * gate dependencies exist
  * compute fingerprints, mark `stale` if changed
  * TTL enforcement
  * outputs deterministic report + exit code nonzero if failures

* `edsc advance <feature-id> --to <phase>`
  Only allowed if current gate is `pass` and not `stale`.

* `edsc invalidate <feature-id> --phase <phase> --reason "..."`
  Marks phase stale/fail and records reason (prevents rubber stamping).

* (Optional but useful) `edsc apply-deltas <feature-id>`
  Applies Phase 7 “process deltas” to templates/checklists (see §9).

### CI integration (must-have)

Add a CI job that runs:

* `edsc check --all` (or checks changed features)

This makes gates enforceable, not ceremonial.

---

## 6) Oracle separation (must be structural by default)

**Default behavior:** scaffold an **oracle repo skeleton** alongside product repo content.

Add to repo:

```text
/oracle-repo-template/
  README.md
  /oracle-tests/
  /harness/
  /fixtures/
  etr.md
  ci-example.yml
```

Guidance in `README.md`:

* Oracle repo checks out product repo at commit SHA
* Runs oracle suite against product build/artifacts
* Implementer agent never touches oracle repo

You can still prototype locally by copying the oracle template into a sibling folder, but the **default mental model is separate repo**.

---

## 7) Phase 4 becomes “Verification + Legibility Harness”

Phase 4 isn’t “write tests” — it’s “define evidence and ensure the system is observable.”

Phase 4 README template must include:

* **ETR Matrix (summary):** claim → evidence type → where it runs
* **Refutation requirement:** for critical claims, include at least one negative/refutation attempt
* **Legibility surface:** how the oracle observes behavior:

  * logs/metrics/traces required
  * DB inspection scripts (if applicable)
  * deterministic reproduction command(s)
* **Open hypotheses:** what we don’t know yet, and what evidence will resolve it

Also add a stub script in the feature template, e.g.:

* `/work/features/<id>/appendix/repro.md` with commands to run the system locally/staging.

---

## 8) Phase 6 is “woven then audited”

To avoid Phase 6 constantly discovering late surprises, templates must seed “hardening considerations” earlier:

* Phase 2 README has a **Hardening Seeds** section:

  * security boundaries
  * reliability assumptions (idempotency, retries)
  * performance budgets (if relevant)
  * operational expectations

* Phase 4 ETR requires operational evidence for the non-negotiables.

Phase 6 then audits:

* which seeds were validated
* which were wrong
* what earlier gate/template must be improved (feeds Phase 7 deltas)

---

## 9) Phase 7 closes the loop (process deltas with an enforcement path)

Phase 7 must output **machine-readable process deltas**, not just prose.

Scaffold `process-deltas.yaml`:

```yaml
deltas:
  - type: template_change
    target: "02-spec/README.md"
    change: "Add section: Illegal state transitions"
    reason: "Phase 6 found missing edge cases late"
    evidence: "PR #123 / incident link"
  - type: gate_change
    target: "04-verification/gate.md"
    change: "Require at least one refutation test for each critical invariant"
    reason: "Oracle lacked negative cases"
```

Then:

* `edsc apply-deltas <feature-id>` can (semi-)apply these to `/process/edsc/templates/**` and open a PR (or just patch files locally, your call).
* At minimum, it should **validate** that deltas are actionable and point to real targets.

This prevents Phase 7 from becoming “retrospective without teeth.”

---

## 10) Agent onboarding between sessions (make it explicit)

Each phase README template must begin with:

* “What to read first” (Feature root README + current phase README)
* Pointers into `/docs/**` via `AGENTS.md`
* Current `phase.yaml` summary: mode, decisions, blockers

This makes “new agent session starts at Phase 3” workable without chat memory.

---

## 11) Scaffolding outputs (what Codex must generate)

Codex should:

1. Create `/process/edsc/**` kit (templates + prompts + scripts + references)
2. Create `/docs/index.md` and `AGENTS.md` (ToC style)
3. Create `/work/features/.gitkeep` (or equivalent)
4. Scaffold a demo feature:

   * `/work/features/F-YYYY-MM-demo/` generated from templates
   * Put a placeholder PRD file in `00-intake/appendix/PRD.md`
5. Add CI job calling `edsc check --all` (or one feature)

---

## 12) Acceptance criteria (Definition of Done for v0.1)

1. `edsc scaffold F-2026-02-demo` creates the full feature tree.
2. `edsc check F-2026-02-demo`:

   * validates required files
   * enforces one-page README heuristic
   * computes fingerprints + marks stale when deps change
   * enforces TTL
   * returns nonzero exit code on failures
3. Gate staleness works: editing Phase 1 README marks Phase 2+ stale.
4. Oracle separation exists as a scaffoldable template intended for separate repo use.
5. Phase 4 templates include **legibility harness** requirements (how to observe behavior).
6. Phase 7 produces structured deltas and there is at least a validator/applier script path.
7. `AGENTS.md` is a short map into `/docs/**`.

---

## 13) What Codex should do in order (implementation steps)

1. Scaffold `/process/edsc/` with templates for all phases.
2. Implement `edsc` CLI: scaffold/status/check/advance/invalidate.
3. Implement fingerprints + TTL and update `phase.yaml` deterministically.
4. Add CI job running `edsc check`.
5. Add `/docs/index.md` + `AGENTS.md` ToC.
6. Add `/oracle-repo-template/` + CI example doc.
7. Add prompts (conductor / oracle-validator / implementer) that reference the folder layout and role boundaries.
