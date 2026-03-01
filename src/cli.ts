import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

type Phase = "0-define" | "1-spec" | "2-verify" | "3-build" | "4-ship";
type GateStatus = "PASS" | "FAIL" | "PENDING";
type OutputMode = "text" | "json" | "auto";
type LintScope = "gates" | "templates" | "docs" | "all";
type StateStatus = "pass" | "pending" | "fail" | "dirty" | "stale" | "in_progress";

const PHASES: Phase[] = ["0-define", "1-spec", "2-verify", "3-build", "4-ship"];

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SRC_DIR, "..");
const TEMPLATE_DIR = path.join(REPO_ROOT, "process", "anvil", "templates", "feature");
const FEATURES_DIR = process.env.FEATURES_DIR
  ? path.resolve(process.env.FEATURES_DIR)
  : path.join(REPO_ROOT, "work", "features");

class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

interface ParsedMarkdown {
  readonly text: string;
  readonly body: string;
  readonly hasFrontmatter: boolean;
  readonly frontmatter: Record<string, unknown> | null;
  readonly frontmatterError: string | null;
}

interface GateMetadata {
  readonly needs: string[];
  readonly produces: string[];
  readonly status: string | null;
  readonly parsed: ParsedMarkdown;
}

interface GateValidationResult {
  readonly status: GateStatus;
  readonly errors: string[];
}

interface GateStateEntry {
  status: StateStatus;
  anchor?: string;
}

interface StateDoc {
  feature: string;
  phase: Phase;
  gates: Record<Phase, GateStateEntry>;
}

interface StatusPhaseResult {
  phase: Phase;
  status: string;
  anchor: string | null;
  errors: string[];
}

interface LintIssue {
  feature: string;
  phase: string;
  ruleId: string;
  message: string;
}

interface GitResult {
  code: number;
  stdout: string;
  stderr: string;
}

function usage(): never {
  const text = `Usage: anvil <command> [args]

Commands:
  init <id>                          Scaffold a new feature from templates
  status <id> [--output <mode>] [-q]  Print phase status and blockers
  check <id> [--output <mode>] [-q]  Validate current gate (files, checklist, staleness)
  advance <id>                       Move to next phase (runs validation first)
  reset <id> [phase]                 Rebuild state.yaml (full or single-phase + cascade)
  list [--output <mode>]             List all features with effective phase and gate status
  lint [<id>] [--scope <scope>] [-q] Validate process artifacts and frontmatter contracts

Flags:
  --quiet, -q  Suppress all stdout. Exit code is the only signal.
               Supported by: check, status, lint. Mutually exclusive with --output.

Output modes:
  text  human-readable compact output
  json  machine-readable output
  auto  text on TTY, json when piped (default)

Lint scopes:
  gates | templates | docs | all (default: all)
`;

  console.log(text.trimEnd());
  throw new CliError("", 1);
}

function fail(message: string, exitCode = 1): never {
  throw new CliError(`ERROR: ${message}`, exitCode);
}

function assertValidFeatureId(id: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(id) || id.includes("..")) {
    fail(`invalid feature ID '${id}'`);
  }
}

function normalizeSlashes(p: string): string {
  return p.replace(/\\/g, "/");
}

function resolveOutputMode(explicitMode: OutputMode | null, jsonAlias = false): "text" | "json" {
  if (jsonAlias || explicitMode === "json") return "json";
  if (explicitMode === "text") return "text";
  if (explicitMode === "auto" || explicitMode === null) {
    return process.stdout.isTTY ? "text" : "json";
  }

  return "text";
}

function parseOutputMode(value: string): OutputMode {
  if (value === "text" || value === "json" || value === "auto") return value;
  fail(`invalid output mode '${value}' (expected text|json|auto)`);
}

function parseScope(value: string): LintScope {
  if (value === "gates" || value === "templates" || value === "docs" || value === "all") return value;
  fail(`invalid lint scope '${value}' (expected gates|templates|docs|all)`);
}

function runGit(args: string[], cwd = REPO_ROOT): GitResult {
  const completed = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });

  return {
    code: completed.status ?? 1,
    stdout: completed.stdout ?? "",
    stderr: completed.stderr ?? "",
  };
}

