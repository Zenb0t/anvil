import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface AttractorDocument {
  name: string;
  path: string;
  content: string;
}

export const ATTRACTOR_DOC_PATHS = [
  "README.md",
  "attractor-spec.md",
  "coding-agent-loop-spec.md",
  "unified-llm-spec.md",
] as const;

export async function loadAttractorDocuments(rootDir = "attractor"): Promise<AttractorDocument[]> {
  const resolvedRoot = path.resolve(process.cwd(), rootDir);
  const docs: AttractorDocument[] = [];

  for (const relPath of ATTRACTOR_DOC_PATHS) {
    const absolutePath = path.join(resolvedRoot, relPath);
    if (!existsSync(absolutePath)) {
      throw new Error(
        `Missing Attractor doc: ${absolutePath}\nClone Attractor first: git clone https://github.com/strongdm/attractor attractor`,
      );
    }

    const content = await readFile(absolutePath, "utf8");
    docs.push({
      name: relPath,
      path: absolutePath,
      content,
    });
  }

  return docs;
}

export function chunkText(content: string, maxChars: number): string[] {
  if (!Number.isFinite(maxChars) || maxChars <= 0) {
    throw new Error(`Invalid chunk size: ${maxChars}`);
  }

  if (content.length === 0) {
    return [""];
  }

  const chunks: string[] = [];
  for (let cursor = 0; cursor < content.length; cursor += maxChars) {
    chunks.push(content.slice(cursor, cursor + maxChars));
  }

  return chunks;
}
