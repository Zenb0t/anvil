import { AttrValue, ParsedGraph } from "./types";
import { parseClassList } from "./parser";

type SelectorKind = "universal" | "shape" | "class" | "id";

interface StyleSelector {
  raw: string;
  kind: SelectorKind;
  value: string;
  specificity: number;
}

interface StyleRule {
  selectors: StyleSelector[];
  properties: Record<string, AttrValue>;
  order: number;
}

const PROPERTY_ALIASES: Record<string, string> = {
  model: "llm_model",
  provider: "llm_provider",
};

export function applyModelStylesheet(graph: ParsedGraph): ParsedGraph {
  const stylesheet = graph.attrs.model_stylesheet;
  if (typeof stylesheet !== "string" || stylesheet.trim().length === 0) {
    return graph;
  }

  const rules = parseStylesheet(stylesheet);
  if (rules.length === 0) {
    return graph;
  }

  for (const node of graph.nodes.values()) {
    const classSet = new Set(parseClassList(node.attrs.class));
    const shape = typeof node.attrs.shape === "string" ? node.attrs.shape : "box";

    const resolved = new Map<
      string,
      { value: AttrValue; specificity: number; order: number }
    >();

    for (const rule of rules) {
      for (const selector of rule.selectors) {
        if (!matchesSelector(selector, node.id, shape, classSet)) {
          continue;
        }

        for (const [rawKey, value] of Object.entries(rule.properties)) {
          const key = PROPERTY_ALIASES[rawKey] ?? rawKey;
          const current = resolved.get(key);
          if (
            !current ||
            selector.specificity > current.specificity ||
            (selector.specificity === current.specificity &&
              rule.order > current.order)
          ) {
            resolved.set(key, {
              value,
              specificity: selector.specificity,
              order: rule.order,
            });
          }
        }
      }
    }

    for (const [key, state] of resolved.entries()) {
      if (node.explicitAttrs.has(key)) {
        continue;
      }
      node.attrs[key] = state.value;
    }
  }

  return graph;
}

export function parseStylesheet(source: string): StyleRule[] {
  const rules: StyleRule[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  let order = 0;

  while ((match = pattern.exec(source)) !== null) {
    const selectorPart = match[1].trim();
    const bodyPart = match[2].trim();
    if (!selectorPart || !bodyPart) {
      continue;
    }

    const selectors = selectorPart
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map(parseSelector)
      .filter((value): value is StyleSelector => value !== null);

    if (selectors.length === 0) {
      continue;
    }

    const properties = parseProperties(bodyPart);
    if (Object.keys(properties).length === 0) {
      continue;
    }

    rules.push({ selectors, properties, order });
    order += 1;
  }

  return rules;
}

function parseSelector(raw: string): StyleSelector | null {
  if (raw === "*") {
    return { raw, kind: "universal", value: "*", specificity: 0 };
  }
  if (raw.startsWith("#")) {
    const value = raw.slice(1).trim();
    if (!value) {
      return null;
    }
    return { raw, kind: "id", value, specificity: 3 };
  }
  if (raw.startsWith(".")) {
    const value = raw.slice(1).trim();
    if (!value) {
      return null;
    }
    return { raw, kind: "class", value, specificity: 2 };
  }
  return { raw, kind: "shape", value: raw, specificity: 1 };
}

function parseProperties(body: string): Record<string, AttrValue> {
  const properties: Record<string, AttrValue> = {};
  const lines = body
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const equalsIndex = line.indexOf("=");
    const colonIndex = line.indexOf(":");
    let key = "";
    let valueRaw = "";

    if (equalsIndex >= 0) {
      key = line.slice(0, equalsIndex).trim();
      valueRaw = line.slice(equalsIndex + 1).trim();
    } else if (colonIndex >= 0) {
      key = line.slice(0, colonIndex).trim();
      valueRaw = line.slice(colonIndex + 1).trim();
    } else {
      continue;
    }

    if (!key || !valueRaw) {
      continue;
    }

    properties[key] = parseValue(valueRaw);
  }

  return properties;
}

function parseValue(raw: string): AttrValue {
  const trimmed = raw.trim();
  if (
    trimmed.length >= 2 &&
    trimmed.startsWith("\"") &&
    trimmed.endsWith("\"")
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  if (/^-?(?:\d+\.\d+|\d+\.)$/.test(trimmed)) {
    return Number.parseFloat(trimmed);
  }
  return trimmed;
}

function matchesSelector(
  selector: StyleSelector,
  nodeId: string,
  shape: string,
  classes: Set<string>,
): boolean {
  if (selector.kind === "universal") {
    return true;
  }
  if (selector.kind === "id") {
    return selector.value === nodeId;
  }
  if (selector.kind === "shape") {
    return selector.value === shape;
  }
  return classes.has(selector.value);
}
