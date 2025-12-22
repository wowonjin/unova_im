import path from "node:path";
import fs from "node:fs/promises";

export function getStorageRoot() {
  const fromEnv =
    process.env.STORAGE_ROOT ||
    process.env.UNOVA_STORAGE_ROOT ||
    process.env.UPLOADS_DIR ||
    process.env.DATA_DIR;
  if (fromEnv && fromEnv.trim()) return path.resolve(fromEnv.trim());

  // Default: repo-local folder (good for local dev). On Render, prefer mounting a disk and setting STORAGE_ROOT.
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







