/**
 * ETR-4: Commands without --quiet are unchanged (BEH-4)
 * Type: cross-cutting (regression guard)
 *
 * Claim: When --quiet is absent, all existing behavior is preserved.
 *
 * Falsification: If adding --quiet support changes the output or exit code
 *   of commands that don't use --quiet, the claim is false.
 */
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "../../../../..");
const ANVIL = path.join(REPO_ROOT, "bin", "anvil");
const FEATURES_DIR = path.join(REPO_ROOT, "work", "features");
const FIXTURE_ID = "test-quiet-unchanged";
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

describe("ETR-4: behavior without --quiet is unchanged", () => {
  test("check without --quiet still produces stdout", () => {
    const result = anvil("check", FIXTURE_ID);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  test("check --output json without --quiet returns valid JSON", () => {
    const result = anvil("check", FIXTURE_ID, "--output", "json");
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.command).toBe("check");
    expect(parsed.feature).toBe(FIXTURE_ID);
  });

  test("status without --quiet still produces stdout", () => {
    const result = anvil("status", FIXTURE_ID);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  test("lint without --quiet still produces stdout", () => {
    const result = anvil("lint", FIXTURE_ID, "--output", "json");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.command).toBe("lint");
  });
});