function gitHead(): string | null {
  const result = runGit(["rev-parse", "HEAD"]);
  if (result.code !== 0) return null;
  const trimmed = result.stdout.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function relToRepo(filePath: string): string {
  return normalizeSlashes(path.relative(REPO_ROOT, filePath));
}

function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

function copyDirectory(srcDir: string, destDir: string): void {
  cpSync(srcDir, destDir, { recursive: true, errorOnExist: true });
}

function walkFiles(dirPath: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
}

function scaffoldFeature(featureId: string): void {
  assertValidFeatureId(featureId);
  const destDir = path.join(FEATURES_DIR, featureId);

  if (existsSync(destDir)) {
    fail(`Feature ${featureId} already exists at ${destDir}`);
  }

  ensureDir(FEATURES_DIR);
  copyDirectory(TEMPLATE_DIR, destDir);

  for (const filePath of walkFiles(destDir)) {
    try {
      const content = readFileSync(filePath, "utf8");
      const replaced = content.replaceAll("{{FEATURE_ID}}", featureId);
      if (replaced !== content) {
        writeFileSync(filePath, replaced, "utf8");
      }
    } catch {
      // skip non-text file content
    }
  }

  console.log(`Feature ${featureId} scaffolded at ${destDir}`);
}

function readMarkdown(filePath: string): ParsedMarkdown {
  const text = readFileSync(filePath, "utf8");
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const startsWithFrontmatter = text.startsWith("---");
  const match = text.match(fmRegex);

  if (!match) {
    return {
      text,
      body: text,
      hasFrontmatter: false,
      frontmatter: null,
      frontmatterError: startsWithFrontmatter ? "frontmatter not properly closed with ---" : null,
    };
  }

  const [, rawFrontmatter, body] = match;
  try {
    const parsed = YAML.parse(rawFrontmatter);
    const data = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    return {
      text,
      body,
      hasFrontmatter: true,
      frontmatter: data,
      frontmatterError: null,
    };
  } catch (err) {
    return {
      text,
      body,
      hasFrontmatter: true,
      frontmatter: null,
      frontmatterError: `invalid YAML frontmatter (${(err as Error).message})`,
    };
  }
}

function extractStatus(text: string): string | null {
  const match = text.match(/^Status:\s*(.+)\s*$/m);
  return match ? match[1].trim() : null;
}

function parseInlineArray(text: string, key: "needs" | "produces"): string[] {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedKey}:\\s*\\[(.*)\\]\\s*$`, "m");
  const match = text.match(regex);
  if (!match) return [];

  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => part.replace(/^['"]|['"]$/g, ""));
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function parseGateMetadata(featureDir: string, phase: Phase): GateMetadata {
  const gatePath = path.join(featureDir, phase, "gate.md");
  const parsed = readMarkdown(gatePath);

  const frontmatterNeeds = parsed.frontmatter ? coerceStringArray(parsed.frontmatter.needs) : [];
  const frontmatterProduces = parsed.frontmatter ? coerceStringArray(parsed.frontmatter.produces) : [];
  const fallbackNeeds = parseInlineArray(parsed.text, "needs");
  const fallbackProduces = parseInlineArray(parsed.text, "produces");

  return {
    needs: frontmatterNeeds.length > 0 ? frontmatterNeeds : fallbackNeeds,
    produces: frontmatterProduces.length > 0 ? frontmatterProduces : fallbackProduces,
    status: extractStatus(parsed.text),
    parsed,
  };
}

function getSection(body: string, sectionName: string): { inline: string; lines: string[] } | null {
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith(`${sectionName}:`)) continue;

    const inline = line.slice(sectionName.length + 1).trim();
    const sectionLines: string[] = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^[A-Z][A-Za-z-]*:\s*/.test(lines[j])) break;
      sectionLines.push(lines[j]);
    }

    return { inline, lines: sectionLines };
  }

  return null;
}

function sectionText(section: { inline: string; lines: string[] } | null): string {
  if (!section) return "";
  const combined = [section.inline, ...section.lines].join("\n");
  return combined.trim();
}

function hasFileReference(text: string): boolean {
  return /`[^`]+`|(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.[A-Za-z0-9]+/.test(text);
}

function isConcreteValue(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== "->" && trimmed !== "?";
}

function hasConcreteFalsification(parsed: ParsedMarkdown): boolean {
  const section = getSection(parsed.body, "Falsification");
  if (!section) return false;

  const joined = [section.inline, ...section.lines].join("\n");
  const triedMatches = [...joined.matchAll(/Tried:\s*([^\n\r]*)/g)];
  const observedMatches = [...joined.matchAll(/Observed:\s*([^\n\r]*)/g)];
  const triedCount = triedMatches.filter((match) => isConcreteValue(match[1] ?? "")).length;
  const observedCount = observedMatches.filter((match) => isConcreteValue(match[1] ?? "")).length;

  return triedCount > 0 && observedCount > 0;
}

function validateGate(featureDir: string, phase: Phase): GateValidationResult {
  const metadata = parseGateMetadata(featureDir, phase);
  const { parsed } = metadata;
  const errors: string[] = [];

  const status = metadata.status;
  if (status && status.toUpperCase() === "PENDING") {
    return { status: "PENDING", errors: ["Gate status is PENDING"] };
  }

  if (!status || status.toUpperCase() !== "PASS") {
    errors.push("Status line is not PASS");
  }

  const unchecked = parsed.text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- [ ]"))
    .length;
  if (unchecked > 0) {
    errors.push(`${unchecked} unchecked item(s)`);
  }

  const rationale = getSection(parsed.body, "Rationale");
  const rationaleContent = sectionText(rationale);
  if (rationaleContent.length === 0) {
    errors.push("Rationale is empty");
  } else if (!hasFileReference(rationaleContent)) {
    errors.push("Rationale must reference a file path or backtick-quoted term");
  }

  for (const producedPath of metadata.produces) {
    const target = path.join(featureDir, phase, producedPath);
    if (!existsSync(target)) {
      errors.push(`Missing produced artifact: ${producedPath}`);
    }
  }

  for (const needsPath of metadata.needs) {
    const target = path.join(featureDir, phase, needsPath);
    if (!existsSync(target)) {
      errors.push(`Missing dependency: ${needsPath}`);
    }
  }

  if (phase === "2-verify" || phase === "4-ship") {
    if (!getSection(parsed.body, "Falsification")) {
      errors.push("Missing Falsification section");
    } else if (!hasConcreteFalsification(parsed)) {
      errors.push("Falsification needs concrete Tried/Observed pairs");
    }
  }

  if (errors.length > 0) {
    return { status: "FAIL", errors };
  }

  return { status: "PASS", errors: [] };
}

function defaultState(featureId: string): StateDoc {
  return {
    feature: featureId,
    phase: "0-define",
    gates: {
      "0-define": { status: "pending" },
      "1-spec": { status: "pending" },
      "2-verify": { status: "pending" },
      "3-build": { status: "pending" },
      "4-ship": { status: "pending" },
    },
  };
}

function toStateStatus(value: unknown): StateStatus {
  const normalized = String(value ?? "pending");
  if (
    normalized === "pass" ||
    normalized === "pending" ||
    normalized === "fail" ||
    normalized === "dirty" ||
    normalized === "stale" ||
    normalized === "in_progress"
  ) {
    return normalized;
  }

  return "pending";
}

function parseStateDoc(raw: string, featureId: string): StateDoc {
  try {
    const parsed = YAML.parse(raw) as Record<string, unknown> | null;
    const gates = (parsed?.gates ?? {}) as Record<string, { status?: unknown; anchor?: unknown }>;
    const phaseCandidate = String(parsed?.phase ?? "0-define") as Phase;
    const phase = PHASES.includes(phaseCandidate) ? phaseCandidate : "0-define";

    const state: StateDoc = {
      feature: String(parsed?.feature ?? featureId),
      phase,
      gates: {
        "0-define": { status: "pending" },
        "1-spec": { status: "pending" },
        "2-verify": { status: "pending" },
        "3-build": { status: "pending" },
        "4-ship": { status: "pending" },
      },
    };

    for (const gatePhase of PHASES) {
      const gateEntry = gates[gatePhase];
      if (!gateEntry) continue;
      state.gates[gatePhase] = {
        status: toStateStatus(gateEntry.status),
      };
      if (gateEntry.anchor) {
        state.gates[gatePhase].anchor = String(gateEntry.anchor);
      }
    }

    return state;
  } catch {
    return defaultState(featureId);
  }
}

function formatStateDoc(state: StateDoc): string {
  const lines: string[] = [];
  lines.push(`feature: ${state.feature}`);
  lines.push(`phase: ${state.phase}`);
  lines.push("gates:");
  for (const phase of PHASES) {
    const entry = state.gates[phase] ?? { status: "pending" };
    if (entry.anchor) {
      lines.push(`  ${phase}: { status: ${entry.status}, anchor: ${entry.anchor} }`);
    } else {
      lines.push(`  ${phase}: { status: ${entry.status} }`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function readState(featureDir: string): StateDoc | null {
  const statePath = path.join(featureDir, "state.yaml");
  if (!existsSync(statePath)) return null;
  const featureId = path.basename(featureDir);
  return parseStateDoc(readFileSync(statePath, "utf8"), featureId);
}

function writeState(featureDir: string, state: StateDoc): void {
  const statePath = path.join(featureDir, "state.yaml");
  writeFileSync(statePath, formatStateDoc(state), "utf8");
}

function getStateAnchor(featureDir: string, phase: Phase): string | null {
  const state = readState(featureDir);
  if (!state) return null;
  return state.gates[phase]?.anchor ?? null;
}

function updateState(featureDir: string, phase: Phase, status: StateStatus, anchor?: string): void {
  const state = readState(featureDir);
  if (!state) return;
  state.gates[phase] = { status };
  if (anchor) {
    state.gates[phase].anchor = anchor;
  }
  writeState(featureDir, state);
}

function checkDirty(featureDir: string, phase: Phase): "DIRTY" | "CLEAN" {
  const metadata = parseGateMetadata(featureDir, phase);
  for (const needsPath of metadata.needs) {
    const absolute = path.join(featureDir, phase, needsPath);
    if (!existsSync(absolute)) continue;
    const gitPath = relToRepo(absolute);
    const changed = runGit(["diff", "--name-only", "--", gitPath]);
    if (changed.code === 0 && changed.stdout.trim().length > 0) {
      return "DIRTY";
    }
  }
  return "CLEAN";
}

function checkStaleness(featureDir: string, phase: Phase, anchor: string): "STALE" | "CLEAN" {
  const anchorCheck = runGit(["cat-file", "-t", anchor]);
  if (anchorCheck.code !== 0) return "STALE";

  const metadata = parseGateMetadata(featureDir, phase);
  for (const needsPath of metadata.needs) {
    const absolute = path.join(featureDir, phase, needsPath);
    if (!existsSync(absolute)) continue;
    const gitPath = relToRepo(absolute);
    const changed = runGit(["log", `${anchor}..HEAD`, "--oneline", "--", gitPath]);
    if (changed.code === 0 && changed.stdout.trim().length > 0) {
      return "STALE";
    }
  }

  return "CLEAN";
}

function cmdStatus(args: string[]): void {
  let featureId = "";
  let jsonAlias = false;
  let outputMode: OutputMode | null = null;
  let quiet = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      jsonAlias = true;
      continue;
    }
    if (arg === "--output") {
      const next = args[i + 1];
      if (!next) fail("Usage: anvil status <feature-id> [--output <mode>]");
      outputMode = parseOutputMode(next);
      i += 1;
      continue;
    }
    if (arg === "--quiet" || arg === "-q") { quiet = true; continue; }

    if (!featureId) {
      featureId = arg;
    } else {
      fail("Usage: anvil status <feature-id> [--output <mode>]");
    }
  }

  if (!featureId) fail("Usage: anvil status <feature-id> [--output <mode>]");

  if (quiet && (outputMode !== null || jsonAlias)) {
    fail("--quiet and --output are mutually exclusive");
  }
  assertValidFeatureId(featureId);

  const featureDir = path.join(FEATURES_DIR, featureId);
  if (!existsSync(featureDir)) fail(`Feature ${featureId} not found at ${featureDir}`);
  if (!existsSync(path.join(featureDir, "state.yaml"))) fail(`No state.yaml in ${featureDir}`);

  const mode = resolveOutputMode(outputMode, jsonAlias);
  if (!quiet && mode === "text") {
    console.log(`Feature: ${featureId}`);
  }

  let effective: Phase | null = null;
  const phases: StatusPhaseResult[] = [];

  for (const phase of PHASES) {
    const gatePath = path.join(featureDir, phase, "gate.md");
    if (!existsSync(gatePath)) {
      if (!effective) effective = phase;
      if (!quiet && mode === "text") {
        console.log(`  ${phase}: MISSING (no gate.md)`);
      }
      phases.push({
        phase,
        status: "MISSING",
        anchor: null,
        errors: ["no gate.md"],
      });
      continue;
    }

    const validation = validateGate(featureDir, phase);
    const anchor = getStateAnchor(featureDir, phase);

    if (validation.status === "PASS") {
      if (effective) {
        if (!quiet && mode === "text") {
          console.log(`  ${phase}: STALE (cascade from ${effective})`);
        }
        phases.push({
          phase,
          status: "STALE",
          anchor,
          errors: [`cascade from ${effective}`],
        });
        continue;
      }

      if (anchor) {
        const stale = checkStaleness(featureDir, phase, anchor);
        if (stale === "STALE") {
          if (!effective) effective = phase;
          if (!quiet && mode === "text") {
            console.log(`  ${phase}: STALE (deps changed since anchor ${anchor})`);
          }
          phases.push({
            phase,
            status: "STALE",
            anchor,
            errors: [`deps changed since anchor ${anchor}`],
          });
          continue;
        }

        if (!quiet && mode === "text") {
          console.log(`  ${phase}: CLEAN (anchor: ${anchor})`);
        }
        phases.push({
          phase,
          status: "CLEAN",
          anchor,
          errors: [],
        });
        continue;
      }

      if (!quiet && mode === "text") {
        console.log(`  ${phase}: PASS (no anchor)`);
      }
      phases.push({
        phase,
        status: "PASS",
        anchor: null,
        errors: ["no anchor"],
      });
      continue;
    }

    if (!effective) effective = phase;
    const details = validation.errors.slice(0, 3);
    if (!quiet && mode === "text") {
      console.log(`  ${phase}: ${validation.status}`);
      for (const detail of details) {
        console.log(`    ${detail}`);
      }
    }
    phases.push({
      phase,
      status: validation.status,
      anchor,
      errors: details,
    });
  }

  if (quiet) {
    if (effective !== null) throw new CliError("", 1);
    return;
  }

  if (mode === "json") {
    console.log(
      JSON.stringify({
        feature: featureId,
        command: "status",
        effectivePhase: effective,
        allClean: effective === null,
        phases,
      }),
    );
    return;
  }

  if (effective) {
    console.log("");
    console.log(`Effective phase: ${effective}`);
  } else {
    console.log("");
    console.log("All phases CLEAN.");
  }
}

function cmdCheck(args: string[]): void {
  let featureId = "";
  let jsonAlias = false;
  let outputMode: OutputMode | null = null;
  let quiet = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      jsonAlias = true;
      continue;
    }
    if (arg === "--output") {
      const next = args[i + 1];
      if (!next) fail("Usage: anvil check <feature-id> [--output <mode>]");
      outputMode = parseOutputMode(next);
      i += 1;
      continue;
    }
    if (arg === "--quiet" || arg === "-q") { quiet = true; continue; }
    if (!featureId) {
      featureId = arg;
    } else {
      fail("Usage: anvil check <feature-id> [--output <mode>]");
    }
  }

  if (!featureId) fail("Usage: anvil check <feature-id> [--output <mode>]");

  if (quiet && (outputMode !== null || jsonAlias)) {
    fail("--quiet and --output are mutually exclusive");
  }
  assertValidFeatureId(featureId);

  const featureDir = path.join(FEATURES_DIR, featureId);
  if (!existsSync(featureDir)) fail(`Feature ${featureId} not found at ${featureDir}`);

  const mode = resolveOutputMode(outputMode, jsonAlias);
  const phases: StatusPhaseResult[] = [];

  let cascadeFrom: Phase | null = null;
  let effective: Phase | null = null;
  let allPass = true;

  for (const phase of PHASES) {
    const gatePath = path.join(featureDir, phase, "gate.md");
    if (!existsSync(gatePath)) {
      if (!quiet && mode === "text") console.log(`${phase}: MISSING (no gate.md)`);
      if (!cascadeFrom) cascadeFrom = phase;
      if (!effective) effective = phase;
      allPass = false;
      updateState(featureDir, phase, "fail");
      phases.push({ phase, status: "MISSING", anchor: null, errors: ["no gate.md"] });
      continue;
    }

    if (cascadeFrom) {
      if (!quiet && mode === "text") console.log(`${phase}: STALE (cascade from ${cascadeFrom})`);
      if (!effective) effective = phase;
      allPass = false;
      updateState(featureDir, phase, "stale");
      phases.push({
        phase,
        status: "STALE",
        anchor: getStateAnchor(featureDir, phase),
        errors: [`cascade from ${cascadeFrom}`],
      });
      continue;
    }

    const validation = validateGate(featureDir, phase);
    if (validation.status === "PASS") {
      const anchor = getStateAnchor(featureDir, phase);
      if (anchor && checkStaleness(featureDir, phase, anchor) === "STALE") {
        if (!quiet && mode === "text") console.log(`${phase}: STALE (deps changed since anchor)`);
        cascadeFrom = phase;
        if (!effective) effective = phase;
        allPass = false;
        updateState(featureDir, phase, "stale");
        phases.push({ phase, status: "STALE", anchor, errors: ["deps changed since anchor"] });
        continue;
      }

      if (checkDirty(featureDir, phase) === "DIRTY") {
        if (!quiet && mode === "text") console.log(`${phase}: DIRTY (uncommitted changes to deps)`);
        cascadeFrom = phase;
        if (!effective) effective = phase;
        allPass = false;
        updateState(featureDir, phase, "dirty");
        phases.push({
          phase,
          status: "DIRTY",
          anchor,
          errors: ["uncommitted changes to deps"],
        });
        continue;
      }

      const currentAnchor = gitHead();
      if (!quiet && mode === "text") console.log(`${phase}: PASS`);
      updateState(featureDir, phase, "pass", currentAnchor ?? undefined);
      phases.push({
        phase,
        status: "PASS",
        anchor: currentAnchor,
        errors: [],
      });
      continue;
    }

    if (!quiet && mode === "text") {
      console.log(`${phase}: ${validation.status}`);
      for (const err of validation.errors) {
        console.log(`  ${err}`);
      }
    }
    cascadeFrom = phase;
    if (!effective) effective = phase;
    allPass = false;
    if (validation.status === "PENDING") {
      updateState(featureDir, phase, "pending");
    } else if (validation.status === "FAIL") {
      updateState(featureDir, phase, "fail");
    } else {
      updateState(featureDir, phase, "in_progress");
    }
    phases.push({
      phase,
      status: validation.status,
      anchor: getStateAnchor(featureDir, phase),
      errors: validation.errors,
    });
  }

  if (quiet) {
    if (!allPass) throw new CliError("", 1);
    return;
  }

  if (mode === "json") {
    console.log(
      JSON.stringify({
        feature: featureId,
        command: "check",
        effectivePhase: effective,
        allPass,
        phases,
      }),
    );
    return;
  }

  if (allPass) {
    console.log("");
    console.log("All gates pass.");
  }
}

function cmdAdvance(args: string[]): void {
  if (args.includes("--quiet") || args.includes("-q")) {
    fail("--quiet is not supported for this command");
  }
  const [featureId] = args;
  if (!featureId || args.length > 1) fail("Usage: anvil advance <feature-id>");
  assertValidFeatureId(featureId);

  const featureDir = path.join(FEATURES_DIR, featureId);
  if (!existsSync(featureDir)) fail(`Feature ${featureId} not found at ${featureDir}`);

  const state = readState(featureDir);
  if (!state) fail(`No state.yaml in ${featureDir}`);
  const current = state.phase;

  const validation = validateGate(featureDir, current);
  if (validation.status !== "PASS") {
    console.log(`Gate ${current} has not passed. Run 'anvil check ${featureId}' for details.`);
    for (const err of validation.errors) {
      console.log(`  ${err}`);
    }
    throw new CliError("", 1);
  }

  const anchor = state.gates[current]?.anchor;
  if (anchor && checkStaleness(featureDir, current, anchor) === "STALE") {
    fail(`Gate ${current} is STALE - deps changed since last check. Re-verify and run 'anvil check ${featureId}'.`);
  }

  if (checkDirty(featureDir, current) === "DIRTY") {
    fail(`Gate ${current} is DIRTY - uncommitted changes to deps. Commit or discard, then re-check.`);
  }

  const currentIndex = PHASES.indexOf(current);
  const next = currentIndex >= 0 ? PHASES[currentIndex + 1] : null;
  if (!next) {
    console.log(`Feature ${featureId} is complete - already at final phase (${current}).`);
    return;
  }

  const currentAnchor = gitHead();
  state.gates[current] = { status: "pass" };
  if (currentAnchor) state.gates[current].anchor = currentAnchor;
  state.phase = next;
  state.gates[next] = { status: "in_progress" };
  writeState(featureDir, state);

  console.log(`Advanced ${featureId}: ${current} -> ${next}`);
}

function cmdReset(args: string[]): void {
  if (args.includes("--quiet") || args.includes("-q")) {
    fail("--quiet is not supported for this command");
  }
  const featureId = args[0];
  const targetPhase = args[1] as Phase | undefined;
  const extra = args[2];

  if (!featureId || extra) {
    fail("Usage: anvil reset <feature-id> [phase]");
  }
  assertValidFeatureId(featureId);

  if (targetPhase && !PHASES.includes(targetPhase)) {
    fail(`invalid phase '${targetPhase}' (must be one of: ${PHASES.join(" ")})`);
  }

  const featureDir = path.join(FEATURES_DIR, featureId);
  if (!existsSync(featureDir)) fail(`Feature ${featureId} not found at ${featureDir}`);

  const statePath = path.join(featureDir, "state.yaml");
  const oldRaw = existsSync(statePath) ? readFileSync(statePath, "utf8") : "";
  const oldState = parseStateDoc(oldRaw, featureId);
  const headAnchor = gitHead();

  const gates: Record<Phase, GateStateEntry> = {
    "0-define": { status: "pending" },
    "1-spec": { status: "pending" },
    "2-verify": { status: "pending" },
    "3-build": { status: "pending" },
    "4-ship": { status: "pending" },
  };

  let reachedTarget = !targetPhase;
  let lowestNonPass: Phase | null = null;

  for (const phase of PHASES) {
    if (targetPhase && phase === targetPhase) reachedTarget = true;
    const resetThis = reachedTarget;

    let entry: GateStateEntry = { status: "pending" };

    if (resetThis) {
      const gatePath = path.join(featureDir, phase, "gate.md");
      if (existsSync(gatePath)) {
        const status = extractStatus(readFileSync(gatePath, "utf8"));
        const normalized = String(status ?? "PENDING").toUpperCase();
        if (normalized === "PASS") entry.status = "pass";
        else if (normalized === "FAIL") entry.status = "fail";
        else entry.status = "pending";
      }

      if (entry.status === "pass" && headAnchor) {
        entry.anchor = headAnchor;
      }
    } else {
      const preserved = oldState.gates[phase];
      entry = { status: preserved?.status ?? "pending" };
      if (entry.status === "pass" && preserved?.anchor) {
        entry.anchor = preserved.anchor;
      } else if (entry.status === "pass" && headAnchor) {
        entry.anchor = headAnchor;
      }
    }

    gates[phase] = entry;
    if (entry.status !== "pass" && !lowestNonPass) {
      lowestNonPass = phase;
    }
  }

  const newState: StateDoc = {
    feature: featureId,
    phase: lowestNonPass ?? "4-ship",
    gates,
  };

  const newRaw = formatStateDoc(newState);
  if (newRaw === oldRaw) {
    console.error("state.yaml is already consistent");
    return;
  }

  writeFileSync(statePath, newRaw, "utf8");
  console.error("state.yaml updated (before -> after)");
  console.error("--- before");
  console.error(oldRaw.length > 0 ? oldRaw.trimEnd() : "(missing)");
  console.error("--- after");
  console.error(newRaw.trimEnd());
}

function listFeatureDirectories(): Array<{ featureId: string; featureDir: string }> {
  if (!existsSync(FEATURES_DIR)) return [];

  const entries = readdirSync(FEATURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      featureId: entry.name,
      featureDir: path.join(FEATURES_DIR, entry.name),
    }))
    .sort((a, b) => a.featureId.localeCompare(b.featureId));

  return entries;
}

