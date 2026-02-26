import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { InterviewAnswer, InterviewQuestion, Interviewer } from "./types";

export class AutoApproveInterviewer implements Interviewer {
  async ask(question: InterviewQuestion): Promise<InterviewAnswer> {
    if (question.type === "single_select") {
      const first = question.options?.[0];
      return { selected_ids: first ? [first.id] : [] };
    }
    if (question.type === "multi_select") {
      return { selected_ids: question.options?.map((option) => option.id) ?? [] };
    }
    if (question.type === "confirm") {
      return { confirmed: true };
    }
    return { text: "" };
  }
}

export class QueueInterviewer implements Interviewer {
  private readonly queue: Array<string | InterviewAnswer>;

  constructor(answers: Array<string | InterviewAnswer>) {
    this.queue = [...answers];
  }

  async ask(question: InterviewQuestion): Promise<InterviewAnswer> {
    if (this.queue.length === 0) {
      return new AutoApproveInterviewer().ask(question);
    }

    const next = this.queue.shift()!;
    if (typeof next !== "string") {
      return next;
    }

    if (question.type === "single_select") {
      return { selected_ids: [next] };
    }
    if (question.type === "multi_select") {
      return {
        selected_ids: next
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };
    }
    if (question.type === "confirm") {
      return { confirmed: next.toLowerCase() === "yes" || next.toLowerCase() === "true" };
    }
    return { text: next };
  }
}

export class CallbackInterviewer implements Interviewer {
  private readonly callback: (question: InterviewQuestion) => Promise<InterviewAnswer>;

  constructor(callback: (question: InterviewQuestion) => Promise<InterviewAnswer>) {
    this.callback = callback;
  }

  ask(question: InterviewQuestion): Promise<InterviewAnswer> {
    return this.callback(question);
  }
}

export class ConsoleInterviewer implements Interviewer {
  async ask(question: InterviewQuestion): Promise<InterviewAnswer> {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      stdout.write(`\n${question.prompt}\n`);
      if (question.options && question.options.length > 0) {
        question.options.forEach((option, index) => {
          const description = option.description ? ` - ${option.description}` : "";
          stdout.write(`  ${index + 1}. ${option.label} (${option.id})${description}\n`);
        });
      }

      if (question.type === "single_select") {
        const raw = await rl.question("Select one option (index or id): ");
        const selected = resolveOptionSelection(raw, question.options ?? []);
        return { selected_ids: selected ? [selected] : [] };
      }

      if (question.type === "multi_select") {
        const raw = await rl.question(
          "Select options (comma-separated indexes or ids): ",
        );
        const selectedIds = raw
          .split(",")
          .map((part) => resolveOptionSelection(part, question.options ?? []))
          .filter((value): value is string => Boolean(value));
        return { selected_ids: Array.from(new Set(selectedIds)) };
      }

      if (question.type === "confirm") {
        const raw = await rl.question("Confirm? (y/n): ");
        const normalized = raw.trim().toLowerCase();
        return { confirmed: normalized === "y" || normalized === "yes" };
      }

      const text = await rl.question("Answer: ");
      return { text };
    } finally {
      rl.close();
    }
  }
}

function resolveOptionSelection(input: string, options: { id: string }[]): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const asIndex = Number.parseInt(trimmed, 10);
  if (Number.isFinite(asIndex) && asIndex >= 1 && asIndex <= options.length) {
    return options[asIndex - 1].id;
  }

  const byId = options.find((option) => option.id === trimmed);
  if (byId) {
    return byId.id;
  }

  return null;
}
