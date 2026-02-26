const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PHASES = [
  "00-intake",
  "01-framing",
  "02-spec",
  "03-arch",
  "04-verification",
  "05-implementation",
  "06-hardening",
  "07-release-learning",
];

const VALID_STATUSES = new Set([
  "not_started",
  "in_progress",
  "pass",
  "fail",
  "stale",
]);

const MAX_README_LINES = 180;
const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const REPO_ROOT = process.env.EDSC_REPO_ROOT
  ? path.resolve(process.env.EDSC_REPO_ROOT)
  : DEFAULT_REPO_ROOT;
const TEMPLATE_ROOT = path.join(REPO_ROOT, "process", "edsc", "templates", "feature");
const WORK_FEATURES_ROOT = path.join(REPO_ROOT, "work", "features");

function normalizeEol(text) {
  return text.replace(/\r\n?/g, "\n");
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function parseScalar(raw) {
  const value = (raw || "").trim();
  if (value === "") {
    return "";
  }
  if (value === "null") {
    return null;
  }
  if (value === "[]") {
    return [];
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }
  return value;
}

function stringifyScalar(value) {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (value === "" || /[:#\[\]{}]/.test(value) || /\s/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  return JSON.stringify(value);
}

function parseTopLevelArray(lines, startIndex) {
  const out = [];
  let i = startIndex;
  let sawList = false;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^\s*-\s*(.*)$/);
    if (!match) {
      if (!line.trim() && sawList) {
        i += 1;
        continue;
      }
      break;
    }
    sawList = true;
    out.push(parseScalar(match[1]));
    i += 1;
  }
  return { values: out, nextIndex: i };
}

function parseInlineArray(raw) {
  const value = (raw || "").trim();
  if (!value.startsWith("[") || !value.endsWith("]")) {
    return null;
  }
  const inner = value.slice(1, -1).trim();
  if (!inner) {
    return [];
  }
  return inner.split(",").map((item) => parseScalar(item.trim()));
}

function resolveNow() {
  const forced = process.env.EDSC_NOW_ISO;
  if (!forced) {
    return new Date();
  }
  const date = new Date(forced);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid EDSC_NOW_ISO value; expected ISO-8601 timestamp");
  }
  return date;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, value, "utf8");
}

