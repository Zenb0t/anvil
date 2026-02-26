import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadCheckpoint, saveCheckpoint, defaultCheckpointPath } from "./checkpoint";
import { evaluateCondition } from "./condition";
import {
  getBooleanAttr,
  getGraphNumberAttr,
  getNumberAttr,
  getOutgoingEdges,
  getStringAttr,
  isExitNode,
  isStartNode,
  resolveRetryTarget,
  setContextValue,
} from "./graph-utils";
import { HandlerContext, HandlerRegistry } from "./handlers";
import { AutoApproveInterviewer } from "./interviewer";
import { applyTransforms } from "./transforms";
import {
  CheckpointState,
  CodergenBackend,
  GraphTransform,
  HandlerOutcome,
  Interviewer,
  ParsedEdge,
  ParsedGraph,
  ParsedNode,
  RunResult,
} from "./types";
import { validateOrThrow } from "./validator";

export interface EngineEvent {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface EngineOptions {
  logs_root?: string;
  checkpoint_path?: string;
  resume?: boolean;
  interviewer?: Interviewer;
  codergen_backend?: CodergenBackend;
  handler_registry?: HandlerRegistry;
  transforms?: GraphTransform[];
  on_event?: (event: EngineEvent) => void;
}

interface RunState {
  current_node: string;
  completed_nodes: string[];
  retry_counts: Record<string, number>;
  node_outcomes: Record<string, HandlerOutcome["status"]>;
  context: Record<string, unknown>;
}

export class AttractorEngine {
  readonly graph: ParsedGraph;
  readonly logsRoot: string;
  readonly checkpointPath: string;
  private readonly registry: HandlerRegistry;
  private readonly options: EngineOptions;

  constructor(graph: ParsedGraph, options: EngineOptions = {}) {
    const transformed = applyTransforms(graph, options.transforms ?? []);
    validateOrThrow(transformed);

    const interviewer = options.interviewer ?? new AutoApproveInterviewer();
    const registry =
      options.handler_registry ??
      new HandlerRegistry(interviewer, options.codergen_backend);

    this.graph = transformed;
    this.registry = registry;
    this.options = options;
    this.logsRoot = options.logs_root ?? makeDefaultLogsRoot(transformed.id);
    this.checkpointPath =
      options.checkpoint_path ?? defaultCheckpointPath(this.logsRoot);
  }

  async run(): Promise<RunResult> {
    await mkdir(this.logsRoot, { recursive: true });

    const state = await this.initializeState();
    this.emit("run.started", {
      graph_id: this.graph.id,
      logs_root: this.logsRoot,
      checkpoint_path: this.checkpointPath,
      resumed: this.options.resume === true,
    });

    while (true) {
      const node = this.graph.nodes.get(state.current_node);
      if (!node) {
        return this.failRun(state, `Current node '${state.current_node}' not found.`);
      }

      this.emit("node.started", { node_id: node.id });

      if (isExitNode(node)) {
        const unsatisfied = this.findUnsatisfiedGoalGate(state.node_outcomes);
        if (unsatisfied) {
          const target = resolveRetryTarget(unsatisfied, this.graph);
          if (target) {
            this.emit("goal_gate.retry_target", {
              failed_gate: unsatisfied.id,
              retry_target: target,
            });
            state.current_node = target;
            await this.persistCheckpoint(state);
            continue;
          }
          return this.failRun(
            state,
            `Goal gate '${unsatisfied.id}' is unsatisfied and no retry target is configured.`,
          );
        }
        await this.persistCheckpoint(state);
        this.emit("run.completed", { status: "success", current_node: node.id });
        return {
          status: "success",
          logs_root: this.logsRoot,
          current_node: node.id,
          completed_nodes: state.completed_nodes,
          node_outcomes: state.node_outcomes,
          context: state.context,
        };
      }

      const outgoingEdges = getOutgoingEdges(this.graph, node.id);
      const stageDir = path.join(this.logsRoot, node.id);
      await mkdir(stageDir, { recursive: true });

      const outcome = await this.executeNodeWithRetry(node, state, stageDir, outgoingEdges);
      state.completed_nodes.push(node.id);
      state.node_outcomes[node.id] = outcome.status;
      this.mergeContextUpdates(state.context, outcome);

      await writeFile(
        path.join(stageDir, "status.json"),
        JSON.stringify(
          {
            outcome: outcome.status,
            preferred_next_label: outcome.preferred_label ?? "",
            suggested_next_ids: outcome.suggested_next_ids ?? [],
            context_updates: outcome.context_updates ?? {},
            notes: outcome.notes ?? "",
          },
          null,
          2,
        ),
        "utf8",
      );

      const nextEdge = selectNextEdge(
        outgoingEdges,
        outcome,
        state.context,
        state.node_outcomes,
      );
      if (!nextEdge) {
        return this.failRun(
          state,
          `No eligible outgoing edge from node '${node.id}'.`,
        );
      }

      this.emit("edge.selected", {
        from: nextEdge.from,
        to: nextEdge.to,
        edge_id: nextEdge.id,
        label: nextEdge.attrs.label ?? "",
      });

      state.current_node = nextEdge.to;
      await this.persistCheckpoint(state);
    }
  }

