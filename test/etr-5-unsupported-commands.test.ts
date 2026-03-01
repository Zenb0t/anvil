/**
 * ETR-5: --quiet on unsupported commands (spec: Illegal state transitions)
 * Type: functional (slice: flag validation)
 *
 * Claim: --quiet on list, init, advance, reset produces an error
 *        specifically about --quiet not being supported, exits 1.
 *
 * Falsification: If any unsupported command silently accepts --quiet
 *   (exits 0), or errors for wrong reason (generic usage error instead
 *   of --quiet-specific rejection), the claim is false.
 */
import { describe, test, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const ANVIL = path.join(REPO_ROOT, "bin", "anvil");

function anvil(...args: string[]) {
  return spawnSync("bun", [ANVIL, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
}

describe("ETR-5: --quiet rejected on unsupported commands", () => {
  test("list --quiet exits 1 with --quiet-specific error", () => {
    const result = anvil("list", "--quiet");
    expect(result.status).toBe(1);
    // Error must mention --quiet specifically, not just be a generic usage error
    expect(result.stderr).toMatch(/--quiet|quiet/i);
  });

  test("init --quiet exits 1 with --quiet-specific error", () => {
    const result = anvil("init", "dummy-id", "--quiet");
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/--quiet|quiet/i);
  });

  test("advance --quiet exits 1 with --quiet-specific error", () => {
    const result = anvil("advance", "dummy-id", "--quiet");
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/--quiet|quiet/i);
  });

  test("reset --quiet exits 1 with --quiet-specific error", () => {
    const result = anvil("reset", "dummy-id", "--quiet");
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/--quiet|quiet/i);
  });
});
