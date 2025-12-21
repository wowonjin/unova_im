import path from "node:path";
import fs from "node:fs/promises";

export function getStorageRoot() {
  return path.resolve(process.cwd(), "storage");
}

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export function safeJoin(root: string, rel: string) {
  // Safer than `startsWith`:
  // - Works on Windows (drive letter casing)
  // - Avoids prefix-trick (e.g. root="/a/b", resolved="/a/bad/..")
  const absRoot = path.resolve(root);
  const resolved = path.resolve(absRoot, rel);

  const relToRoot = path.relative(absRoot, resolved);
  const escapesRoot =
    relToRoot === "" ? false : relToRoot.startsWith("..") || relToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relToRoot);
  if (escapesRoot) throw new Error("INVALID_PATH");

  return resolved;
}







