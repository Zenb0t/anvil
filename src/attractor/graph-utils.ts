import { ParsedEdge, ParsedGraph, ParsedNode } from "./types";

export const SHAPE_HANDLER_MAP: Record<string, string> = {
  Mdiamond: "start",
  Msquare: "exit",
  box: "codergen",
  hexagon: "wait.human",
  diamond: "conditional",
  component: "parallel",
  tripleoctagon: "parallel.fan_in",
  parallelogram: "tool",
  house: "stack.manager_loop",
};

export function getNodeType(node: ParsedNode): string {
  const explicitType = getStringAttr(node, "type");
  if (explicitType) {
    return explicitType;
  }
  const shape = getStringAttr(node, "shape") ?? "box";
  return SHAPE_HANDLER_MAP[shape] ?? "codergen";
}

export function getStringAttr(node: ParsedNode, key: string): string | undefined {
  const value = node.attrs[key];
  return typeof value === "string" ? value : undefined;
}

export function getGraphStringAttr(
  graph: ParsedGraph,
  key: string,
): string | undefined {
  const value = graph.attrs[key];
  return typeof value === "string" ? value : undefined;
}

export function getBooleanAttr(
  node: ParsedNode,
  key: string,
  defaultValue = false,
): boolean {
  const value = node.attrs[key];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (lowered === "true") {
      return true;
    }
    if (lowered === "false") {
      return false;
    }
  }
  return defaultValue;
}

export function getNumberAttr(
  node: ParsedNode,
  key: string,
  defaultValue: number,
): number {
  const value = node.attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

export function getGraphNumberAttr(
  graph: ParsedGraph,
  key: string,
  defaultValue: number,
): number {
  const value = graph.attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

export function isStartNode(node: ParsedNode): boolean {
  return getNodeType(node) === "start";
}

export function isExitNode(node: ParsedNode): boolean {
  return getNodeType(node) === "exit";
}

export function getOutgoingEdges(graph: ParsedGraph, nodeId: string): ParsedEdge[] {
  return graph.edges.filter((edge) => edge.from === nodeId);
}

export function getIncomingEdges(graph: ParsedGraph, nodeId: string): ParsedEdge[] {
  return graph.edges.filter((edge) => edge.to === nodeId);
}

export function resolveRetryTarget(
  node: ParsedNode | null,
  graph: ParsedGraph,
): string | null {
  const nodePrimary = node ? getStringAttr(node, "retry_target") : undefined;
  const nodeFallback = node ? getStringAttr(node, "fallback_retry_target") : undefined;
  const graphPrimary = getGraphStringAttr(graph, "retry_target");
  const graphFallback = getGraphStringAttr(graph, "fallback_retry_target");

  for (const candidate of [nodePrimary, nodeFallback, graphPrimary, graphFallback]) {
    if (!candidate) {
      continue;
    }
    if (graph.nodes.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function setContextValue(
  context: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  context[key] = value;
  if (!key.includes(".")) {
    return;
  }

  const parts = key.split(".");
  let cursor: Record<string, unknown> = context;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const existing = cursor[part];
    if (typeof existing !== "object" || existing === null || Array.isArray(existing)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}
