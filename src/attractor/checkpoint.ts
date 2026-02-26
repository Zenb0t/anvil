import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CheckpointState } from "./types";

export function defaultCheckpointPath(logsRoot: string): string {
  return path.join(logsRoot, "checkpoint.json");
}

export async function loadCheckpoint(checkpointPath: string): Promise<CheckpointState> {
  const raw = await readFile(checkpointPath, "utf8");
  return JSON.parse(raw) as CheckpointState;
}

export async function saveCheckpoint(
  checkpoint: CheckpointState,
  checkpointPath: string,
): Promise<void> {
  await mkdir(path.dirname(checkpointPath), { recursive: true });
  await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), "utf8");
}
