import { AttrMap, AttrValue, ParsedEdge, ParsedGraph, ParsedNode } from "./types";

interface Token {
  kind: "word" | "string" | "symbol";
  value: string;
  position: number;
}

interface ParseScope {
  nodeDefaults: AttrMap;
  edgeDefaults: AttrMap;
  classNames: string[];
}

interface SubgraphCapture {
  attrs: AttrMap;
  nodeIds: Set<string>;
}

const NODE_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SYMBOLS = new Set(["{", "}", "[", "]", ",", ";", "="]);

export function parseDot(dotSource: string): ParsedGraph {
  const tokens = tokenize(stripComments(dotSource));
  const parser = new Parser(tokens);
  const graph = parser.parseGraph();
  applyNodeDefaults(graph);
  return graph;
}

class Parser {
  private readonly tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseGraph(): ParsedGraph {
    const digraphToken = this.consumeWord("digraph");
    if (!digraphToken) {
      throw this.error("Expected 'digraph' at start");
    }

    const idToken = this.consumeToken();
    if (!idToken || idToken.kind === "symbol") {
      throw this.error("Expected graph identifier after 'digraph'");
    }
    const graphId = tokenValue(idToken);

    this.expectSymbol("{");
    const graph: ParsedGraph = {
      id: graphId,
      attrs: {},
      nodes: new Map<string, ParsedNode>(),
      edges: [],
    };

    const rootScope: ParseScope = {
      nodeDefaults: {},
      edgeDefaults: {},
      classNames: [],
    };

    this.parseStatements(graph, rootScope, null);
    this.expectSymbol("}");

    if (!this.isAtEnd()) {
      throw this.error("Unexpected tokens after graph end");
    }

    return graph;
  }

  private parseStatements(
    graph: ParsedGraph,
    scope: ParseScope,
    capture: SubgraphCapture | null,
  ): void {
    while (!this.isAtEnd() && !this.peekSymbol("}")) {
      if (this.matchSymbol(";")) {
        continue;
      }

      if (this.peekWord("graph")) {
        this.consumeToken();
        const attrs = this.parseAttrBlocks();
        this.mergeAttrs(capture ? capture.attrs : graph.attrs, attrs);
        this.matchSymbol(";");
        continue;
      }

      if (this.peekWord("node")) {
        this.consumeToken();
        const attrs = this.parseAttrBlocks();
        scope.nodeDefaults = { ...scope.nodeDefaults, ...attrs };
        this.matchSymbol(";");
        continue;
      }

      if (this.peekWord("edge")) {
        this.consumeToken();
        const attrs = this.parseAttrBlocks();
        scope.edgeDefaults = { ...scope.edgeDefaults, ...attrs };
        this.matchSymbol(";");
        continue;
      }

      if (this.peekWord("subgraph")) {
        this.parseSubgraph(graph, scope, capture);
        this.matchSymbol(";");
        continue;
      }

      if (this.peekToken()?.kind !== "symbol" && this.peekSymbol("=", 1)) {
        const key = tokenValue(this.consumeToken()!);
        this.expectSymbol("=");
        const valueToken = this.consumeToken();
        if (!valueToken || valueToken.kind === "symbol") {
          throw this.error(`Expected value for attribute '${key}'`);
        }
        const value = parseAttrValue(valueToken);
        if (capture) {
          capture.attrs[key] = value;
        } else {
          graph.attrs[key] = value;
        }
        this.matchSymbol(";");
        continue;
      }

      this.parseNodeOrEdgeStatement(graph, scope, capture);
      this.matchSymbol(";");
    }
  }

  private parseSubgraph(
    graph: ParsedGraph,
    parentScope: ParseScope,
    parentCapture: SubgraphCapture | null,
  ): void {
    this.consumeWord("subgraph");

    if (!this.peekSymbol("{")) {
      const maybeName = this.consumeToken();
      if (!maybeName || maybeName.kind === "symbol") {
        throw this.error("Expected subgraph identifier or '{'");
      }
    }

    this.expectSymbol("{");
    const childScope: ParseScope = {
      nodeDefaults: { ...parentScope.nodeDefaults },
      edgeDefaults: { ...parentScope.edgeDefaults },
      classNames: [...parentScope.classNames],
    };
    const capture: SubgraphCapture = {
      attrs: {},
      nodeIds: new Set<string>(),
    };
    this.parseStatements(graph, childScope, capture);
    this.expectSymbol("}");

    const label = capture.attrs.label;
    if (typeof label === "string") {
      const derivedClass = deriveClassName(label);
      if (derivedClass) {
        for (const nodeId of capture.nodeIds) {
          const node = graph.nodes.get(nodeId);
          if (!node) {
            continue;
          }
          addClasses(node.attrs, [derivedClass]);
        }
      }
    }

    if (parentCapture) {
      for (const nodeId of capture.nodeIds) {
        parentCapture.nodeIds.add(nodeId);
      }
    }
  }

