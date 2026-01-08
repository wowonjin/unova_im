/* eslint-disable no-console */

type ThumbCacheEntryV1 = {
  v: 1;
  createdAt: number;
  dataUrl: string;
};

const MEM = new Map<string, ThumbCacheEntryV1>();

const SS_PREFIX = "unova_pdf_thumb_v1:";
const SS_INDEX_KEY = "unova_pdf_thumb_index_v1";
const MAX_ENTRIES = 12; // sessionStorage 용량 보호 (썸네일 12개까지만 유지)
const MAX_DATAURL_CHARS = 350_000; // 대략 350KB 정도 (너무 큰 경우 저장 스킵)

function ssKey(src: string, targetWidth: number) {
  return `${SS_PREFIX}${targetWidth}:${src}`;
}

function safeNow() {
  return Date.now();
}

function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SS_INDEX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

function writeIndex(keys: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SS_INDEX_KEY, JSON.stringify(keys));
  } catch {
    // ignore
  }
}

function touchIndex(key: string) {
  const cur = readIndex();
  const next = [key, ...cur.filter((k) => k !== key)].slice(0, MAX_ENTRIES);
  writeIndex(next);
  // best-effort eviction
  for (const k of cur.slice(MAX_ENTRIES)) {
    try {
      window.sessionStorage.removeItem(k);
    } catch {
      // ignore
    }
  }
}

export function readCachedPdfThumb({
  src,
  targetWidth,
  ttlMs,
}: {
  src: string;
  targetWidth: number;
  ttlMs: number;
}): string | null {
  const key = ssKey(src, targetWidth);
  const mem = MEM.get(key);
  const now = safeNow();
  if (mem && now - mem.createdAt <= ttlMs) return mem.dataUrl;

  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ThumbCacheEntryV1;
    if (!parsed || parsed.v !== 1 || typeof parsed.dataUrl !== "string" || typeof parsed.createdAt !== "number") return null;
    if (now - parsed.createdAt > ttlMs) return null;
    MEM.set(key, parsed);
    touchIndex(key);
    return parsed.dataUrl;
  } catch {
    return null;
  }
}

export function writeCachedPdfThumb({
  src,
  targetWidth,
  dataUrl,
}: {
  src: string;
  targetWidth: number;
  dataUrl: string;
}) {
  const key = ssKey(src, targetWidth);
  const entry: ThumbCacheEntryV1 = { v: 1, createdAt: safeNow(), dataUrl };
  MEM.set(key, entry);
  if (typeof window === "undefined") return;
  if (dataUrl.length > MAX_DATAURL_CHARS) return; // 너무 큰 경우 저장하지 않음
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
    touchIndex(key);
  } catch {
    // ignore (quota exceeded 등)
  }
}

async function loadPdfJs() {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const lib: any = pdfjs?.default ?? pdfjs;
  if (!lib?.getDocument) throw new Error("PDFJS_GETDOCUMENT_MISSING");

  // 설치된 pdfjs-dist와 같은 버전의 워커를 번들 경로로 지정 (CDN/CSP 이슈 회피)
  if (lib?.GlobalWorkerOptions) {
    lib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  return lib;
}

type PageCountCacheEntryV1 = { v: 1; createdAt: number; pages: number };
const PAGE_MEM = new Map<string, PageCountCacheEntryV1>();
const PAGE_TTL_MS_DEFAULT = 1000 * 60 * 60 * 24; // 24h
function pageKey(src: string) {
  return `unova_pdf_pages_v1:${src}`;
}

export function readCachedPdfPageCount({ src, ttlMs = PAGE_TTL_MS_DEFAULT }: { src: string; ttlMs?: number }) {
  const key = pageKey(src);
  const now = safeNow();

  const mem = PAGE_MEM.get(key);
  if (mem && now - mem.createdAt <= ttlMs) return mem.pages;

  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PageCountCacheEntryV1;
    if (!parsed || parsed.v !== 1) return null;
    if (!Number.isFinite(parsed.pages) || parsed.pages <= 0) return null;
    if (!Number.isFinite(parsed.createdAt) || now - parsed.createdAt > ttlMs) return null;
    PAGE_MEM.set(key, parsed);
    return parsed.pages;
  } catch {
    return null;
  }
}

export function writeCachedPdfPageCount({ src, pages }: { src: string; pages: number }) {
  if (!Number.isFinite(pages) || pages <= 0) return;
  const key = pageKey(src);
  const entry: PageCountCacheEntryV1 = { v: 1, createdAt: safeNow(), pages };
  PAGE_MEM.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export async function getPdfPageCount({ src, ttlMs = PAGE_TTL_MS_DEFAULT }: { src: string; ttlMs?: number }) {
  const cached = readCachedPdfPageCount({ src, ttlMs });
  if (cached) return cached;

  const lib = await loadPdfJs();
  const task = lib.getDocument({ url: src, withCredentials: true });
  try {
    const pdf = await task.promise;
    const pages = Number(pdf?.numPages ?? 0);
    if (pages > 0) writeCachedPdfPageCount({ src, pages });
    return pages;
  } finally {
    try {
      task.destroy?.();
    } catch {
      // ignore
    }
  }
}

export async function generatePdfFirstPageThumbDataUrl({
  src,
  targetWidth,
}: {
  src: string;
  targetWidth: number;
}): Promise<string> {
  const lib = await loadPdfJs();

  const task = lib.getDocument({ url: src, withCredentials: true });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1 });
    const scale = viewport.width > 0 ? targetWidth / viewport.width : 1;
    const v = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("NO_CANVAS_CTX");
    canvas.width = Math.max(1, Math.floor(v.width));
    canvas.height = Math.max(1, Math.floor(v.height));

    await page.render({ canvasContext: ctx, viewport: v }).promise;
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    try {
      task.destroy?.();
    } catch {
      // ignore
    }
  }
}

export async function warmPdfFirstPageThumb({
  src,
  targetWidth,
  ttlMs,
}: {
  src: string;
  targetWidth: number;
  ttlMs: number;
}) {
  const cached = readCachedPdfThumb({ src, targetWidth, ttlMs });
  if (cached) return;
  try {
    const dataUrl = await generatePdfFirstPageThumbDataUrl({ src, targetWidth });
    writeCachedPdfThumb({ src, targetWidth, dataUrl });
  } catch {
    // warmup은 실패해도 UX에 치명적이지 않으므로 무시
  }
}






















