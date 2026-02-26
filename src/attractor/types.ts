export type AttrValue = string | number | boolean;

export type AttrMap = Record<string, AttrValue>;

export type OutcomeStatus = "success" | "retry" | "fail" | "partial_success";

export interface NodeRef {
  id: string;
}

export interface ParsedNode {
  id: string;
  attrs: AttrMap;
  explicitAttrs: Set<string>;
}

export interface ParsedEdge {
  id: string;
  from: string;
  to: string;
  attrs: AttrMap;
}

export interface ParsedGraph {
  id: string;
  attrs: AttrMap;
  nodes: Map<string, ParsedNode>;
  edges: ParsedEdge[];
}

export interface LintResult {
  rule: string;
  severity: "error" | "warning";
  target: string;
  message: string;
}

export interface HandlerOutcome {
  status: OutcomeStatus;
  preferred_label?: string;
  suggested_next_ids?: string[];
  context_updates?: Record<string, unknown>;
  notes?: string;
  response_text?: string;
}

export interface CheckpointState {
  graph_id: string;
  logs_root: string;
  current_node: string;
  completed_nodes: string[];
  retry_counts: Record<string, number>;
  node_outcomes: Record<string, OutcomeStatus>;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RunResult {
  status: "success" | "fail";
  logs_root: string;
  current_node: string;
  completed_nodes: string[];
  node_outcomes: Record<string, OutcomeStatus>;
  context: Record<string, unknown>;
}

export interface InterviewOption {
  id: string;
  label: string;
  description?: string;
}

export type InterviewQuestionType =
  | "single_select"
  | "multi_select"
  | "free_text"
  | "confirm";

export interface InterviewQuestion {
  id: string;
  type: InterviewQuestionType;
  prompt: string;
  options?: InterviewOption[];
}

export interface InterviewAnswer {
  selected_ids?: string[];
  text?: string;
  confirmed?: boolean;
}

export interface Interviewer {
  ask(question: InterviewQuestion): Promise<InterviewAnswer>;
}

export interface CodergenRequest {
  prompt: string;
  node_id: string;
  context: Record<string, unknown>;
  model?: string;
  provider?: string;
  reasoning_effort?: string;
  timeout_ms?: number;
  logs_root: string;
}

export type CodergenResponse =
  | string
  | {
      text: string;
      status?: OutcomeStatus;
      preferred_label?: string;
      suggested_next_ids?: string[];
      context_updates?: Record<string, unknown>;
      notes?: string;
    };

export interface CodergenBackend {
  run(request: CodergenRequest): Promise<CodergenResponse>;
}

export interface ParsedConditionClause {
  key: string;
  operator: "=" | "!=" | "truthy";
  value?: string;
}

export interface GraphTransform {
  name: string;
  transform(graph: ParsedGraph): ParsedGraph;
}