  private parseNodeOrEdgeStatement(
    graph: ParsedGraph,
    scope: ParseScope,
    capture: SubgraphCapture | null,
  ): void {
    const firstToken = this.consumeToken();
    if (!firstToken || firstToken.kind === "symbol") {
      throw this.error("Expected node identifier");
    }
    const firstId = tokenValue(firstToken);
    assertNodeId(firstId, firstToken.position);

    const chain: string[] = [firstId];
    while (this.matchSymbol("->")) {
      const nextToken = this.consumeToken();
      if (!nextToken || nextToken.kind === "symbol") {
        throw this.error("Expected node identifier after '->'");
      }
      const nextId = tokenValue(nextToken);
      assertNodeId(nextId, nextToken.position);
      chain.push(nextId);
    }

    const attrs = this.parseAttrBlocks();

    if (chain.length === 1) {
      const node = upsertNode(
        graph,
        chain[0],
        scope.nodeDefaults,
        attrs,
        new Set(Object.keys(attrs)),
        scope.classNames,
      );
      if (capture) {
        capture.nodeIds.add(node.id);
      }
      return;
    }

    const edgeAttrs = { ...scope.edgeDefaults, ...attrs };
    for (let index = 0; index < chain.length - 1; index += 1) {
      const from = chain[index];
      const to = chain[index + 1];
      const edge: ParsedEdge = {
        id: `${from}->${to}#${graph.edges.length + 1}`,
        from,
        to,
        attrs: { ...edgeAttrs },
      };
      graph.edges.push(edge);
      ensureNode(graph, from, scope.nodeDefaults, scope.classNames);
      ensureNode(graph, to, scope.nodeDefaults, scope.classNames);
      if (capture) {
        capture.nodeIds.add(from);
        capture.nodeIds.add(to);
      }
    }
  }

  private parseAttrBlocks(): AttrMap {
    const merged: AttrMap = {};
    while (this.matchSymbol("[")) {
      if (this.matchSymbol("]")) {
        continue;
      }

      while (true) {
        const keyToken = this.consumeToken();
        if (!keyToken || keyToken.kind === "symbol") {
          throw this.error("Expected attribute key inside [] block");
        }
        const key = tokenValue(keyToken);
        this.expectSymbol("=");

        const valueToken = this.consumeToken();
        if (!valueToken || valueToken.kind === "symbol") {
          throw this.error(`Expected value for attribute '${key}'`);
        }
        merged[key] = parseAttrValue(valueToken);

        if (this.matchSymbol(",")) {
          continue;
        }
        break;
      }
      this.expectSymbol("]");
    }
    return merged;
  }

  private mergeAttrs(target: AttrMap, attrs: AttrMap): void {
    for (const [key, value] of Object.entries(attrs)) {
      target[key] = value;
    }
  }

  private peekToken(offset = 0): Token | undefined {
    return this.tokens[this.index + offset];
  }

  private consumeToken(): Token | undefined {
    const token = this.tokens[this.index];
    if (token) {
      this.index += 1;
    }
    return token;
  }

  private consumeWord(value: string): Token | null {
    const token = this.peekToken();
    if (!token || token.kind === "symbol") {
      return null;
    }
    if (tokenValue(token) !== value) {
      return null;
    }
    this.index += 1;
    return token;
  }

  private peekWord(value: string): boolean {
    const token = this.peekToken();
    return Boolean(token && token.kind !== "symbol" && tokenValue(token) === value);
  }

  private expectSymbol(value: string): void {
    const token = this.consumeToken();
    if (!token || token.kind !== "symbol" || token.value !== value) {
      throw this.error(`Expected symbol '${value}'`);
    }
  }

  private matchSymbol(value: string): boolean {
    const token = this.peekToken();
    if (!token || token.kind !== "symbol" || token.value !== value) {
      return false;
    }
    this.index += 1;
    return true;
  }

  private peekSymbol(value: string, offset = 0): boolean {
    const token = this.peekToken(offset);
    return Boolean(token && token.kind === "symbol" && token.value === value);
  }

  private isAtEnd(): boolean {
    return this.index >= this.tokens.length;
  }

  private error(message: string): Error {
    const token = this.peekToken();
    if (!token) {
      return new Error(`${message} at end of input`);
    }
    return new Error(`${message} at position ${token.position}`);
  }
}

