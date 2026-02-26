# Attractor + CXDB Factory (Bun + TypeScript)

This repository bootstraps a local "factory context" by loading the Attractor NL specs into [CXDB](https://github.com/strongdm/cxdb) as typed turns.

## Prerequisites

- Bun (installed)
- Docker (recommended for running CXDB quickly)
- Local Attractor docs in `./attractor` (already cloned in this workspace)

## 1) Start CXDB

The `cxdb/cxdb:latest` tag referenced in upstream docs may not be published publicly, so build it locally first:

```bash
git clone https://github.com/strongdm/cxdb.git cxdb-upstream
docker build -t cxdb/cxdb:latest ./cxdb-upstream
```

Then run it:

```bash
docker run -p 9009:9009 -p 9010:80 -v $(pwd)/data:/data cxdb/cxdb:latest
```

On PowerShell, prefer `--mount`:

```powershell
New-Item -ItemType Directory -Force .\data | Out-Null
$DATA = (Resolve-Path .\data).Path
docker run -p 9009:9009 -p 9010:80 --mount "type=bind,source=$DATA,target=/data" cxdb/cxdb:latest
```

HTTP API will be available at `http://localhost:9010`.

## 2) Install dependencies

```bash
bun install
```

## 3) Initialize the factory context

```bash
bun run factory:init
```

What this does:

- Creates a CXDB context
- Reads these Attractor docs from `./attractor`:
  - `README.md`
  - `attractor-spec.md`
  - `coding-agent-loop-spec.md`
  - `unified-llm-spec.md`
- Chunks each doc and appends chunks as `factory.AttractorSpecChunk` turns
- Writes `.factory-context.json` with context metadata

## 4) Check status

```bash
bun run factory:status
```

## 5) Append a new task

```bash
bun run factory:task --text "Implement wait.human gate in pipeline runtime"
```

Optional flags:

- `--context <id>`: override context id
- `--cxdb-url <url>`: override CXDB base URL (default `http://localhost:9010`)
- `--attractor-dir <dir>`: override Attractor docs directory for `init`
- `--chunk-size <n>`: override chunk size for `init` (default `12000`)

## 6) Run Attractor DOT Pipelines (MVP Runtime)

This repository now also includes a local Attractor DOT parser/validator/runtime.

Lint a pipeline:

```bash
bun run src/attractor-cli.ts lint examples/smoke.dot
```

Run a pipeline:

```bash
bun run src/attractor-cli.ts run examples/smoke.dot --auto-approve
```

Useful flags:

- `--logs-root <dir>`: custom logs/checkpoint directory
- `--resume`: resume from `checkpoint.json` in the logs directory
- `--auto-approve`: auto-select first option for `wait.human`
- `--answer <value>`: queued answer (repeatable) for non-interactive runs
- `--codergen-order codex,claude`: provider attempt order for codergen nodes
- `--codergen-backend multi|echo`: use real Codex+Claude backend (`multi`, default) or local echo backend (`echo`)
- `--verbose`: print runtime events

Codergen backend defaults to trying both CLIs in order (`codex` then `claude`).
You can override commands and args through env vars:

- `ATTRACTOR_CODEGEN_PROVIDER_ORDER` (default: `codex,claude`)
- `ATTRACTOR_CODEX_BIN` (default on Windows: `codex.cmd`)
- `ATTRACTOR_CODEX_ARGS` (default: `exec --skip-git-repo-check --full-auto`)
- `ATTRACTOR_CLAUDE_BIN` (default: `claude`)
- `ATTRACTOR_CLAUDE_ARGS` (default: `-p`)

Node-level provider hints are supported via `llm_provider`:

- values containing `openai` or `codex` prefer Codex
- values containing `anthropic` or `claude` prefer Claude Code
