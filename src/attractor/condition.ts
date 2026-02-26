import { ParsedConditionClause } from "./types";

export interface ConditionRuntime {
  status: string;
  preferred_label?: string;
}

export function parseCondition(condition: string): ParsedConditionClause[] {
  const trimmed = condition.trim();
  if (!trimmed) {
    return [];
  }

  const clauses: ParsedConditionClause[] = [];
  for (const rawClause of splitByAnd(trimmed)) {
    const clause = rawClause.trim();
    if (!clause) {
      continue;
    }

    const neqIndex = clause.indexOf("!=");
    if (neqIndex >= 0) {
      const key = clause.slice(0, neqIndex).trim();
      const value = normalizeLiteral(clause.slice(neqIndex + 2).trim());
      if (!key || !value) {
        throw new Error(`Invalid condition clause '${clause}'`);
      }
      clauses.push({ key, operator: "!=", value });
      continue;
    }

    const eqIndex = clause.indexOf("=");
    if (eqIndex >= 0) {
      const key = clause.slice(0, eqIndex).trim();
      const value = normalizeLiteral(clause.slice(eqIndex + 1).trim());
      if (!key || !value) {
        throw new Error(`Invalid condition clause '${clause}'`);
      }
      clauses.push({ key, operator: "=", value });
      continue;
    }

    clauses.push({ key: clause, operator: "truthy" });
  }
  return clauses;
}

export function evaluateCondition(
  condition: string,
  runtime: ConditionRuntime,
  context: Record<string, unknown>,
): boolean {
  const clauses = parseCondition(condition);
  if (clauses.length === 0) {
    return true;
  }

  for (const clause of clauses) {
    const actual = resolveConditionKey(clause.key, runtime, context);
    if (clause.operator === "=") {
      if (actual !== clause.value) {
        return false;
      }
      continue;
    }
    if (clause.operator === "!=") {
      if (actual === clause.value) {
        return false;
      }
      continue;
    }
    if (!isTruthy(actual)) {
      return false;
    }
  }
  return true;
}

export function resolveConditionKey(
  key: string,
  runtime: ConditionRuntime,
  context: Record<string, unknown>,
): string {
  if (key === "outcome") {
    return runtime.status ?? "";
  }
  if (key === "preferred_label") {
    return runtime.preferred_label ?? "";
  }
  if (key.startsWith("context.")) {
    const direct = lookupContext(context, key);
    if (direct !== undefined) {
      return valueToString(direct);
    }
    const withoutPrefix = lookupContext(context, key.slice("context.".length));
    if (withoutPrefix !== undefined) {
      return valueToString(withoutPrefix);
    }
    return "";
  }
  const value = lookupContext(context, key);
  if (value !== undefined) {
    return valueToString(value);
  }
  return "";
}

function splitByAnd(expression: string): string[] {
  const clauses: string[] = [];
  let current = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < expression.length; i += 1) {
    const ch = expression[i];
    const next = expression[i + 1];

    if (inString) {
      current += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      current += ch;
      continue;
    }

    if (ch === "&" && next === "&") {
      clauses.push(current);
      current = "";
      i += 1;
      continue;
    }

    current += ch;
  }

  if (current.trim().length > 0) {
    clauses.push(current);
  }

  return clauses;
}

function normalizeLiteral(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    trimmed.startsWith("\"") &&
    trimmed.endsWith("\"")
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function lookupContext(
  context: Record<string, unknown>,
  key: string,
): unknown | undefined {
  if (Object.prototype.hasOwnProperty.call(context, key)) {
    return context[key];
  }

  if (!key.includes(".")) {
    return undefined;
  }

  const parts = key.split(".");
  let cursor: unknown = context;
  for (const part of parts) {
    if (typeof cursor !== "object" || cursor === null) {
      return undefined;
    }
    const record = cursor as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, part)) {
      return undefined;
    }
    cursor = record[part];
  }
  return cursor;
}

function valueToString(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function isTruthy(value: string): boolean {
  if (!value) {
    return false;
  }
  return value !== "0" && value !== "false" && value !== "null";
}