  private async initializeState(): Promise<RunState> {
    if (this.options.resume && existsSync(this.checkpointPath)) {
      const checkpoint = await loadCheckpoint(this.checkpointPath);
      this.emit("checkpoint.loaded", {
        checkpoint_path: this.checkpointPath,
        current_node: checkpoint.current_node,
      });
      return {
        current_node: checkpoint.current_node,
        completed_nodes: [...checkpoint.completed_nodes],
        retry_counts: { ...checkpoint.retry_counts },
        node_outcomes: { ...checkpoint.node_outcomes },
        context: { ...checkpoint.context },
      };
    }

    const context: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.graph.attrs)) {
      setContextValue(context, `graph.${key}`, value);
    }

    const startNode = findStartNode(this.graph);
    if (!startNode) {
      throw new Error("Failed to resolve start node after validation.");
    }

    return {
      current_node: startNode.id,
      completed_nodes: [],
      retry_counts: {},
      node_outcomes: {},
      context,
    };
  }

  private async executeNodeWithRetry(
    node: ParsedNode,
    state: RunState,
    stageDir: string,
    outgoingEdges: ParsedEdge[],
  ): Promise<HandlerOutcome> {
    const maxRetries = resolveMaxRetries(node, this.graph);
    const allowPartial = getBooleanAttr(node, "allow_partial", false);
    let attempt = 0;
    let lastOutcome: HandlerOutcome = {
      status: "fail",
      notes: "handler did not execute",
    };

    while (true) {
      this.emit("node.attempt.started", { node_id: node.id, attempt });
      const handler = this.registry.resolve(node);
      const interviewer = this.options.interviewer ?? new AutoApproveInterviewer();
      const handlerContext: HandlerContext = {
        graph: this.graph,
        node,
        context: state.context,
        logs_root: this.logsRoot,
        stage_dir: stageDir,
        outgoing_edges: outgoingEdges,
        interviewer,
        codergen_backend:
          this.options.codergen_backend ??
          ({
            run: async () => "No codergen backend configured.",
          } satisfies CodergenBackend),
      };

      lastOutcome = await handler(handlerContext);
      const normalized = normalizeOutcome(lastOutcome);
      lastOutcome = normalized;

      this.emit("node.attempt.completed", {
        node_id: node.id,
        attempt,
        status: normalized.status,
      });

      if (normalized.status === "success") {
        return normalized;
      }
      if (normalized.status === "partial_success" && allowPartial) {
        return normalized;
      }

      const shouldRetry =
        normalized.status === "retry" || normalized.status === "fail";
      if (shouldRetry && attempt < maxRetries) {
        attempt += 1;
        state.retry_counts[node.id] = attempt;
        const delayMs = computeRetryDelay(node, this.graph, attempt);
        this.emit("node.retrying", { node_id: node.id, attempt, delay_ms: delayMs });
        await sleep(delayMs);
        continue;
      }

      if (allowPartial && normalized.status === "fail") {
        return {
          ...normalized,
          status: "partial_success",
          notes: normalized.notes ?? "allow_partial converted fail to partial_success",
        };
      }

      return normalized;
    }
  }

  private mergeContextUpdates(
    context: Record<string, unknown>,
    outcome: HandlerOutcome,
  ): void {
    if (outcome.context_updates) {
      for (const [key, value] of Object.entries(outcome.context_updates)) {
        setContextValue(context, key, value);
      }
    }
    setContextValue(context, "outcome", outcome.status);
    if (outcome.preferred_label && outcome.preferred_label.length > 0) {
      setContextValue(context, "preferred_label", outcome.preferred_label);
    }
  }

  private async persistCheckpoint(state: RunState): Promise<void> {
    const now = new Date().toISOString();
    const checkpoint: CheckpointState = {
      graph_id: this.graph.id,
      logs_root: this.logsRoot,
      current_node: state.current_node,
      completed_nodes: state.completed_nodes,
      retry_counts: state.retry_counts,
      node_outcomes: state.node_outcomes,
      context: state.context,
      created_at: now,
      updated_at: now,
    };
    await saveCheckpoint(checkpoint, this.checkpointPath);
  }

  private findUnsatisfiedGoalGate(
    outcomes: Record<string, HandlerOutcome["status"]>,
  ): ParsedNode | null {
    for (const node of this.graph.nodes.values()) {
      if (!getBooleanAttr(node, "goal_gate", false)) {
        continue;
      }
      if (outcomes[node.id] !== "success") {
        return node;
      }
    }
    return null;
  }

  private emit(type: string, payload: Record<string, unknown>): void {
    if (!this.options.on_event) {
      return;
    }
    this.options.on_event({
      type,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  private async failRun(state: RunState, reason: string): Promise<RunResult> {
    this.emit("run.failed", { reason, current_node: state.current_node });
    await this.persistCheckpoint(state);
    return {
      status: "fail",
      logs_root: this.logsRoot,
      current_node: state.current_node,
      completed_nodes: state.completed_nodes,
      node_outcomes: state.node_outcomes,
      context: { ...state.context, failure_reason: reason },
    };
  }
}

function normalizeOutcome(outcome: HandlerOutcome): HandlerOutcome {
  const allowed = new Set(["success", "retry", "fail", "partial_success"]);
  if (allowed.has(outcome.status)) {
    return outcome;
  }
  return {
    ...outcome,
    status: "fail",
    notes: outcome.notes
      ? `${outcome.notes} (invalid status '${outcome.status}')`
      : `Invalid status '${outcome.status}'`,
  };
}

function findStartNode(graph: ParsedGraph): ParsedNode | null {
  const byShape = Array.from(graph.nodes.values()).find((node) => isStartNode(node));
  if (byShape) {
    return byShape;
  }
  const byId = graph.nodes.get("start") ?? graph.nodes.get("Start");
  return byId ?? null;
}

function resolveMaxRetries(node: ParsedNode, graph: ParsedGraph): number {
  const nodeRetries = getNumberAttr(node, "max_retries", 0);
  if (node.explicitAttrs.has("max_retries")) {
    return Math.max(0, nodeRetries);
  }
  const graphDefault = getGraphNumberAttr(graph, "default_max_retry", 0);
  return Math.max(0, graphDefault);
}

function computeRetryDelay(
  node: ParsedNode,
  graph: ParsedGraph,
  attempt: number,
): number {
  const baseDelay = Math.max(0, getNumberAttr(node, "retry_backoff_ms", 500));
  const strategy = (getStringAttr(node, "retry_backoff") ?? "exponential").toLowerCase();
  const jitter = getBooleanAttr(node, "retry_jitter", true);
  const maxDelay = Math.max(100, getGraphNumberAttr(graph, "max_retry_delay_ms", 30_000));

  let delay = baseDelay;
  if (strategy === "constant") {
    delay = baseDelay;
  } else if (strategy === "linear") {
    delay = baseDelay * (attempt + 1);
  } else {
    delay = baseDelay * Math.pow(2, Math.max(0, attempt));
  }
  delay = Math.min(delay, maxDelay);

  if (jitter) {
    const variance = Math.max(1, Math.floor(delay * 0.2));
    const delta = Math.floor(Math.random() * (variance * 2 + 1)) - variance;
    delay = Math.max(0, delay + delta);
  }
  return delay;
}

function selectNextEdge(
  outgoingEdges: ParsedEdge[],
  outcome: HandlerOutcome,
  context: Record<string, unknown>,
  nodeOutcomes: Record<string, HandlerOutcome["status"]>,
): ParsedEdge | null {
  if (outgoingEdges.length === 0) {
    return null;
  }

  const eligible = outgoingEdges.filter((edge) => {
    const condition = edge.attrs.condition;
    if (typeof condition !== "string" || condition.trim().length === 0) {
      return true;
    }
    return evaluateCondition(
      condition,
      {
        status: outcome.status,
        preferred_label: outcome.preferred_label,
      },
      { ...context, node_outcomes: nodeOutcomes },
    );
  });

  if (eligible.length === 0) {
    return null;
  }

  let narrowed = [...eligible];

  if (outcome.preferred_label && outcome.preferred_label.length > 0) {
    const byLabel = narrowed.filter(
      (edge) =>
        typeof edge.attrs.label === "string" &&
        edge.attrs.label === outcome.preferred_label,
    );
    if (byLabel.length > 0) {
      narrowed = byLabel;
    }
  }

  if (outcome.suggested_next_ids && outcome.suggested_next_ids.length > 0) {
    for (const suggested of outcome.suggested_next_ids) {
      const bySuggested = narrowed.filter((edge) => edge.to === suggested);
      if (bySuggested.length > 0) {
        narrowed = bySuggested;
        break;
      }
    }
  }

  narrowed.sort((a, b) => {
    const aWeight = toWeight(a.attrs.weight);
    const bWeight = toWeight(b.attrs.weight);
    if (aWeight !== bWeight) {
      return bWeight - aWeight;
    }
    if (a.to !== b.to) {
      return a.to.localeCompare(b.to);
    }
    return a.id.localeCompare(b.id);
  });

  return narrowed[0] ?? null;
}

function toWeight(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function makeDefaultLogsRoot(graphId: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  return path.resolve(process.cwd(), ".attractor-runs", `${graphId}-${timestamp}`);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}
