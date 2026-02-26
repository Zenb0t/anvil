import { readFile } from "node:fs/promises";

import { AttractorEngine, EngineOptions } from "./engine";
import { parseDot } from "./parser";
import { ParsedGraph, RunResult } from "./types";
import { validateGraph, validateOrThrow } from "./validator";

export async function loadGraphFromDotFile(dotPath: string): Promise<ParsedGraph> {
  const source = await readFile(dotPath, "utf8");
  return parseDot(source);
}

export function parseGraphFromSource(source: string): ParsedGraph {
  return parseDot(source);
}

export function lintGraph(graph: ParsedGraph) {
  return validateGraph(graph);
}

export function assertGraphValid(graph: ParsedGraph) {
  return validateOrThrow(graph);
}

export async function runGraph(graph: ParsedGraph, options: EngineOptions = {}): Promise<RunResult> {
  const engine = new AttractorEngine(graph, options);
  return engine.run();
}

export async function runDotFile(dotPath: string, options: EngineOptions = {}): Promise<RunResult> {
  const graph = await loadGraphFromDotFile(dotPath);
  return runGraph(graph, options);
}

export { AttractorEngine } from "./engine";
export { parseDot } from "./parser";
export { validateGraph, validateOrThrow } from "./validator";
export * from "./types";
export * from "./interviewer";
export * from "./handlers";
export * from "./codergen-cli-backend";