function cmdList(args: string[]): void {
  if (args.includes("--quiet") || args.includes("-q")) {
    fail("--quiet is not supported for this command");
  }
  let jsonAlias = false;
  let outputMode: OutputMode | null = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      jsonAlias = true;
      continue;
    }
    if (arg === "--output") {
      const next = args[i + 1];
      if (!next) fail("Usage: anvil list [--output <mode>]");
      outputMode = parseOutputMode(next);
      i += 1;
      continue;
    }

    fail("Usage: anvil list [--output <mode>]");
  }

  const mode = resolveOutputMode(outputMode, jsonAlias);
  const features = listFeatureDirectories();

  if (features.length === 0) {
    if (mode === "json") {
      console.log(JSON.stringify({ command: "list", features: [] }));
    }
    return;
  }

  const payload: Array<{ feature: string; effectivePhase: Phase; status: string }> = [];

  for (const { featureId, featureDir } of features) {
    const statePath = path.join(featureDir, "state.yaml");
    if (!existsSync(statePath)) {
      console.error(`warning: ${featureId} has no state.yaml, skipping`);
      continue;
    }

    let effective: Phase | null = null;
    let effectiveStatus = "";

    for (const phase of PHASES) {
      const gatePath = path.join(featureDir, phase, "gate.md");
      if (!existsSync(gatePath)) {
        if (!effective) {
          effective = phase;
          effectiveStatus = "MISSING";
        }
        continue;
      }

      const validation = validateGate(featureDir, phase);
      if (validation.status !== "PASS") {
        if (!effective) {
          effective = phase;
          effectiveStatus = validation.status;
        }
        continue;
      }

      if (!effective) {
        const anchor = getStateAnchor(featureDir, phase);
        if (anchor && checkStaleness(featureDir, phase, anchor) === "STALE") {
          effective = phase;
          effectiveStatus = "STALE";
        }
      }
    }

    if (!effective) {
      effective = "4-ship";
      effectiveStatus = "CLEAN";
    }

    if (mode === "text") {
      console.log(`${featureId} ${effective} ${effectiveStatus}`);
    }

    payload.push({
      feature: featureId,
      effectivePhase: effective,
      status: effectiveStatus,
    });
  }

  if (mode === "json") {
    console.log(
      JSON.stringify({
        command: "list",
        features: payload,
      }),
    );
  }
}

