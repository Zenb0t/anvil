/**
 * ETR-9: -q cannot be injected as a feature ID (Hardening: Security)
 * Type: cross-cutting (security)
 *
 * Claim: assertValidFeatureId rejects -q as a feature ID. The flag
 *        cannot be confused with a positional argument.
 *
 * Falsification: If `anvil check -q` tries to look up a feature named
 *   "-q" instead of treating it as a flag, the claim is false.
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

describe("ETR-9: -q is not treated as feature ID", () => {
  test("anvil check -q does not error with 'feature -q not found'", () => {
    const result = anvil("check", "-q");
    // If -q is parsed as a flag, the error (if any) should be about
    // missing feature ID, not about "-q" being an invalid/missing feature
    const combined = `${result.stdout}${result.stderr}`;
    expect(combined).not.toContain("feature -q not found");
    expect(combined).not.toContain("Feature -q not found");
  });

  test("anvil status -q does not treat -q as feature ID", () => {
    const result = anvil("status", "-q");
    const combined = `${result.stdout}${result.stderr}`;
    expect(combined).not.toContain("feature -q not found");
    expect(combined).not.toContain("Feature -q not found");
  });
});
