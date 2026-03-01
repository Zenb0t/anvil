/**
 * ETR-3: Mutual exclusion with --output (BEH-3)
 * Type: functional (slice: flag validation)
 *
 * Claim: If both --quiet and --output are specified, the CLI exits 1 and
 *        prints "ERROR: --quiet and --output are mutually exclusive" to stderr.
 *
 * Falsification: If the command succeeds, or the error message differs,
 *   or the error goes to stdout instead of stderr, the claim is false.
 */
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const ANVIL = path.join(REPO_ROOT, "bin", "anvil");
const FEATURES_DIR = path.join(REPO_ROOT, "work", "features");
const FIXTURE_ID = "test-quiet-mutex";
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

describe("ETR-3: --quiet and --output mutual exclusion", () => {
  test("check --quiet --output json exits 1", () => {
    const result = anvil("check", FIXTURE_ID, "--quiet", "--output", "json");
    expect(result.status).toBe(1);
  });

  test("check --quiet --output json prints error to stderr", () => {
    const result = anvil("check", FIXTURE_ID, "--quiet", "--output", "json");
    expect(result.stderr).toContain("--quiet and --output are mutually exclusive");
  });

  test("check --quiet --output json produces no stdout", () => {
    const result = anvil("check", FIXTURE_ID, "--quiet", "--output", "json");
    expect(result.stdout).toBe("");
  });

  test("check -q --output text exits 1", () => {
    const result = anvil("check", FIXTURE_ID, "-q", "--output", "text");
    expect(result.status).toBe(1);
  });

  test("status --quiet --output json exits 1 with error", () => {
    const result = anvil("status", FIXTURE_ID, "--quiet", "--output", "json");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--quiet and --output are mutually exclusive");
  });

  test("lint --quiet --output json exits 1 with error", () => {
    const result = anvil("lint", "--quiet", "--output", "json");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--quiet and --output are mutually exclusive");
  });
});