function pushIssue(issues: LintIssue[], feature: string, phase: string, ruleId: string, message: string): void {
  issues.push({
    feature,
    phase,
    ruleId,
    message: message.replace(/\s+/g, " ").trim(),
  });
}

function lintGateFile(featureId: string, featureDir: string, phase: Phase, issues: LintIssue[]): void {
  const gatePath = path.join(featureDir, phase, "gate.md");
  const parsed = readMarkdown(gatePath);

  if (!parsed.hasFrontmatter) {
    pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", "missing YAML frontmatter");
  }
  if (parsed.frontmatterError) {
    pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", parsed.frontmatterError);
  }

  let needs: string[] = [];
  let produces: string[] = [];
  if (parsed.frontmatter && !parsed.frontmatterError) {
    const fm = parsed.frontmatter;

    if (!Object.hasOwn(fm, "phase")) {
      pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", "frontmatter missing phase field");
    } else if (String(fm.phase) !== phase) {
      pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", `frontmatter phase '${String(fm.phase)}' does not match '${phase}'`);
    }

    if (!Object.hasOwn(fm, "needs")) {
      pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", "frontmatter missing needs field");
    } else if (!Array.isArray(fm.needs)) {
      pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", "frontmatter needs must be an array");
    } else if (!(fm.needs as unknown[]).every((entry) => typeof entry === "string")) {
      pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", "frontmatter needs entries must be strings");
    } else {
      needs = (fm.needs as string[]).slice();
    }

    if (!Object.hasOwn(fm, "produces")) {
      pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", "frontmatter missing produces field");
    } else if (!Array.isArray(fm.produces)) {
      pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", "frontmatter produces must be an array");
    } else if (!(fm.produces as unknown[]).every((entry) => typeof entry === "string")) {
      pushIssue(issues, featureId, phase, "GATE-FRONTMATTER", "frontmatter produces entries must be strings");
    } else {
      produces = (fm.produces as string[]).slice();
    }
  }

  const status = extractStatus(parsed.text);
  if (!status) {
    pushIssue(issues, featureId, phase, "GATE-STATUS", "missing Status line");
  } else if (status !== "PENDING" && status !== "PASS" && status !== "FAIL") {
    pushIssue(issues, featureId, phase, "GATE-STATUS", `invalid status '${status}' (must be PENDING, PASS, or FAIL)`);
  }

  for (const line of parsed.text.split(/\r?\n/)) {
    if (line.startsWith("- [") && !/^- \[( |x)\] .+/.test(line)) {
      pushIssue(issues, featureId, phase, "GATE-CHECKLIST", `malformed checkbox: ${line}`);
    }
  }

  if (status === "PASS") {
    const rationaleContent = sectionText(getSection(parsed.body, "Rationale"));
    if (rationaleContent.length === 0) {
      pushIssue(issues, featureId, phase, "GATE-RATIONALE", "rationale is empty but status is PASS");
    } else if (!hasFileReference(rationaleContent)) {
      pushIssue(issues, featureId, phase, "GATE-RATIONALE", "rationale must contain a file reference or backtick-quoted term");
    }
  }

  if ((phase === "2-verify" || phase === "4-ship") && status === "PASS") {
    const hasSection = !!getSection(parsed.body, "Falsification");
    if (!hasSection) {
      pushIssue(issues, featureId, phase, "GATE-FALSIFICATION", "missing Falsification section");
    } else if (!hasConcreteFalsification(parsed)) {
      pushIssue(issues, featureId, phase, "GATE-FALSIFICATION", "missing Tried/Observed pairs");
    }
  }

  for (const needsPath of needs) {
    const target = path.join(featureDir, phase, needsPath);
    if (!existsSync(target)) {
      pushIssue(issues, featureId, phase, "XREF-NEEDS", `needs path ${needsPath} does not exist`);
    }
  }

  if (status === "PASS") {
    for (const producesPath of produces) {
      const target = path.join(featureDir, phase, producesPath);
      if (!existsSync(target)) {
        pushIssue(issues, featureId, phase, "XREF-PRODUCES", `produces path ${producesPath} missing but gate is PASS`);
      }
    }
  }
}

