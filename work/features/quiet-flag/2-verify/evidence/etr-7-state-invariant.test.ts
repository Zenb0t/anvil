/**
 * ETR-7: --quiet does not modify state.yaml differently (INV-3)
 * Type: cross-cutting (post-slices)
 *
 * Claim: --quiet is output-only; state.yaml changes are identical
 *        whether --quiet is present or not.
 *
 * Falsification: If state.yaml differs after check --quiet vs check
 *   for the same feature, the claim is false.
 */
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "../../../../..");
const ANVIL = path.join(REPO_ROOT, "bin", "anvil");
const FEATURES_DIR = path.join(REPO_ROOT, "work", "features");
const FIXTURE_ID = "test-quiet-state";
const FIXTURE_DIR = path.join(FEATURES_DIR, FIXTURE_ID);

function anvil(...args: string[]) {
  return spawnSync("bun", [ANVIL, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
}

function readState(): string {
  return readFileSync(path.join(FIXTURE_DIR, "state.yaml"), "utf8");
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

describe("ETR-7: --quiet does not alter state.yaml", () => {
  test("check --quiet produces same state.yaml as check", () => {
    // Run normal check first to establish baseline state
    anvil("check", FIXTURE_ID);
    const stateAfterNormal = readState();

    // Run quiet check
    anvil("check", FIXTURE_ID, "--quiet");
    const stateAfterQuiet = readState();

    expect(stateAfterQuiet).toBe(stateAfterNormal);
  });

  test("status --quiet does not modify state.yaml", () => {
    const stateBefore = readState();
    anvil("status", FIXTURE_ID, "--quiet");
    const stateAfter = readState();
    expect(stateAfter).toBe(stateBefore);
  });
});
