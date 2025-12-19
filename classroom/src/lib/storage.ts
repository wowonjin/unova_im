import path from "node:path";
import fs from "node:fs/promises";

export function getStorageRoot() {
  return path.resolve(process.cwd(), "storage");
}

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export function safeJoin(root: string, rel: string) {
  const resolved = path.resolve(root, rel);
  if (!resolved.startsWith(root)) throw new Error("INVALID_PATH");
  return resolved;
}


