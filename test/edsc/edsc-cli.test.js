"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  assertOk,
  createRepoFixture,
  editFile,
  featurePath,
  getPhaseStatus,
  readPhaseYaml,
  runEdsc,
  setGateResult,
} = require("./helpers");

function scaffoldFixtureFeature(fixture, featureId) {
  const result = runEdsc(fixture, ["scaffold", featureId]);
  assertOk(result, `scaffold should succeed for ${featureId}`);
}

test("scaffold succeeds and rejects duplicate + invalid feature ids", (t) => {
  const fixture = createRepoFixture(t);
  const featureId = "F-2026-02-test-scaffold";

  scaffoldFixtureFeature(fixture, featureId);

  assert.ok(fs.existsSync(featurePath(fixture, featureId, "phase.yaml")));

  const duplicate = runEdsc(fixture, ["scaffold", featureId]);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /Feature already exists/i);

  const invalid = runEdsc(fixture, ["scaffold", "bad/id"]);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /single path segment/i);
});

test("check exits non-zero when active gate result is FAIL", (t) => {
  const fixture = createRepoFixture(t);
  const featureId = "F-2026-02-test-check-fail";
  scaffoldFixtureFeature(fixture, featureId);

  const check = runEdsc(fixture, ["check", featureId]);
  assert.equal(check.status, 1);
  assert.match(check.stdout, /Gate result is FAIL for an active phase/i);
  assert.match(check.stdout, /Result: FAIL/i);
});

test("dependency edit marks dependent phases stale and propagates stale downstream", (t) => {
  const fixture = createRepoFixture(t);
  const featureId = "F-2026-02-test-stale-propagation";
  scaffoldFixtureFeature(fixture, featureId);

  setGateResult(fixture, featureId, "00-intake", "PASS");
  setGateResult(fixture, featureId, "01-framing", "PASS");
  setGateResult(fixture, featureId, "02-spec", "PASS");

  const firstCheck = runEdsc(fixture, ["check", featureId]);
  assertOk(firstCheck, "initial check should pass with first three gates PASS");

  editFile(featurePath(fixture, featureId, "00-intake", "README.md"), (text) => `${text}\nDependency change\n`);

  const secondCheck = runEdsc(fixture, ["check", featureId]);
  assert.equal(secondCheck.status, 1);
  assert.match(secondCheck.stdout, /Dependency fingerprint changed/i);
  assert.match(secondCheck.stdout, /Upstream phase 01-framing is stale/i);

  const phaseYaml = readPhaseYaml(fixture, featureId);
  assert.equal(getPhaseStatus(phaseYaml, "01-framing"), "stale");
  assert.equal(getPhaseStatus(phaseYaml, "02-spec"), "stale");
});

test("advance is blocked when current phase is not pass", (t) => {
  const fixture = createRepoFixture(t);
  const featureId = "F-2026-02-test-advance-blocked";
  scaffoldFixtureFeature(fixture, featureId);

  const advance = runEdsc(fixture, ["advance", featureId, "--to", "01-framing"]);
  assert.equal(advance.status, 1);
  assert.match(
    advance.stderr,
    /(must be 'pass' to advance|while check report has failures)/i
  );
});

test("invalidate marks phase stale and records reason", (t) => {
  const fixture = createRepoFixture(t);
  const featureId = "F-2026-02-test-invalidate";
  scaffoldFixtureFeature(fixture, featureId);

  setGateResult(fixture, featureId, "00-intake", "PASS");
  const checked = runEdsc(fixture, ["check", featureId]);
  assertOk(checked, "check should pass before invalidation");

  const reason = "oracle mismatch";
  const invalidate = runEdsc(fixture, [
    "invalidate",
    featureId,
    "--phase",
    "00-intake",
    "--reason",
    reason,
  ]);
  assertOk(invalidate, "invalidate should succeed");

  const phaseYaml = readPhaseYaml(fixture, featureId);
  assert.equal(getPhaseStatus(phaseYaml, "00-intake"), "stale");
  assert.match(phaseYaml, /\| 00-intake \| oracle mismatch/);
});

test("apply-deltas validates targets and fails on invalid target paths", (t) => {
  const fixture = createRepoFixture(t);
  const featureId = "F-2026-02-test-apply-deltas-invalid";
  scaffoldFixtureFeature(fixture, featureId);

  const deltasPath = featurePath(fixture, featureId, "07-release-learning", "process-deltas.yaml");
  const invalidDeltas = [
    "deltas:",
    "  - type: template_change",
    '    target: "../../outside.md"',
    '    change: "escape root"',
    '    reason: "invalid path"',
    "  - type: gate_change",
    '    target: "missing-template-file.md"',
    '    change: "missing file"',
    '    reason: "invalid target"',
    "",
  ].join("\n");
  fs.writeFileSync(deltasPath, invalidDeltas, "utf8");

  const apply = runEdsc(fixture, ["apply-deltas", featureId]);
  assert.equal(apply.status, 1);
  assert.match(apply.stderr, /Delta validation failed/i);
  assert.match(apply.stderr, /escapes templates root/i);
  assert.match(apply.stderr, /target not found/i);
});

test("apply-deltas is idempotent on repeated runs", (t) => {
  const fixture = createRepoFixture(t);
  const featureId = "F-2026-02-test-apply-deltas-idempotent";
  scaffoldFixtureFeature(fixture, featureId);

  const first = runEdsc(fixture, ["apply-deltas", featureId]);
  assertOk(first, "first apply-deltas run should succeed");
  assert.match(first.stdout, /Validated deltas: 2/);
  assert.match(first.stdout, /Applied deltas: 2/);
  assert.match(first.stdout, /Skipped deltas: 0/);

  const second = runEdsc(fixture, ["apply-deltas", featureId]);
  assertOk(second, "second apply-deltas run should succeed");
  assert.match(second.stdout, /Validated deltas: 2/);
  assert.match(second.stdout, /Applied deltas: 0/);
  assert.match(second.stdout, /Skipped deltas: 2/);

  const targetPath = path.join(
    fixture.repoRoot,
    "process",
    "edsc",
    "templates",
    "feature",
    "02-spec",
    "README.md"
  );
  const targetContent = fs.readFileSync(targetPath, "utf8");
  const markerCount = (targetContent.match(/edsc-delta:/g) || []).length;
  assert.equal(markerCount, 1);
});
