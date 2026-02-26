#!/usr/bin/env node

const { parseArgs } = require("node:util");
const {
  PHASES,
  scaffoldFeature,
  checkFeature,
  checkAllFeatures,
  formatCheckReport,
  statusFeature,
  formatStatusReport,
  advanceFeature,
  invalidateFeature,
  applyDeltas,
} = require("./edsc-lib");

function usage() {
  return [
    "Usage:",
    "  edsc scaffold <feature-id> [--mode complicated|complex]",
    "  edsc status <feature-id>",
    "  edsc check <feature-id>",
    "  edsc check --all",
    "  edsc advance <feature-id> --to <phase>",
    "  edsc invalidate <feature-id> --phase <phase> --reason \"...\"",
    "  edsc apply-deltas <feature-id>",
    "",
    `Valid phases: ${PHASES.join(", ")}`,
  ].join("\n");
}

function parseCommandArgs(args, options = {}) {
  return parseArgs({
    args,
    options,
    allowPositionals: true,
    strict: true,
  });
}

function print(text) {
  process.stdout.write(`${text.endsWith("\n") ? text : `${text}\n`}`);
}

function printErr(text) {
  process.stderr.write(`${text.endsWith("\n") ? text : `${text}\n`}`);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
    print(usage());
    return 0;
  }

  if (cmd === "scaffold") {
    const parsed = parseCommandArgs(argv.slice(1), {
      mode: { type: "string" },
    });
    const featureId = parsed.positionals[0];
    if (!featureId) {
      throw new Error("scaffold requires <feature-id>");
    }
    const mode = parsed.values.mode || "complicated";
    const target = scaffoldFeature(featureId, mode);
    print(`Scaffolded feature: ${featureId}`);
    print(`Path: ${target}`);
    return 0;
  }

  if (cmd === "status") {
    const parsed = parseCommandArgs(argv.slice(1));
    const featureId = parsed.positionals[0];
    if (!featureId) {
      throw new Error("status requires <feature-id>");
    }
    const report = statusFeature(featureId);
    print(formatStatusReport(report));
    return 0;
  }

  if (cmd === "check") {
    const parsed = parseCommandArgs(argv.slice(1), {
      all: { type: "boolean" },
    });

    if (parsed.values.all) {
      const reports = checkAllFeatures();
      let hasFailures = false;
      for (const report of reports) {
        print(formatCheckReport(report));
        if (report.hasFailures) {
          hasFailures = true;
        }
      }
      if (reports.length === 0) {
        print("No features found in work/features");
      }
      return hasFailures ? 1 : 0;
    }

    const featureId = parsed.positionals[0];
    if (!featureId) {
      throw new Error("check requires <feature-id> or --all");
    }

    const report = checkFeature(featureId, { write: true });
    print(formatCheckReport(report));
    return report.hasFailures ? 1 : 0;
  }

  if (cmd === "advance") {
    const parsed = parseCommandArgs(argv.slice(1), {
      to: { type: "string" },
    });
    const featureId = parsed.positionals[0];
    const targetPhase = parsed.values.to || null;
    if (!featureId) {
      throw new Error("advance requires <feature-id>");
    }
    if (!targetPhase) {
      throw new Error("advance requires --to <phase>");
    }

    const state = advanceFeature(featureId, targetPhase);
    print(`Advanced ${featureId} to ${state.current_phase}`);
    return 0;
  }

  if (cmd === "invalidate") {
    const parsed = parseCommandArgs(argv.slice(1), {
      phase: { type: "string" },
      reason: { type: "string" },
    });
    const featureId = parsed.positionals[0];
    const phase = parsed.values.phase || null;
    const reason = parsed.values.reason || null;

    if (!featureId) {
      throw new Error("invalidate requires <feature-id>");
    }
    if (!phase) {
      throw new Error("invalidate requires --phase <phase>");
    }
    if (!reason) {
      throw new Error("invalidate requires --reason <reason>");
    }

    invalidateFeature(featureId, phase, reason);
    print(`Invalidated ${featureId} phase ${phase}`);
    return 0;
  }

  if (cmd === "apply-deltas") {
    const parsed = parseCommandArgs(argv.slice(1));
    const featureId = parsed.positionals[0];
    if (!featureId) {
      throw new Error("apply-deltas requires <feature-id>");
    }

    const summary = applyDeltas(featureId);
    print(`Validated deltas: ${summary.validated}`);
    print(`Applied deltas: ${summary.applied}`);
    print(`Skipped deltas: ${summary.skipped}`);
    return 0;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

try {
  const code = main();
  process.exit(code);
} catch (error) {
  printErr(`Error: ${error.message}`);
  if (error.summary) {
    printErr(JSON.stringify(error.summary, null, 2));
  }
  printErr(usage());
  process.exit(1);
}