function stripComments(source: string): string {
  let i = 0;
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let output = "";

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        output += ch;
      }
      i += 1;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (inString) {
      output += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (ch === "\"") {
      inString = true;
    }
    output += ch;
    i += 1;
  }

  return output;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    if (isWhitespace(ch)) {
      i += 1;
      continue;
    }

    if (ch === "-" && source[i + 1] === ">") {
      tokens.push({ kind: "symbol", value: "->", position: i });
      i += 2;
      continue;
    }

    if (SYMBOLS.has(ch)) {
      tokens.push({ kind: "symbol", value: ch, position: i });
      i += 1;
      continue;
    }

    if (ch === "\"") {
      const start = i;
      i += 1;
      let raw = "";
      let escaped = false;
      while (i < source.length) {
        const current = source[i];
        if (escaped) {
          raw += decodeEscape(current);
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === "\"") {
          i += 1;
          break;
        } else {
          raw += current;
        }
        i += 1;
      }
      tokens.push({ kind: "string", value: raw, position: start });
      continue;
    }

    const start = i;
    let raw = "";
    while (i < source.length) {
      const current = source[i];
      if (isWhitespace(current)) {
        break;
      }
      if (current === "-" && source[i + 1] === ">") {
        break;
      }
      if (SYMBOLS.has(current)) {
        break;
      }
      raw += current;
      i += 1;
    }
    if (!raw) {
      throw new Error(`Unexpected token at position ${i}`);
    }
    tokens.push({ kind: "word", value: raw, position: start });
  }

  return tokens;
}

function tokenValue(token: Token): string {
  return token.value;
}

function parseAttrValue(token: Token): AttrValue {
  if (token.kind === "string") {
    return token.value;
  }

  const raw = token.value;
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  if (/^-?\d+$/.test(raw)) {
    return Number.parseInt(raw, 10);
  }
  if (/^-?(?:\d+\.\d+|\d+\.)$/.test(raw)) {
    return Number.parseFloat(raw);
  }
  return raw;
}

function decodeEscape(ch: string): string {
  switch (ch) {
    case "n":
      return "\n";
    case "t":
      return "\t";
    case "\"":
      return "\"";
    case "\\":
      return "\\";
    default:
      return ch;
  }
}

function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
}

function assertNodeId(id: string, position: number): void {
  if (!NODE_ID_PATTERN.test(id)) {
    throw new Error(
      `Invalid node identifier '${id}' at position ${position}. Node IDs must match ${NODE_ID_PATTERN.source}.`,
    );
  }
}

function ensureNode(
  graph: ParsedGraph,
  id: string,
  defaults: AttrMap,
  scopeClasses: string[],
): ParsedNode {
  return upsertNode(graph, id, defaults, {}, new Set<string>(), scopeClasses);
}

function upsertNode(
  graph: ParsedGraph,
  id: string,
  defaults: AttrMap,
  attrs: AttrMap,
  explicitAttrs: Set<string>,
  scopeClasses: string[],
): ParsedNode {
  const existing = graph.nodes.get(id);
  if (existing) {
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in existing.attrs)) {
        existing.attrs[key] = value;
      }
    }
    for (const [key, value] of Object.entries(attrs)) {
      existing.attrs[key] = value;
      existing.explicitAttrs.add(key);
    }
    if (scopeClasses.length > 0) {
      addClasses(existing.attrs, scopeClasses);
    }
    return existing;
  }

  const node: ParsedNode = {
    id,
    attrs: { ...defaults, ...attrs },
    explicitAttrs: new Set<string>(explicitAttrs),
  };
  if (scopeClasses.length > 0) {
    addClasses(node.attrs, scopeClasses);
  }
  graph.nodes.set(id, node);
  return node;
}

function applyNodeDefaults(graph: ParsedGraph): void {
  for (const node of graph.nodes.values()) {
    if (typeof node.attrs.shape !== "string" || node.attrs.shape.length === 0) {
      node.attrs.shape = "box";
    }
    if (typeof node.attrs.label !== "string" || node.attrs.label.length === 0) {
      node.attrs.label = node.id;
    }
  }
}

function deriveClassName(label: string): string {
  const normalized = label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized;
}

export function parseClassList(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function addClasses(attrs: AttrMap, classes: string[]): void {
  const current = new Set(parseClassList(attrs.class));
  for (const cls of classes) {
    if (cls) {
      current.add(cls);
    }
  }
  if (current.size === 0) {
    return;
  }
  attrs.class = Array.from(current).join(",");
}
