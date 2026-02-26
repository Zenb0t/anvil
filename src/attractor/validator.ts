import { parseCondition } from "./condition";
import {
  getIncomingEdges,
  getNodeType,
  getOutgoingEdges,
  isExitNode,
  isStartNode,
} from "./graph-utils";
import { LintResult, ParsedGraph } from "./types";

export function validateGraph(graph: ParsedGraph): LintResult[] {
  const results: LintResult[] = [];

  const startNodes = Array.from(graph.nodes.values()).filter((node) => isStartNode(node));
  const exitNodes = Array.from(graph.nodes.values()).filter((node) => isExitNode(node));

  if (startNodes.length !== 1) {
    results.push({
      rule: "graph.single_start",
      severity: "error",
      target: graph.id,
      message: `Exactly one start node is required (found ${startNodes.length}).`,
    });
  }

  if (exitNodes.length !== 1) {
    results.push({
      rule: "graph.single_exit",
      severity: "error",
      target: graph.id,
      message: `Exactly one exit node is required (found ${exitNodes.length}).`,
    });
  }

  const startNode = startNodes[0];
  const exitNode = exitNodes[0];

  if (startNode) {
    const incoming = getIncomingEdges(graph, startNode.id);
    if (incoming.length > 0) {
      results.push({
        rule: "start.no_incoming",
        severity: "error",
        target: startNode.id,
        message: "Start node must not have incoming edges.",
      });
    }
  }

  if (exitNode) {
    const outgoing = getOutgoingEdges(graph, exitNode.id);
    if (outgoing.length > 0) {
      results.push({
        rule: "exit.no_outgoing",
        severity: "error",
        target: exitNode.id,
        message: "Exit node must not have outgoing edges.",
      });
    }
  }

  for (const edge of graph.edges) {
    if (!graph.nodes.has(edge.from)) {
      results.push({
        rule: "edge.source_exists",
        severity: "error",
        target: edge.id,
        message: `Edge source '${edge.from}' does not exist.`,
      });
    }
    if (!graph.nodes.has(edge.to)) {
      results.push({
        rule: "edge.target_exists",
        severity: "error",
        target: edge.id,
        message: `Edge target '${edge.to}' does not exist.`,
      });
    }

    const condition = edge.attrs.condition;
    if (typeof condition === "string" && condition.trim().length > 0) {
      try {
        parseCondition(condition);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown condition parse error";
        results.push({
          rule: "edge.condition_valid",
          severity: "error",
          target: edge.id,
          message: `Invalid edge condition '${condition}': ${message}`,
        });
      }
    }
  }

  for (const node of graph.nodes.values()) {
    const type = getNodeType(node);
    if (type === "codergen") {
      const prompt = node.attrs.prompt;
      if (typeof prompt !== "string" || prompt.trim().length === 0) {
        results.push({
          rule: "codergen.prompt",
          severity: "warning",
          target: node.id,
          message:
            "Codergen node has empty prompt; runtime will fall back to node label.",
        });
      }
    }
  }

  if (startNode) {
    const reachable = computeReachableNodeIds(graph, startNode.id);
    for (const node of graph.nodes.values()) {
      if (!reachable.has(node.id)) {
        results.push({
          rule: "graph.reachability",
          severity: "warning",
          target: node.id,
          message: `Node '${node.id}' is unreachable from start node '${startNode.id}'.`,
        });
      }
    }
  }

  return results;
}

export function validateOrThrow(graph: ParsedGraph): LintResult[] {
  const results = validateGraph(graph);
  const errors = results.filter((result) => result.severity === "error");
  if (errors.length === 0) {
    return results;
  }
  const formatted = errors
    .map((error) => `- [${error.rule}] ${error.target}: ${error.message}`)
    .join("\n");
  throw new Error(`Graph validation failed:\n${formatted}`);
}

function computeReachableNodeIds(graph: ParsedGraph, startNodeId: string): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    for (const edge of getOutgoingEdges(graph, nodeId)) {
      if (!visited.has(edge.to)) {
        queue.push(edge.to);
      }
    }
  }
  return visited;
}
