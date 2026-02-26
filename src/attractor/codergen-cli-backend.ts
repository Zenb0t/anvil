import { exec as childProcessExec } from "node:child_process";
import { promisify } from "node:util";

import { CodergenBackend, CodergenRequest, CodergenResponse } from "./types";

type CliProvider = "codex" | "claude";

const exec = promisify(childProcessExec);

interface CliProviderConfig {
  id: CliProvider;
  command: string;
  base_args: string[];
  prompt_mode: "arg" | "stdin";
  model_flag?: string;
  reasoning_effort_flag?: string;
  default_timeout_ms: number;
  shell: boolean;
}

export interface MultiCliCodergenBackendOptions {
  provider_order?: CliProvider[];
  fallback_on_error?: boolean;
  codex?: Partial<CliProviderConfig>;
  claude?: Partial<CliProviderConfig>;
  cwd?: string;
}

export class MultiCliCodergenBackend implements CodergenBackend {
  private readonly configs: Record<CliProvider, CliProviderConfig>;
  private readonly providerOrder: CliProvider[];
  private readonly fallbackOnError: boolean;
  private readonly cwd: string;

  constructor(options: MultiCliCodergenBackendOptions = {}) {
    const codexDefaults: CliProviderConfig = {
      id: "codex",
      command: process.env.ATTRACTOR_CODEX_BIN ?? defaultCodexCommand(),
      base_args: parseArgs(
        process.env.ATTRACTOR_CODEX_ARGS ??
          "exec --skip-git-repo-check --full-auto",
      ),
      prompt_mode:
        (process.env.ATTRACTOR_CODEX_PROMPT_MODE as "arg" | "stdin") ?? "arg",
      model_flag: process.env.ATTRACTOR_CODEX_MODEL_FLAG ?? "-m",
      default_timeout_ms: parseIntegerEnv("ATTRACTOR_CODEX_TIMEOUT_MS", 10 * 60_000),
      shell: process.platform === "win32",
    };

    const claudeDefaults: CliProviderConfig = {
      id: "claude",
      command: process.env.ATTRACTOR_CLAUDE_BIN ?? "claude",
      base_args: parseArgs(process.env.ATTRACTOR_CLAUDE_ARGS ?? "-p"),
      prompt_mode:
        (process.env.ATTRACTOR_CLAUDE_PROMPT_MODE as "arg" | "stdin") ?? "arg",
      model_flag: process.env.ATTRACTOR_CLAUDE_MODEL_FLAG ?? "--model",
      reasoning_effort_flag:
        process.env.ATTRACTOR_CLAUDE_REASONING_EFFORT_FLAG ?? "--effort",
      default_timeout_ms: parseIntegerEnv("ATTRACTOR_CLAUDE_TIMEOUT_MS", 10 * 60_000),
      shell: false,
    };

    this.configs = {
      codex: { ...codexDefaults, ...(options.codex ?? {}) },
      claude: { ...claudeDefaults, ...(options.claude ?? {}) },
    };

    const orderFromEnv = parseProviderOrder(
      process.env.ATTRACTOR_CODEGEN_PROVIDER_ORDER ?? "codex,claude",
    );
    const providedOrder = options.provider_order ?? orderFromEnv;
    this.providerOrder = normalizeProviderOrder(providedOrder);

    this.fallbackOnError = options.fallback_on_error ?? true;
    this.cwd = options.cwd ?? process.cwd();
  }

  async run(request: CodergenRequest): Promise<CodergenResponse> {
    const providerHint = normalizeProviderHint(request.provider ?? request.model);
    const providers = this.resolveProviderAttempts(providerHint);
    const failures: string[] = [];

    for (const provider of providers) {
      const config = this.configs[provider];
      if (!config) {
        failures.push(`Provider '${provider}' is not configured.`);
        continue;
      }

      try {
        const output = await runCliProvider(config, request, this.cwd);
        return {
          text: output.text,
          status: "success",
          context_updates: {
            codergen: {
              provider,
              model: request.model ?? "",
            },
          },
          notes: `codergen completed using ${provider}`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`[${provider}] ${message}`);
        if (!this.fallbackOnError) {
          break;
        }
      }
    }

    return {
      text: failures.join("\n\n"),
      status: "fail",
      context_updates: {
        codergen: {
          failed_providers: providers,
        },
      },
      notes: "all configured codergen providers failed",
    };
  }

  private resolveProviderAttempts(hint: CliProvider | null): CliProvider[] {
    if (!hint) {
      return this.providerOrder;
    }
    const rest = this.providerOrder.filter((provider) => provider !== hint);
    return [hint, ...rest];
  }
}

async function runCliProvider(
  config: CliProviderConfig,
  request: CodergenRequest,
  cwd: string,
): Promise<{ text: string }> {
  const args = [...config.base_args];

  if (request.model && config.model_flag) {
    args.push(config.model_flag, request.model);
  }

  if (request.reasoning_effort && config.reasoning_effort_flag) {
    args.push(config.reasoning_effort_flag, request.reasoning_effort);
  }

  args.push(request.prompt);

  const timeoutMs =
    request.timeout_ms && request.timeout_ms > 0
      ? request.timeout_ms
      : config.default_timeout_ms;

  const commandLine = buildCommandLine(config.command, args);
  try {
    const { stdout, stderr } = await exec(commandLine, {
      cwd,
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
      env: process.env,
      shell: config.shell,
    });
    return { text: stdout.trim() || stderr.trim() };
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      killed?: boolean;
      signal?: string;
    };
    const reason =
      (err.stderr ?? "").trim() ||
      (err.stdout ?? "").trim() ||
      err.message ||
      "command failed";
    throw new Error(reason);
  }
}

function normalizeProviderHint(value: string | undefined): CliProvider | null {
  if (!value) {
    return null;
  }
  const lowered = value.toLowerCase();
  if (lowered.includes("codex") || lowered.includes("openai")) {
    return "codex";
  }
  if (lowered.includes("claude") || lowered.includes("anthropic")) {
    return "claude";
  }
  return null;
}

function parseProviderOrder(raw: string): CliProvider[] {
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => (value === "claude" ? "claude" : value === "codex" ? "codex" : null))
    .filter((value): value is CliProvider => value !== null);
}

function normalizeProviderOrder(values: CliProvider[]): CliProvider[] {
  const ordered: CliProvider[] = [];
  for (const value of values) {
    if (!ordered.includes(value)) {
      ordered.push(value);
    }
  }
  if (ordered.length === 0) {
    return ["codex", "claude"];
  }
  return ordered;
}

function parseArgs(raw: string): string[] {
  const args: string[] = [];
  const pattern = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    const [, dblQuoted, singleQuoted, bare] = match;
    if (dblQuoted !== undefined) {
      args.push(dblQuoted.replace(/\\"/g, "\""));
      continue;
    }
    if (singleQuoted !== undefined) {
      args.push(singleQuoted.replace(/\\'/g, "'"));
      continue;
    }
    args.push(bare);
  }
  return args;
}

function buildCommandLine(command: string, args: string[]): string {
  return [quoteArg(command), ...args.map(quoteArg)].join(" ");
}

function quoteArg(value: string): string {
  if (value.length === 0) {
    return "\"\"";
  }
  if (!/[ \t"\n\r]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

function defaultCodexCommand(): string {
  if (process.platform === "win32") {
    return "codex.cmd";
  }
  return "codex";
}

function parseIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}