function lintFeature(featureId: string, featureDir: string, issues: LintIssue[]): void {
  const statePath = path.join(featureDir, "state.yaml");
  if (!existsSync(statePath)) {
    pushIssue(issues, featureId, "root", "TMPL-STATE", "state.yaml missing");
  }

  for (const phase of PHASES) {
    const phaseDir = path.join(featureDir, phase);
    if (!existsSync(phaseDir) || !lstatSync(phaseDir).isDirectory()) {
      pushIssue(issues, featureId, phase, "TMPL-PHASE", "phase directory missing");
      continue;
    }

    const gatePath = path.join(phaseDir, "gate.md");
    if (!existsSync(gatePath)) {
      pushIssue(issues, featureId, phase, "TMPL-PHASE", "gate.md missing");
      continue;
    }

    lintGateFile(featureId, featureDir, phase, issues);
  }
}

function lintTemplateGates(issues: LintIssue[]): void {
  const templateFeatureRoot = path.join(REPO_ROOT, "process", "anvil", "templates", "feature");
  for (const phase of PHASES) {
    const gatePath = path.join(templateFeatureRoot, phase, "gate.md");
    if (!existsSync(gatePath)) {
      pushIssue(issues, "_repo", phase, "TMPL-PHASE", "template gate.md missing");
      continue;
    }
    const parsed = readMarkdown(gatePath);
    if (!parsed.hasFrontmatter) {
      pushIssue(issues, "_repo", phase, "GATE-FRONTMATTER", "template gate missing YAML frontmatter");
      continue;
    }
    if (parsed.frontmatterError) {
      pushIssue(issues, "_repo", phase, "GATE-FRONTMATTER", `template gate ${parsed.frontmatterError}`);
    }
  }
}

