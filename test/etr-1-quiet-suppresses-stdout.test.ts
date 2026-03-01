/**
 * ETR-1: --quiet suppresses all stdout (BEH-1, INV-1)
 * Type: functional (slice: flag parsing + output suppression)
 *
 * Claim: When --quiet or -q is passed to check, status, or lint,
 *        the command writes zero bytes to stdout. The flag is recognized
 *        (no usage error on stderr).
 *
 * Falsification: If any byte appears on stdout, or the CLI rejects
 *   --quiet as an unknown flag, the claim is false.
 */
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const ANVIL = path.join(REPO_ROOT, "bin", "anvil");
const FEATURES_DIR = path.join(REPO_ROOT, "work", "features");
const FIXTURE_ID = "test-quiet-fixture";
const FIXTURE_DIR = path.join(FEATURES_DIR, FIXTURE_ID);

function anvil(...args: string[]) {
  return spawnSync("bun", [ANVIL, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
}

beforeAll(() => {
  const init = anvil("init", FIXTURE_ID);
  if (init.status !== 0 && !existsSync(FIXTURE_DIR)) {
    throw new Error(`Failed to init fixture: ${init.stderr}`);
  }
  // Mark 0-define gate as PASS so check produces a known state
  const defineGate = path.join(FIXTURE_DIR, "0-define", "gate.md");
  writeFileSync(
    defineGate,
    `---
phase: 0-define
needs: []
produces: [problem.md]
---
# Gate: Define

- [x] Problem statement written
- [x] Success criteria are measurable and falsifiable
- [x] Scope is bounded

Status: PASS
Rationale: Test fixture with \`placeholder\` reference.
`,
  );
});

afterAll(() => {
  if (existsSync(FIXTURE_DIR)) {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  }
});

describe("ETR-1: --quiet suppresses stdout", () => {
  test("check --quiet produces zero stdout bytes and no usage error", () => {
    const result = anvil("check", FIXTURE_ID, "--quiet");
    expect(result.stdout).toBe("");
    // Must not be a usage error — --quiet must be a recognized flag
    expect(result.stderr).not.toContain("Usage:");
  });

  test("check -q produces zero stdout bytes and no usage error", () => {
    const result = anvil("check", FIXTURE_ID, "-q");
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("Usage:");
  });

  test("status --quiet produces zero stdout bytes and no usage error", () => {
    const result = anvil("status", FIXTURE_ID, "--quiet");
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("Usage:");
  });

  test("status -q produces zero stdout bytes and no usage error", () => {
    const result = anvil("status", FIXTURE_ID, "-q");
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("Usage:");
  });

  test("lint --quiet produces zero stdout bytes and no usage error", () => {
    const result = anvil("lint", FIXTURE_ID, "--quiet");
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("Usage:");
  });

  test("lint -q produces zero stdout bytes and no usage error", () => {
    const result = anvil("lint", FIXTURE_ID, "-q");
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("Usage:");
  });
});
