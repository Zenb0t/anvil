import { exec as childProcessExec } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

import { getNodeType, getStringAttr } from "./graph-utils";
import { AutoApproveInterviewer } from "./interviewer";
import {
  CodergenBackend,
  CodergenRequest,
  HandlerOutcome,
  Interviewer,
  ParsedEdge,
  ParsedGraph,
  ParsedNode,
} from "./types";

const exec = promisify(childProcessExec);

export interface HandlerContext {
  graph: ParsedGraph;
  node: ParsedNode;
  context: Record<string, unknown>;
  logs_root: string;
  stage_dir: string;
  outgoing_edges: ParsedEdge[];
  interviewer: Interviewer;
  codergen_backend: CodergenBackend;
}

export type NodeHandler = (context: HandlerContext) => Promise<HandlerOutcome>;

export class HandlerRegistry {
  private readonly handlers = new Map<string, NodeHandler>();

  constructor(
    interviewer: Interviewer = new AutoApproveInterviewer(),
    codergenBackend: CodergenBackend = new EchoCodergenBackend(),
  ) {
    this.registerDefaults(interviewer, codergenBackend);
  }

  register(type: string, handler: NodeHandler): void {
    this.handlers.set(type, handler);
  }

  resolve(node: ParsedNode): NodeHandler {
    const type = getNodeType(node);
    const handler = this.handlers.get(type);
    if (handler) {
      return handler;
    }
    const fallback = this.handlers.get("codergen");
    if (!fallback) {
      throw new Error(`No handler registered for type '${type}'.`);
    }
    return fallback;
  }

  private registerDefaults(interviewer: Interviewer, codergenBackend: CodergenBackend): void {
    this.register("start", async () => ({ status: "success", notes: "start node" }));
    this.register("exit", async () => ({ status: "success", notes: "exit node" }));
    this.register("conditional", async () => ({
      status: "success",
      notes: "conditional pass-through",
    }));
    this.register("parallel", async () => ({
      status: "success",
      notes: "parallel node (sequential fallback in MVP)",
    }));
    this.register("parallel.fan_in", async () => ({
      status: "success",
      notes: "parallel fan-in node",
    }));
    this.register("stack.manager_loop", async () => ({
      status: "success",
      notes: "stack manager loop node",
    }));

    this.register("wait.human", async (ctx) => waitHumanHandler(ctx, interviewer));
    this.register("tool", toolHandler);
    this.register("codergen", async (ctx) => codergenHandler(ctx, codergenBackend));
  }
}

export class EchoCodergenBackend implements CodergenBackend {
  async run(request: CodergenRequest): Promise<string> {
    return [
      "No codergen backend configured.",
      "This run captured the prompt and marked the node as success.",
      "",
      request.prompt,
    ].join("\n");
  }
}

async function codergenHandler(
  ctx: HandlerContext,
  backend: CodergenBackend,
): Promise<HandlerOutcome> {
  const prompt =
    getStringAttr(ctx.node, "prompt") ??
    getStringAttr(ctx.node, "label") ??
    ctx.node.id;

  await mkdir(ctx.stage_dir, { recursive: true });
  await writeFile(`${ctx.stage_dir}/prompt.md`, `${prompt}\n`, "utf8");

  const response = await backend.run({
    prompt,
    node_id: ctx.node.id,
    context: ctx.context,
    model: getStringAttr(ctx.node, "llm_model"),
    provider: getStringAttr(ctx.node, "llm_provider"),
    reasoning_effort: getStringAttr(ctx.node, "reasoning_effort"),
    timeout_ms: parseDurationMs(ctx.node.attrs.timeout),
    logs_root: ctx.logs_root,
  });

  const normalized =
    typeof response === "string"
      ? { text: response, status: "success" as const }
      : {
          text: response.text,
          status: response.status ?? "success",
          preferred_label: response.preferred_label,
          suggested_next_ids: response.suggested_next_ids,
          context_updates: response.context_updates,
          notes: response.notes,
        };

  await writeFile(`${ctx.stage_dir}/response.md`, `${normalized.text}\n`, "utf8");

  return {
    status: normalized.status,
    preferred_label: normalized.preferred_label,
    suggested_next_ids: normalized.suggested_next_ids,
    context_updates: normalized.context_updates,
    notes: normalized.notes ?? "codergen completed",
    response_text: normalized.text,
  };
}

async function waitHumanHandler(
  ctx: HandlerContext,
  interviewer: Interviewer,
): Promise<HandlerOutcome> {
  const options = ctx.outgoing_edges.map((edge) => ({
    id: typeof edge.attrs.label === "string" && edge.attrs.label ? edge.attrs.label : edge.to,
    label:
      typeof edge.attrs.label === "string" && edge.attrs.label
        ? edge.attrs.label
        : edge.to,
    target: edge.to,
  }));

  if (options.length === 0) {
    return {
      status: "fail",
      notes: "wait.human node has no outgoing options",
    };
  }

  const question = getStringAttr(ctx.node, "prompt")
    ? `${getStringAttr(ctx.node, "prompt")!}`
    : `Select next step for ${ctx.node.id}`;

  const answer = await interviewer.ask({
    id: `wait-human:${ctx.node.id}`,
    type: "single_select",
    prompt: question,
    options: options.map((option) => ({
      id: option.id,
      label: option.label,
      description: `Route to ${option.target}`,
    })),
  });

  const selected = answer.selected_ids?.[0] ?? options[0].id;
  const chosen =
    options.find((option) => option.id === selected) ??
    options.find((option) => option.label === selected) ??
    options[0];

  return {
    status: "success",
    preferred_label: chosen.label,
    suggested_next_ids: [chosen.target],
    context_updates: {
      [`wait_human.${ctx.node.id}.selection`]: chosen.label,
      preferred_label: chosen.label,
    },
    notes: `Human selected '${chosen.label}'`,
  };
}

async function toolHandler(ctx: HandlerContext): Promise<HandlerOutcome> {
  const command =
    getStringAttr(ctx.node, "command") ??
    getStringAttr(ctx.node, "prompt") ??
    "";
  if (!command.trim()) {
    return {
      status: "fail",
      notes: "tool node requires command or prompt attribute",
    };
  }

  const timeout = parseDurationMs(ctx.node.attrs.timeout);
  try {
    const result = await exec(command, {
      cwd: process.cwd(),
      timeout: timeout > 0 ? timeout : undefined,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    });
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    await mkdir(ctx.stage_dir, { recursive: true });
    if (output) {
      await writeFile(`${ctx.stage_dir}/response.md`, `${output}\n`, "utf8");
    }
    return {
      status: "success",
      response_text: output,
      context_updates: {
        [`tool.${ctx.node.id}.output`]: output,
      },
      notes: "tool command completed",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await mkdir(ctx.stage_dir, { recursive: true });
    await writeFile(`${ctx.stage_dir}/response.md`, `${message}\n`, "utf8");
    return {
      status: "fail",
      response_text: message,
      context_updates: {
        [`tool.${ctx.node.id}.error`]: message,
      },
      notes: "tool command failed",
    };
  }
}

function parseDurationMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return 0;
  }
  const trimmed = value.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  const match = /^(\d+)(ms|s|m|h|d)$/.exec(trimmed);
  if (!match) {
    return 0;
  }

  const amount = Number.parseInt(match[1], 10);
  switch (match[2]) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60_000;
    case "h":
      return amount * 3_600_000;
    case "d":
      return amount * 86_400_000;
    default:
      return 0;
  }
}
