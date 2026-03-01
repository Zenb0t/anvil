/**
 * ETR-6: -q is an exact alias for --quiet (INV-4)
 * Type: functional (slice: flag parsing)
 *
 * Claim: -q behaves identically to --quiet in all contexts.
 *        Both are recognized as valid flags (not treated as unknown args).
 *
 * Falsification: If -q produces different stdout, stderr, or exit code
 *   than --quiet for the same command, or if either produces a usage error,
 *   the claim is false.
 */
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const ANVIL = path.join(REPO_ROOT, "bin", "anvil");
const FEATURES_DIR = path.join(REPO_ROOT, "work", "features");
const FIXTURE_ID = "test-quiet-alias";
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
});

afterAll(() => {
  if (existsSync(FIXTURE_DIR)) {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  }
});

describe("ETR-6: -q is exact alias for --quiet", () => {
  test("check -q is recognized as a flag (no usage error)", () => {
    const result = anvil("check", FIXTURE_ID, "-q");
    expect(result.stderr).not.toContain("Usage:");
  });

  test("check --quiet is recognized as a flag (no usage error)", () => {
    const result = anvil("check", FIXTURE_ID, "--quiet");
    expect(result.stderr).not.toContain("Usage:");
  });

  test("check -q and check --quiet produce identical stdout", () => {
    const q = anvil("check", FIXTURE_ID, "-q");
    const quiet = anvil("check", FIXTURE_ID, "--quiet");
    expect(q.stdout).toBe(quiet.stdout);
  });

  test("check -q and check --quiet produce identical exit code", () => {
    const q = anvil("check", FIXTURE_ID, "-q");
    const quiet = anvil("check", FIXTURE_ID, "--quiet");
    expect(q.status).toBe(quiet.status);
  });

  test("status -q and status --quiet produce identical stdout", () => {
    const q = anvil("status", FIXTURE_ID, "-q");
    const quiet = anvil("status", FIXTURE_ID, "--quiet");
    expect(q.stdout).toBe(quiet.stdout);
  });

  test("lint -q and lint --quiet produce identical exit code", () => {
    const q = anvil("lint", FIXTURE_ID, "-q");
    const quiet = anvil("lint", FIXTURE_ID, "--quiet");
    expect(q.status).toBe(quiet.status);
  });
});