function lintKeyDocs(issues: LintIssue[]): void {
  const docsToValidate = [
    path.join(REPO_ROOT, ".claude", "skills", "anvil", "SKILL.md"),
    path.join(REPO_ROOT, "skills", "anvil", "SKILL.md"),
  ];

  for (const docPath of docsToValidate) {
    if (!existsSync(docPath)) {
      pushIssue(issues, "_repo", "root", "TMPL-DOC", `missing required doc: ${relToRepo(docPath)}`);
      continue;
    }
    const parsed = readMarkdown(docPath);
    if (!parsed.hasFrontmatter) {
      pushIssue(issues, "_repo", "root", "TMPL-DOC", `missing frontmatter: ${relToRepo(docPath)}`);
      continue;
    }
    if (parsed.frontmatterError) {
      pushIssue(issues, "_repo", "root", "TMPL-DOC", `invalid frontmatter in ${relToRepo(docPath)} (${parsed.frontmatterError})`);
      continue;
    }

    const fm = parsed.frontmatter ?? {};
    if (!Object.hasOwn(fm, "name") || typeof fm.name !== "string" || String(fm.name).trim().length === 0) {
      pushIssue(issues, "_repo", "root", "TMPL-DOC", `frontmatter missing non-empty name: ${relToRepo(docPath)}`);
    }
    if (!Object.hasOwn(fm, "description") || typeof fm.description !== "string" || String(fm.description).trim().length === 0) {
      pushIssue(issues, "_repo", "root", "TMPL-DOC", `frontmatter missing non-empty description: ${relToRepo(docPath)}`);
    }
  }
}

