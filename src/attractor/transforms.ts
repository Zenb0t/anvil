import { getGraphStringAttr } from "./graph-utils";
import { applyModelStylesheet } from "./stylesheet";
import { GraphTransform, ParsedGraph } from "./types";

export function applyTransforms(
  graph: ParsedGraph,
  transforms: GraphTransform[] = [],
): ParsedGraph {
  let current = graph;

  current = applyGoalExpansion(current);
  current = applyModelStylesheet(current);

  for (const transform of transforms) {
    current = transform.transform(current);
  }

  return current;
}

export function applyGoalExpansion(graph: ParsedGraph): ParsedGraph {
  const goal = getGraphStringAttr(graph, "goal") ?? "";
  if (!goal) {
    return graph;
  }

  for (const node of graph.nodes.values()) {
    const prompt = node.attrs.prompt;
    if (typeof prompt !== "string" || prompt.length === 0) {
      continue;
    }
    node.attrs.prompt = prompt.replace(/\$goal/g, goal);
  }

  return graph;
}