function parsePhaseYaml(text) {
  const lines = normalizeEol(text).split("\n");
  const state = {
    feature_id: "",
    mode: "complicated",
    current_phase: PHASES[0],
    phases: {},
    open_questions: [],
    decisions_needed: [],
    open_hypotheses: [],
    invalidations: [],
    _extra_top_level: [],
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line || !line.trim() || line.trim().startsWith("#")) {
      i += 1;
      continue;
    }

    let match = line.match(/^feature_id:\s*(.*)$/);
    if (match) {
      state.feature_id = String(parseScalar(match[1]));
      i += 1;
      continue;
    }

    match = line.match(/^mode:\s*(.*)$/);
    if (match) {
      state.mode = String(parseScalar(match[1]));
      i += 1;
      continue;
    }

    match = line.match(/^current_phase:\s*(.*)$/);
    if (match) {
      state.current_phase = String(parseScalar(match[1]));
      i += 1;
      continue;
    }

    if (/^phases:\s*$/.test(line)) {
      i += 1;
      while (i < lines.length) {
        const phaseLine = lines[i];
        const phaseMatch = phaseLine.match(/^  ([a-z0-9-]+):\s*$/i);
        if (!phaseMatch) {
          break;
        }

        const phase = phaseMatch[1];
        i += 1;
        const phaseState = {
          status: "not_started",
          last_verified_at: null,
          inputs_fingerprint: null,
        };

        while (i < lines.length) {
          const propLine = lines[i];
          const propMatch = propLine.match(/^    ([a-z_]+):\s*(.*)$/i);
          if (!propMatch) {
            break;
          }
          const key = propMatch[1];
          const value = parseScalar(propMatch[2]);
          phaseState[key] = value;
          i += 1;
        }

        state.phases[phase] = phaseState;
      }
      continue;
    }

    match = line.match(/^(open_questions|decisions_needed|open_hypotheses|invalidations):\s*(.*)$/);
    if (match) {
      const key = match[1];
      const inlineValue = (match[2] || "").trim();
      if (inlineValue === "[]") {
        state[key] = [];
        i += 1;
      } else if (inlineValue === "") {
        const parsed = parseTopLevelArray(lines, i + 1);
        state[key] = parsed.values;
        i = parsed.nextIndex;
      } else {
        const inlineArray = parseInlineArray(inlineValue);
        if (inlineArray !== null) {
          state[key] = inlineArray;
        } else {
          state[key] = [parseScalar(inlineValue)];
        }
        i += 1;
      }
      continue;
    }

    match = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (match) {
      const key = match[1];
      const inlineValue = (match[2] || "").trim();

      if (inlineValue === "[]") {
        state._extra_top_level.push({ key, type: "array", values: [] });
        i += 1;
      } else if (inlineValue === "") {
        const parsed = parseTopLevelArray(lines, i + 1);
        state._extra_top_level.push({ key, type: "array", values: parsed.values });
        i = parsed.nextIndex;
      } else {
        const inlineArray = parseInlineArray(inlineValue);
        if (inlineArray !== null) {
          state._extra_top_level.push({ key, type: "array", values: inlineArray });
        } else {
          state._extra_top_level.push({ key, type: "scalar", value: parseScalar(inlineValue) });
        }
        i += 1;
      }
      continue;
    }

    i += 1;
  }

  for (const phase of PHASES) {
    if (!state.phases[phase]) {
      state.phases[phase] = {
        status: "not_started",
        last_verified_at: null,
        inputs_fingerprint: null,
      };
    }

    const phaseState = state.phases[phase];
    if (!VALID_STATUSES.has(phaseState.status)) {
      phaseState.status = "not_started";
    }
    if (phaseState.last_verified_at === "null") {
      phaseState.last_verified_at = null;
    }
    if (phaseState.inputs_fingerprint === "null") {
      phaseState.inputs_fingerprint = null;
    }
  }

  if (!state.feature_id) {
    throw new Error("phase.yaml missing feature_id");
  }

  if (!PHASES.includes(state.current_phase)) {
    state.current_phase = PHASES[0];
  }

  if (!["complicated", "complex"].includes(state.mode)) {
    state.mode = "complicated";
  }

  return state;
}

function writeTopLevelArray(lines, key, values) {
  if (!values || values.length === 0) {
    lines.push(`${key}: []`);
    return;
  }
  lines.push(`${key}:`);
  for (const value of values) {
    lines.push(`  - ${stringifyScalar(value)}`);
  }
}

