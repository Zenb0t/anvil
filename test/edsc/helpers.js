"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SOURCE_REPO_ROOT = path.resolve(__dirname, "..", "..");

function copyIntoFixture(repoRoot, relativePath) {
  const source = path.join(SOURCE_REPO_ROOT, relativePath);
  const target = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function createRepoFixture(t, prefix = "edsc-fixture-") {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  copyIntoFixture(repoRoot, path.join("process", "edsc", "scripts"));
  copyIntoFixture(repoRoot, path.join("process", "edsc", "templates", "feature"));
  fs.mkdirSync(path.join(repoRoot, "work", "features"), { recursive: true });

  if (t && typeof t.after === "function") {
    t.after(() => {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    });
  }

  return {
    repoRoot,
    cliPath: path.join(repoRoot, "process", "edsc", "scripts", "edsc.js"),
  };
}

function runEdsc(fixture, args, extraEnv = {}) {
  return spawnSync(process.execPath, [fixture.cliPath, ...args], {
    cwd: fixture.repoRoot,
    env: {
      ...process.env,
      EDSC_REPO_ROOT: fixture.repoRoot,
      ...extraEnv,
    },
    encoding: "utf8",
  });
}

function assertOk(result, message) {
  assert.equal(
    result.status,
    0,
    `${message}\nexit=${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

function editFile(filePath, editFn) {
  const original = fs.readFileSync(filePath, "utf8");
  const updated = editFn(original);
  fs.writeFileSync(filePath, updated, "utf8");
}

function setGateResult(fixture, featureId, phase, result) {
  const gatePath = path.join(fixture.repoRoot, "work", "features", featureId, phase, "gate.md");
  const before = fs.readFileSync(gatePath, "utf8");
  const after = before.replace(/^Result:\s*(PASS|FAIL)\s*$/m, `Result: ${result}`);
  assert.notEqual(after, before, `Could not set gate result in ${gatePath}`);
  fs.writeFileSync(gatePath, after, "utf8");
}

function featurePath(fixture, featureId, ...parts) {
  return path.join(fixture.repoRoot, "work", "features", featureId, ...parts);
}

function readPhaseYaml(fixture, featureId) {
  return fs.readFileSync(featurePath(fixture, featureId, "phase.yaml"), "utf8");
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPhaseStatus(phaseYaml, phase) {
  const pattern = new RegExp(`\\n  ${escapeForRegex(phase)}:\\n    status:\\s*([^\\n]+)`);
  const match = phaseYaml.match(pattern);
  return match ? match[1].trim() : null;
}

module.exports = {
  assertOk,
  createRepoFixture,
  editFile,
  featurePath,
  getPhaseStatus,
  readPhaseYaml,
  runEdsc,
  setGateResult,
};