function cmdLint(args: string[]): void {
  let featureId: string | null = null;
  let outputMode: OutputMode | null = null;
  let jsonAlias = false;
  let strict = true;
  let scope: LintScope = "all";
  let quiet = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      jsonAlias = true;
      continue;
    }
    if (arg === "--output") {
      const next = args[i + 1];
      if (!next) fail("Usage: anvil lint [<id>] [--scope <scope>] [--output <mode>]");
      outputMode = parseOutputMode(next);
      i += 1;
      continue;
    }
    if (arg === "--scope") {
      const next = args[i + 1];
      if (!next) fail("Usage: anvil lint [<id>] [--scope <scope>] [--output <mode>]");
      scope = parseScope(next);
      i += 1;
      continue;
    }
    if (arg === "--strict") {
      strict = true;
      continue;
    }
    if (arg === "--no-strict") {
      strict = false;
      continue;
    }
    if (arg === "--quiet" || arg === "-q") { quiet = true; continue; }
    if (!featureId) {
      featureId = arg;
      continue;
    }

    fail("Usage: anvil lint [<id>] [--scope <scope>] [--output <mode>]");
  }

  if (featureId) assertValidFeatureId(featureId);

  if (quiet && (outputMode !== null || jsonAlias)) {
    fail("--quiet and --output are mutually exclusive");
  }
  const mode = resolveOutputMode(outputMode, jsonAlias);
  const issues: LintIssue[] = [];
  const warnings: string[] = [];

  if ((scope === "gates" || scope === "all") && existsSync(FEATURES_DIR)) {
    if (featureId) {
      const featureDir = path.join(FEATURES_DIR, featureId);
      if (!existsSync(featureDir) || !lstatSync(featureDir).isDirectory()) {
        fail(`Feature ${featureId} not found at ${featureDir}`);
      }
      lintFeature(featureId, featureDir, issues);
    } else {
      for (const { featureId: discoveredId, featureDir } of listFeatureDirectories()) {
        const statePath = path.join(featureDir, "state.yaml");
        if (!existsSync(statePath)) {
          warnings.push(`warning: ${discoveredId} has no state.yaml, skipping`);
          continue;
        }
        lintFeature(discoveredId, featureDir, issues);
      }
    }
  } else if ((scope === "gates" || scope === "all") && !existsSync(FEATURES_DIR)) {
    if (featureId) {
      fail(`Feature ${featureId} not found at ${path.join(FEATURES_DIR, featureId)}`);
    }
  }

  if (scope === "templates" || scope === "all") {
    lintTemplateGates(issues);
  }

  if (scope === "docs" || scope === "all") {
    lintKeyDocs(issues);
  }

  if (!quiet) {
    if (mode === "json") {
      console.log(
        JSON.stringify({
          command: "lint",
          feature: featureId,
          scope,
          strict,
          issueCount: issues.length,
          warningCount: warnings.length,
          issues,
          warnings,
        }),
      );
    } else {
      for (const warning of warnings) {
        console.error(warning);
      }
      for (const issue of issues) {
        console.log(`${issue.feature} ${issue.phase} ${issue.ruleId} ${issue.message}`);
      }
    }
  }

  if (strict && issues.length > 0) {
    throw new CliError("", 1);
  }
}

function cmdInit(args: string[]): void {
  if (args.includes("--quiet") || args.includes("-q")) {
    fail("--quiet is not supported for this command");
  }
  const [featureId] = args;
  if (!featureId || args.length > 1) fail("Usage: anvil init <feature-id>");
  scaffoldFeature(featureId);
}

function run(): void {
  const [, , command, ...args] = process.argv;
  if (!command) usage();

  switch (command) {
    case "init":
      cmdInit(args);
      return;
    case "status":
      cmdStatus(args);
      return;
    case "check":
      cmdCheck(args);
      return;
    case "advance":
      cmdAdvance(args);
      return;
    case "reset":
      cmdReset(args);
      return;
    case "list":
      cmdList(args);
      return;
    case "lint":
      cmdLint(args);
      return;
    default:
      usage();
  }
}

try {
  run();
} catch (err) {
  if (err instanceof CliError) {
    if (err.message.length > 0) {
      if (err.message.startsWith("ERROR:")) {
        console.error(err.message);
      } else {
        console.error(`ERROR: ${err.message}`);
      }
    }
    process.exit(err.exitCode);
  }

  console.error(`ERROR: ${(err as Error).message}`);
  process.exit(2);
}
