import path from "node:path";

import { MultiCliCodergenBackend } from "./attractor/codergen-cli-backend";
import { AttractorEngine } from "./attractor/engine";
import { EchoCodergenBackend } from "./attractor/handlers";
import {
  AutoApproveInterviewer,
  ConsoleInterviewer,
  QueueInterviewer,
} from "./attractor/interviewer";
import { loadGraphFromDotFile } from "./attractor/index";
import { validateGraph } from "./attractor/validator";

function printUsage(): void {
  console.log(
    [
      "Attractor CLI",
      "",
      "Commands:",
      "  lint <dotfile>",
      "  run <dotfile> [--logs-root DIR] [--resume] [--auto-approve] [--answer VALUE] [--codergen-order codex,claude] [--codergen-backend multi|echo] [--verbose]",
      "",
      "Examples:",
      "  bun run src/attractor-cli.ts lint examples/pipeline.dot",
      "  bun run src/attractor-cli.ts run examples/pipeline.dot --auto-approve",
    ].join("\n"),
  );
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    return undefined;
  }
  return value;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function readRepeatedFlag(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === flag && args[i + 1]) {
      values.push(args[i + 1]);
      i += 1;
    }
  }
  return values;
}

function firstPositional(args: string[]): string | undefined {
  const valueFlags = new Set([
    "--logs-root",
    "--answer",
    "--codergen-order",
    "--codergen-backend",
  ]);
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (current.startsWith("--")) {
      if (valueFlags.has(current)) {
        i += 1;
      }
      continue;
    }
    return current;
  }
  return undefined;
}

async function runLint(args: string[]): Promise<void> {
  const file = firstPositional(args);
  if (!file) {
    throw new Error("Missing .dot file path.");
  }

  const dotPath = path.resolve(process.cwd(), file);
  const graph = await loadGraphFromDotFile(dotPath);
  const results = validateGraph(graph);

  if (results.length === 0) {
    console.log(`OK: ${dotPath}`);
    return;
  }

  for (const result of results) {
    console.log(
      `${result.severity.toUpperCase()} [${result.rule}] ${result.target}: ${result.message}`,
    );
  }

  const errorCount = results.filter((result) => result.severity === "error").length;
  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

async function runPipeline(args: string[]): Promise<void> {
  const file = firstPositional(args);
  if (!file) {
    throw new Error("Missing .dot file path.");
  }
  const dotPath = path.resolve(process.cwd(), file);
  const graph = await loadGraphFromDotFile(dotPath);

  const answerQueue = readRepeatedFlag(args, "--answer");
  const autoApprove = hasFlag(args, "--auto-approve");
  const resume = hasFlag(args, "--resume");
  const verbose = hasFlag(args, "--verbose");
  const logsRootFlag = readFlag(args, "--logs-root");
  const codergenOrder = readFlag(args, "--codergen-order");
  const codergenBackendFlag = readFlag(args, "--codergen-backend");

  const interviewer = autoApprove
    ? new AutoApproveInterviewer()
    : answerQueue.length > 0
      ? new QueueInterviewer(answerQueue)
      : new ConsoleInterviewer();

  const codergenBackend =
    codergenBackendFlag === "echo"
      ? new EchoCodergenBackend()
      : new MultiCliCodergenBackend({
          provider_order: codergenOrder
            ? codergenOrder
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean)
                .map((value) =>
                  value === "claude"
                    ? "claude"
                    : value === "codex"
                      ? "codex"
                      : null,
                )
                .filter((value): value is "claude" | "codex" => value !== null)
            : undefined,
        });

  const engine = new AttractorEngine(graph, {
    logs_root: logsRootFlag
      ? path.resolve(process.cwd(), logsRootFlag)
      : undefined,
    resume,
    interviewer,
    codergen_backend: codergenBackend,
    on_event: verbose
      ? (event) => {
          console.log(
            `[${event.timestamp}] ${event.type} ${JSON.stringify(event.payload)}`,
          );
        }
      : undefined,
  });

  const result = await engine.run();
  console.log(`Run status: ${result.status}`);
  console.log(`Logs root: ${result.logs_root}`);
  console.log(`Current node: ${result.current_node}`);
  console.log(`Completed nodes: ${result.completed_nodes.join(", ")}`);
  if (result.status !== "success") {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "lint") {
    await runLint(commandArgs);
    return;
  }

  if (command === "run") {
    await runPipeline(commandArgs);
    return;
  }

  throw new Error(`Unknown command '${command}'.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
