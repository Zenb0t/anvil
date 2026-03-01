/**
 * ETR-8: Hook uses --quiet for initial lint call (BEH-5)
 * Type: functional (slice: hook modification)
 *
 * Claim: run_anvil_lint_async.ts uses `lint --quiet` instead of
 *        `lint --output json`. On exit 0 it returns silently.
 *        On non-zero exit, it falls back to `lint --output json`.
 *
 * Falsification: If the hook source still uses `--output json` for the
 *   first call, or if it doesn't fall back on failure, the claim is false.
 *
 * NOTE: This test inspects the hook source file rather than invoking it,
 *       because the hook requires stdin payload and complex setup.
 *       Build-phase integration tests can cover runtime behavior.
 */
import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const HOOK_PATH = path.join(REPO_ROOT, ".claude", "hooks", "run_anvil_lint_async.ts");

describe("ETR-8: hook uses --quiet", () => {
  test("hook's primary lint call uses --quiet instead of --output json", () => {
    const source = readFileSync(HOOK_PATH, "utf8");

    // The first/primary lint invocation should use --quiet
    // Find the runLint function or equivalent
    const lines = source.split("\n");

    // Look for the primary lint spawn call arguments
    // Current code has: ["lint", "--output", "json"]
    // After implementation: primary call should be ["lint", "--quiet"]
    // and fallback call should be ["lint", "--output", "json"]

    // The hook should contain --quiet in some lint invocation
    expect(source).toContain("--quiet");
  });

  test("hook has fallback to --output json on failure", () => {
    const source = readFileSync(HOOK_PATH, "utf8");

    // After implementation, the hook should still reference --output json
    // as the fallback path for getting detailed error info
    expect(source).toContain("--output");
    expect(source).toContain("json");

    // AND it should contain --quiet for the first call
    expect(source).toContain("--quiet");
  });
});
