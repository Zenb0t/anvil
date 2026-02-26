import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chunkText, loadAttractorDocuments } from "./attractor-loader";
import { CxdbClient } from "./cxdb-client";

interface ManifestDocument {
  name: string;
  path: string;
  chunks: number;
  chars: number;
}

interface FactoryManifest {
  created_at: string;
  context_id: string;
  cxdb_base_url: string;
  attractor_dir: string;
  docs: ManifestDocument[];
}

const MANIFEST_FILE = path.resolve(process.cwd(), ".factory-context.json");

function printUsage(): void {
  console.log(
    [
      "Factory CLI (Attractor + CXDB)",
      "",
      "Commands:",
      "  init [--cxdb-url URL] [--attractor-dir DIR] [--chunk-size N] [--context ID]",
      "  status [--cxdb-url URL]",
      "  task --text \"...\" [--context ID] [--cxdb-url URL]",
      "",
      "Examples:",
      "  bun run src/factory-cli.ts init",
      "  bun run src/factory-cli.ts status",
      "  bun run src/factory-cli.ts task --text \"Implement wait.human node\"",
    ].join("\n"),
  );
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function readIntFlag(args: string[], flag: string, defaultValue: number): number {
  const value = readFlag(args, flag);
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid integer for ${flag}: ${value}`);
  }
  return parsed;
}

async function readManifest(): Promise<FactoryManifest | null> {
  if (!existsSync(MANIFEST_FILE)) {
    return null;
  }

  const raw = await readFile(MANIFEST_FILE, "utf8");
  return JSON.parse(raw) as FactoryManifest;
}

async function writeManifest(manifest: FactoryManifest): Promise<void> {
  await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

function createClient(args: string[]): CxdbClient {
  const cxdbUrl = readFlag(args, "--cxdb-url") ?? process.env.CXDB_BASE_URL;
  return new CxdbClient(cxdbUrl);
}

async function runInit(args: string[]): Promise<void> {
  const client = createClient(args);
  const chunkSize = readIntFlag(args, "--chunk-size", 12000);
  const attractorDir = readFlag(args, "--attractor-dir") ?? "attractor";
  const requestedContextId = readFlag(args, "--context");

  const contextId =
    requestedContextId ?? String((await client.createContext("0")).context_id);

  const docs = await loadAttractorDocuments(attractorDir);
  const manifestDocs: ManifestDocument[] = [];

  for (const doc of docs) {
    const chunks = chunkText(doc.content, chunkSize);
    for (let i = 0; i < chunks.length; i += 1) {
      await client.appendTurn(contextId, {
        type_id: "factory.AttractorSpecChunk",
        type_version: 1,
        data: {
          source: "attractor",
          document_name: doc.name,
          document_path: doc.path,
          chunk_index: i + 1,
          chunk_count: chunks.length,
          content: chunks[i],
        },
      });
    }

    manifestDocs.push({
      name: doc.name,
      path: doc.path,
      chunks: chunks.length,
      chars: doc.content.length,
    });
  }

  await client.appendTurn(contextId, {
    type_id: "factory.FactoryBootstrap",
    type_version: 1,
    data: {
      initialized_at: new Date().toISOString(),
      docs_loaded: manifestDocs.length,
      docs: manifestDocs,
    },
  });

  const manifest: FactoryManifest = {
    created_at: new Date().toISOString(),
    context_id: contextId,
    cxdb_base_url: client.baseUrl,
    attractor_dir: path.resolve(process.cwd(), attractorDir),
    docs: manifestDocs,
  };

  await writeManifest(manifest);

  console.log(`Factory initialized in context ${contextId}`);
  console.log(`CXDB: ${client.baseUrl}`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
  console.log(`Loaded ${manifestDocs.length} Attractor docs (${manifestDocs.map((d) => d.chunks).reduce((a, b) => a + b, 0)} chunks).`);
}

async function runStatus(args: string[]): Promise<void> {
  const client = createClient(args);
  const contexts = await client.listContexts();
  const manifest = await readManifest();

  console.log(`CXDB reachable: ${client.baseUrl}`);
  console.log("Contexts payload:");
  console.log(JSON.stringify(contexts, null, 2));

  if (manifest) {
    console.log("");
    console.log("Local manifest:");
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log("");
    console.log(`No manifest found at ${MANIFEST_FILE}. Run init first.`);
  }
}

async function runTask(args: string[]): Promise<void> {
  const client = createClient(args);
  const manifest = await readManifest();

  const contextId = readFlag(args, "--context") ?? manifest?.context_id;
  if (!contextId) {
    throw new Error("Missing context id. Pass --context <id> or run init first.");
  }

  const text = readFlag(args, "--text");
  if (!text) {
    throw new Error("Missing task text. Pass --text \"...\".");
  }

  const response = await client.appendTurn(contextId, {
    type_id: "factory.Task",
    type_version: 1,
    data: {
      role: "user",
      text,
      created_at: new Date().toISOString(),
    },
  });

  console.log(`Task appended to context ${contextId}`);
  console.log(JSON.stringify(response, null, 2));
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "init") {
    await runInit(commandArgs);
    return;
  }

  if (command === "status") {
    await runStatus(commandArgs);
    return;
  }

  if (command === "task") {
    await runTask(commandArgs);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