function stringifyPhaseYaml(state) {
  const lines = [];
  lines.push(`feature_id: ${state.feature_id}`);
  lines.push(`mode: ${state.mode}`);
  lines.push(`current_phase: ${state.current_phase}`);
  lines.push("");
  lines.push("phases:");

  for (const phase of PHASES) {
    const phaseState = state.phases[phase] || {};
    const status = VALID_STATUSES.has(phaseState.status) ? phaseState.status : "not_started";
    const lastVerified = phaseState.last_verified_at || null;
    const fingerprint = phaseState.inputs_fingerprint || null;

    lines.push(`  ${phase}:`);
    lines.push(`    status: ${status}`);
    lines.push(`    last_verified_at: ${stringifyScalar(lastVerified)}`);
    lines.push(`    inputs_fingerprint: ${stringifyScalar(fingerprint)}`);
    const knownPhaseKeys = new Set(["status", "last_verified_at", "inputs_fingerprint"]);
    const extraKeys = Object.keys(phaseState)
      .filter((key) => !knownPhaseKeys.has(key))
      .sort((a, b) => a.localeCompare(b));
    for (const key of extraKeys) {
      lines.push(`    ${key}: ${stringifyScalar(phaseState[key])}`);
    }
  }

  lines.push("");
  writeTopLevelArray(lines, "open_questions", state.open_questions || []);
  writeTopLevelArray(lines, "decisions_needed", state.decisions_needed || []);
  writeTopLevelArray(lines, "open_hypotheses", state.open_hypotheses || []);
  writeTopLevelArray(lines, "invalidations", state.invalidations || []);

  for (const extra of state._extra_top_level || []) {
    if (!extra || !extra.key) {
      continue;
    }
    if (extra.type === "array") {
      writeTopLevelArray(lines, extra.key, extra.values || []);
    } else {
      lines.push(`${extra.key}: ${stringifyScalar(extra.value)}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function parseGateFrontmatter(gateContent) {
  const content = normalizeEol(gateContent).replace(/^\uFEFF/, "");
  const headerMatch = content.match(/^(?:[ \t]*\n)*---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!headerMatch) {
    return {
      meta: null,
      error: "Missing YAML frontmatter in gate.md",
      body: content,
    };
  }

  const frontmatter = headerMatch[1];
  const body = content.slice(headerMatch[0].length);
  const lines = frontmatter.split("\n");
  const meta = {
    phase: null,
    depends_on: [],
    required_files: [],
    ttl_days: null,
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let match = line.match(/^phase:\s*(.*)$/);
    if (match) {
      meta.phase = String(parseScalar(match[1]));
      i += 1;
      continue;
    }

    match = line.match(/^ttl_days:\s*(.*)$/);
    if (match) {
      meta.ttl_days = Number(parseScalar(match[1]));
      i += 1;
      continue;
    }

    match = line.match(/^depends_on:\s*(.*)$/);
    if (match) {
      const inlineValue = (match[1] || "").trim();
      if (!inlineValue) {
        const parsed = parseTopLevelArray(lines, i + 1);
        meta.depends_on = parsed.values.map((v) => String(v));
        i = parsed.nextIndex;
        continue;
      }
      const inlineArray = parseInlineArray(inlineValue);
      if (inlineArray !== null) {
        meta.depends_on = inlineArray.map((v) => String(v));
      } else {
        meta.depends_on = [String(parseScalar(inlineValue))];
      }
      i += 1;
      continue;
    }

    match = line.match(/^required_files:\s*(.*)$/);
    if (match) {
      const inlineValue = (match[1] || "").trim();
      if (!inlineValue) {
        const parsed = parseTopLevelArray(lines, i + 1);
        meta.required_files = parsed.values.map((v) => String(v));
        i = parsed.nextIndex;
        continue;
      }
      const inlineArray = parseInlineArray(inlineValue);
      if (inlineArray !== null) {
        meta.required_files = inlineArray.map((v) => String(v));
      } else {
        meta.required_files = [String(parseScalar(inlineValue))];
      }
      i += 1;
      continue;
    }

    i += 1;
  }

  return { meta, error: null, body };
}

function getGateResult(gateContent) {
  const match = normalizeEol(gateContent).match(/^Result:\s*(PASS|FAIL)\s*$/m);
  return match ? match[1] : "FAIL";
}

function getNextActions(gateContent) {
  const lines = normalizeEol(gateContent).split("\n");
  const nextActions = [];

  let i = lines.findIndex((line) => /^Next actions:/i.test(line));
  if (i === -1) {
    return nextActions;
  }

  i += 1;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      break;
    }
    if (/^[A-Za-z ]+:/.test(line)) {
      break;
    }
    nextActions.push(line);
    i += 1;
  }

  return nextActions;
}

function hashPath(absPath) {
  const stat = fs.statSync(absPath);
  if (stat.isFile()) {
    return sha256(fs.readFileSync(absPath));
  }

  if (stat.isDirectory()) {
    const entries = fs.readdirSync(absPath).sort((a, b) => a.localeCompare(b));
    const hash = crypto.createHash("sha256");
    for (const entry of entries) {
      const child = path.join(absPath, entry);
      const childHash = hashPath(child);
      hash.update(`${entry}:${childHash}\n`);
    }
    return hash.digest("hex");
  }

  return sha256(Buffer.from(absPath));
}

function computeFingerprint(pathsToHash) {
  const hash = crypto.createHash("sha256");
  const sorted = [...pathsToHash].sort((a, b) => a.localeCompare(b));
  for (const absPath of sorted) {
    const rel = path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
    if (!fs.existsSync(absPath)) {
      hash.update(`${rel}:missing\n`);
      continue;
    }
    hash.update(`${rel}:${hashPath(absPath)}\n`);
  }
  return `sha256:${hash.digest("hex")}`;
}

function countLines(filePath) {
  const content = normalizeEol(readText(filePath));
  if (!content) {
    return 0;
  }
  return content.split("\n").length;
}

function featureDir(featureId) {
  return path.join(WORK_FEATURES_ROOT, featureId);
}

function phaseYamlPathFor(featureId) {
  return path.join(featureDir(featureId), "phase.yaml");
}

function loadState(featureId) {
  const phasePath = phaseYamlPathFor(featureId);
  if (!fs.existsSync(phasePath)) {
    throw new Error(`Feature '${featureId}' is missing phase.yaml`);
  }
  const text = readText(phasePath);
  return parsePhaseYaml(text);
}

function saveState(featureId, state) {
  const phasePath = phaseYamlPathFor(featureId);
  writeText(phasePath, stringifyPhaseYaml(state));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function replaceTokens(value, replacements) {
  let out = value;
  for (const [key, token] of Object.entries(replacements)) {
    out = out.split(key).join(token);
  }
  return out;
}

function copyTemplateDir(src, dest, replacements) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyTemplateDir(srcPath, destPath, replacements);
      continue;
    }

    const raw = fs.readFileSync(srcPath);
    let text;
    try {
      text = raw.toString("utf8");
    } catch {
      fs.writeFileSync(destPath, raw);
      continue;
    }

    const replaced = replaceTokens(text, replacements);
    fs.writeFileSync(destPath, replaced, "utf8");
  }
}

function scaffoldFeature(featureId, mode = "complicated") {
  if (!featureId || /[\\/]/.test(featureId)) {
    throw new Error("Feature id must be a single path segment");
  }

  if (!["complicated", "complex"].includes(mode)) {
    throw new Error("Mode must be 'complicated' or 'complex'");
  }

  if (!fs.existsSync(TEMPLATE_ROOT)) {
    throw new Error("Template root is missing: process/edsc/templates/feature");
  }

  const target = featureDir(featureId);
  if (fs.existsSync(target)) {
    throw new Error(`Feature already exists: ${target}`);
  }

  ensureDir(WORK_FEATURES_ROOT);
  copyTemplateDir(TEMPLATE_ROOT, target, {
    "{{FEATURE_ID}}": featureId,
    "{{MODE}}": mode,
    "{{CURRENT_PHASE}}": "00-intake",
  });

  return target;
}

function listFeatureIds() {
  if (!fs.existsSync(WORK_FEATURES_ROOT)) {
    return [];
  }

  return fs
    .readdirSync(WORK_FEATURES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(WORK_FEATURES_ROOT, name, "phase.yaml")))
    .sort((a, b) => a.localeCompare(b));
}

function phaseBlocker(status) {
  return status === "stale" || status === "fail";
}

function checkFeature(featureId, options = {}) {
  const { write = true } = options;
  const state = loadState(featureId);
  const now = resolveNow();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const report = {
    featureId,
    mode: state.mode,
    currentPhase: state.current_phase,
    phaseResults: [],
    hasFailures: false,
  };

  for (const phase of PHASES) {
    const result = {
      phase,
      errors: [],
      staleReasons: [],
      gateResult: "FAIL",
      statusBefore: state.phases[phase]?.status || "not_started",
      statusAfter: state.phases[phase]?.status || "not_started",
      nextActions: [],
      readmeLines: 0,
    };

    const phaseDirPath = path.join(featureDir(featureId), phase);
    const readmePath = path.join(phaseDirPath, "README.md");
    const gatePath = path.join(phaseDirPath, "gate.md");

    if (!fs.existsSync(phaseDirPath) || !fs.statSync(phaseDirPath).isDirectory()) {
      result.errors.push(`Missing phase directory: ${phase}`);
      state.phases[phase].status = "fail";
      result.statusAfter = "fail";
      report.phaseResults.push(result);
      continue;
    }

    if (!fs.existsSync(readmePath)) {
      result.errors.push("Missing README.md");
    } else {
      result.readmeLines = countLines(readmePath);
      if (result.readmeLines > MAX_README_LINES) {
        result.errors.push(`README.md too long (${result.readmeLines} lines; max ${MAX_README_LINES})`);
      }
    }

    if (!fs.existsSync(gatePath)) {
      result.errors.push("Missing gate.md");
      state.phases[phase].status = "fail";
      result.statusAfter = "fail";
      report.phaseResults.push(result);
      continue;
    }

    const gateContent = readText(gatePath);
    const parsedGate = parseGateFrontmatter(gateContent);
    if (parsedGate.error) {
      result.errors.push(parsedGate.error);
      state.phases[phase].status = "fail";
      result.statusAfter = "fail";
      report.phaseResults.push(result);
      continue;
    }

    const meta = parsedGate.meta;

    if (meta.phase !== phase) {
      result.errors.push(`gate.md phase mismatch: expected '${phase}', got '${meta.phase || "<missing>"}'`);
    }

    if (!Number.isInteger(meta.ttl_days) || meta.ttl_days <= 0) {
      result.errors.push("gate.md ttl_days must be a positive integer");
    }

    for (const required of meta.required_files) {
      const absRequired = path.resolve(phaseDirPath, required);
      if (!fs.existsSync(absRequired)) {
        result.errors.push(`Missing required file: ${required}`);
      }
    }

    const depPaths = [];
    for (const dep of meta.depends_on) {
      const depAbs = path.resolve(phaseDirPath, dep);
      depPaths.push(depAbs);
      if (!fs.existsSync(depAbs)) {
        result.errors.push(`Missing dependency: ${dep}`);
      }
    }

    const phaseState = state.phases[phase];
    const currentFingerprint = computeFingerprint(depPaths);
    const previousFingerprint = phaseState.inputs_fingerprint || null;
    result.gateResult = getGateResult(gateContent);
    result.nextActions = getNextActions(gateContent);
    const isActivePhase = phaseState.status !== "not_started";
    if (result.gateResult !== "PASS" && isActivePhase) {
      result.errors.push("Gate result is FAIL for an active phase");
    }
    const structuralPass = result.errors.length === 0 && result.gateResult === "PASS";
    const canRecoverStale = phaseState.status === "stale" && structuralPass;

    if (previousFingerprint && previousFingerprint !== currentFingerprint && !canRecoverStale) {
      result.staleReasons.push("Dependency fingerprint changed");
    }

    if (
      phaseState.last_verified_at &&
      Number.isInteger(meta.ttl_days) &&
      meta.ttl_days > 0 &&
      !canRecoverStale
    ) {
        const lastVerifiedMs = Date.parse(phaseState.last_verified_at);
        if (!Number.isNaN(lastVerifiedMs)) {
        const ageMs = nowMs - lastVerifiedMs;
        const ttlMs = meta.ttl_days * 24 * 60 * 60 * 1000;
        if (ageMs > ttlMs) {
          result.staleReasons.push(`TTL expired (${meta.ttl_days} days)`);
        }
      }
    }

    let newStatus = phaseState.status;

    if (result.staleReasons.length > 0) {
      newStatus = "stale";
    } else if (structuralPass) {
      newStatus = "pass";
      phaseState.inputs_fingerprint = currentFingerprint;
      phaseState.last_verified_at = nowIso;
    } else {
      if (phaseState.status === "stale") {
        newStatus = "stale";
      } else if (isActivePhase) {
        newStatus = "fail";
      } else {
        newStatus = "not_started";
      }
    }

    phaseState.status = newStatus;
    result.statusAfter = newStatus;

    report.phaseResults.push(result);
  }

  // downstream phases cannot stay pass if an upstream phase is stale/fail
  for (let i = 0; i < PHASES.length; i += 1) {
    const upstream = PHASES[i];
    const upstreamState = state.phases[upstream];
    if (!phaseBlocker(upstreamState.status)) {
      continue;
    }

    for (let j = i + 1; j < PHASES.length; j += 1) {
      const downstream = PHASES[j];
      const downstreamState = state.phases[downstream];
      if (downstreamState.status === "pass") {
        downstreamState.status = "stale";
        const downstreamResult = report.phaseResults.find((r) => r.phase === downstream);
        if (downstreamResult) {
          downstreamResult.statusAfter = "stale";
          downstreamResult.staleReasons.push(`Upstream phase ${upstream} is ${upstreamState.status}`);
        }
      }
    }
  }

  report.hasFailures = report.phaseResults.some(
    (r) => r.errors.length > 0 || r.statusAfter === "stale" || r.statusAfter === "fail"
  );

  if (write) {
    saveState(featureId, state);
  }

  return report;
}

function formatCheckReport(report) {
  const lines = [];
  lines.push(`Feature: ${report.featureId}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push(`Current phase: ${report.currentPhase}`);
  lines.push("");

  for (const result of report.phaseResults) {
    lines.push(`${result.phase}: ${result.statusAfter} (gate=${result.gateResult}, readme_lines=${result.readmeLines})`);

    for (const err of result.errors) {
      lines.push(`  ERROR: ${err}`);
    }

    for (const stale of result.staleReasons) {
      lines.push(`  STALE: ${stale}`);
    }

    if (result.nextActions.length > 0) {
      for (const action of result.nextActions) {
        lines.push(`  NEXT: ${action}`);
      }
    }
  }

  lines.push("");
  lines.push(report.hasFailures ? "Result: FAIL" : "Result: PASS");
  return `${lines.join("\n")}\n`;
}

function statusFeature(featureId) {
  const state = loadState(featureId);
  const blockers = [];
  const nextActions = [];

  for (const phase of PHASES) {
    const phaseState = state.phases[phase];
    if (phaseBlocker(phaseState.status)) {
      blockers.push(`${phase}=${phaseState.status}`);
    }

    const gatePath = path.join(featureDir(featureId), phase, "gate.md");
    if (fs.existsSync(gatePath)) {
      const actions = getNextActions(readText(gatePath));
      for (const action of actions) {
        nextActions.push(`${phase}: ${action}`);
      }
    }
  }

  return {
    featureId,
    mode: state.mode,
    currentPhase: state.current_phase,
    phases: PHASES.map((phase) => ({ phase, status: state.phases[phase].status })),
    blockers,
    nextActions,
  };
}

function formatStatusReport(status) {
  const lines = [];
  lines.push(`Feature: ${status.featureId}`);
  lines.push(`Mode: ${status.mode}`);
  lines.push(`Current phase: ${status.currentPhase}`);
  lines.push("");
  lines.push("Phases:");

  for (const p of status.phases) {
    lines.push(`- ${p.phase}: ${p.status}`);
  }

  lines.push("");
  lines.push("Blockers:");
  if (status.blockers.length === 0) {
    lines.push("- none");
  } else {
    for (const blocker of status.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  lines.push("");
  lines.push("Next actions:");
  if (status.nextActions.length === 0) {
    lines.push("- none");
  } else {
    for (const action of status.nextActions) {
      lines.push(`- ${action}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function advanceFeature(featureId, targetPhase) {
  if (!PHASES.includes(targetPhase)) {
    throw new Error(`Unknown target phase: ${targetPhase}`);
  }

  const report = checkFeature(featureId, { write: true });
  if (report.hasFailures) {
    throw new Error(`Cannot advance '${featureId}' while check report has failures`);
  }

  const state = loadState(featureId);
  const current = state.current_phase;
  const currentIndex = PHASES.indexOf(current);
  const targetIndex = PHASES.indexOf(targetPhase);

  if (targetIndex !== currentIndex + 1) {
    throw new Error(`Advance must move to next sequential phase: expected '${PHASES[currentIndex + 1] || "<none>"}'`);
  }

  const currentStatus = state.phases[current].status;
  if (currentStatus !== "pass") {
    throw new Error(`Current phase '${current}' is '${currentStatus}', must be 'pass' to advance`);
  }

  state.current_phase = targetPhase;
  if (state.phases[targetPhase].status === "not_started") {
    state.phases[targetPhase].status = "in_progress";
  }

  saveState(featureId, state);
  return state;
}

function invalidateFeature(featureId, phase, reason) {
  if (!PHASES.includes(phase)) {
    throw new Error(`Unknown phase: ${phase}`);
  }

  if (!reason || !reason.trim()) {
    throw new Error("Reason is required");
  }

  const state = loadState(featureId);
  state.phases[phase].status = "stale";

  if (!Array.isArray(state.invalidations)) {
    state.invalidations = [];
  }

  const stamp = resolveNow().toISOString();
  state.invalidations.push(`${stamp} | ${phase} | ${reason.trim()}`);

  const phaseIndex = PHASES.indexOf(phase);
  for (let i = phaseIndex + 1; i < PHASES.length; i += 1) {
    if (state.phases[PHASES[i]].status === "pass") {
      state.phases[PHASES[i]].status = "stale";
    }
  }

  saveState(featureId, state);
  return state;
}

function parseDeltasYaml(text) {
  const lines = normalizeEol(text).split("\n");
  const deltas = [];
  let inDeltas = false;
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "    ");

    if (!inDeltas) {
      if (/^deltas:\s*$/.test(line.trim())) {
        inDeltas = true;
      }
      continue;
    }

    const startMatch = line.match(/^\s*-\s+([a-z_]+):\s*(.*)$/i);
    if (startMatch) {
      if (current) {
        deltas.push(current);
      }
      current = {};
      current[startMatch[1]] = parseScalar(startMatch[2]);
      continue;
    }

    const fieldMatch = line.match(/^\s+([a-z_]+):\s*(.*)$/i);
    if (fieldMatch && current) {
      current[fieldMatch[1]] = parseScalar(fieldMatch[2]);
      continue;
    }

    if (!line.trim() && current) {
      continue;
    }
  }

  if (current) {
    deltas.push(current);
  }

  return deltas;
}

function applyDeltaToTarget(targetPath, delta) {
  const marker = `edsc-delta:${sha256(JSON.stringify(delta)).slice(0, 12)}`;
  const ext = path.extname(targetPath).toLowerCase();
  const content = readText(targetPath);
  if (content.includes(marker)) {
    return { applied: false, marker };
  }

  let patch = "";
  if (ext === ".md") {
    patch = `\n\n<!-- ${marker} -->\n## Delta Applied (auto)\n- type: ${delta.type}\n- change: ${delta.change}\n- reason: ${delta.reason}\n- evidence: ${delta.evidence || "n/a"}\n`;
  } else {
    patch = `\n# ${marker}\n# delta type: ${delta.type}\n# change: ${delta.change}\n# reason: ${delta.reason}\n# evidence: ${delta.evidence || "n/a"}\n`;
  }

  writeText(targetPath, `${content.replace(/\s*$/, "")}\n${patch}`);
  return { applied: true, marker };
}

function applyDeltas(featureId) {
  const deltasPath = path.join(featureDir(featureId), "07-release-learning", "process-deltas.yaml");
  if (!fs.existsSync(deltasPath)) {
    throw new Error("Missing process-deltas.yaml in 07-release-learning");
  }

  const deltas = parseDeltasYaml(readText(deltasPath));
  if (deltas.length === 0) {
    throw new Error("No deltas found in process-deltas.yaml");
  }

  const summary = {
    validated: 0,
    applied: 0,
    skipped: 0,
    errors: [],
  };
  const validatedDeltas = [];

  for (const delta of deltas) {
    const required = ["type", "target", "change", "reason"];
    const missing = required.filter((key) => !delta[key]);
    if (missing.length > 0) {
      summary.errors.push(`Delta missing fields: ${missing.join(", ")}`);
      continue;
    }

    const target = String(delta.target);
    const absTarget = path.resolve(TEMPLATE_ROOT, target);
    const relCheck = path.relative(TEMPLATE_ROOT, absTarget).replace(/\\/g, "/");
    if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
      summary.errors.push(`Delta target escapes templates root: ${target}`);
      continue;
    }

    if (!fs.existsSync(absTarget)) {
      summary.errors.push(`Delta target not found: ${target}`);
      continue;
    }

    validatedDeltas.push({ absTarget, delta });
  }
  summary.validated = validatedDeltas.length;

  if (summary.errors.length > 0) {
    const error = new Error("Delta validation failed");
    error.summary = summary;
    throw error;
  }

  for (const item of validatedDeltas) {
    const applied = applyDeltaToTarget(item.absTarget, item.delta);
    if (applied.applied) {
      summary.applied += 1;
    } else {
      summary.skipped += 1;
    }
  }

  return summary;
}

function checkAllFeatures() {
  const ids = listFeatureIds();
  return ids.map((id) => checkFeature(id, { write: true }));
}

module.exports = {
  PHASES,
  REPO_ROOT,
  TEMPLATE_ROOT,
  WORK_FEATURES_ROOT,
  scaffoldFeature,
  listFeatureIds,
  checkFeature,
  checkAllFeatures,
  formatCheckReport,
  statusFeature,
  formatStatusReport,
  advanceFeature,
  invalidateFeature,
  applyDeltas,
};
