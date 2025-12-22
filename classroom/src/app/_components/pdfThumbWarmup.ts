"use client";

import { getCache, setCache, inflight } from "./pdfFirstPageThumbCache";

/**
 * 주어진 PDF src를 미리 캔버스 렌더링해서 세션/메모리 캐시에 저장.
 * save-data on / slow 네트워크면 건너뜀.
 * 너무 동시 요청이 몰리지 않도록 직렬화(한 번에 하나씩) 처리.
 */
let warmupQueue: string[] = [];
let running = false;

async function processQueue() {
  if (running) return;
  running = true;
  while (warmupQueue.length > 0) {
    const src = warmupQueue.shift()!;
    // 이미 캐시 or 진행 중이면 skip
    if (getCache(src) || inflight.has(src)) continue;
    try {
      await generateThumb(src);
    } catch {
      /* ignore */
    }
    // 각 job 사이에 살짝 pause (CPU 선점 방지)
    await new Promise((r) => setTimeout(r, 80));
  }
  running = false;
}

async function generateThumb(src: string): Promise<void> {
  if (typeof window === "undefined") return;
  // save-data / slow network check
  const nav = navigator as any;
  if (nav.connection) {
    if (nav.connection.saveData) return;
    const eff = nav.connection.effectiveType;
    if (eff === "slow-2g" || eff === "2g") return;
  }

  // 같은 src에 대한 중복 inflight 방지
  if (inflight.has(src)) return;
  const p = (async () => {
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const lib: any = pdfjs?.default ?? pdfjs;
    if (!lib?.getDocument) throw new Error("PDFJS_GETDOCUMENT_MISSING");
    if (lib?.GlobalWorkerOptions) {
      lib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
    }
    const task = lib.getDocument({ url: src, withCredentials: true });
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const targetWidth = 240;
    const scale = viewport.width > 0 ? targetWidth / viewport.width : 1;
    const v = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("NO_CANVAS_CTX");
    canvas.width = Math.max(1, Math.floor(v.width));
    canvas.height = Math.max(1, Math.floor(v.height));
    await page.render({ canvasContext: ctx, viewport: v }).promise;
    const url = canvas.toDataURL("image/jpeg", 0.86);
    setCache(src, url);
  })();
  inflight.set(src, p);
  try {
    await p;
  } finally {
    inflight.delete(src);
  }
}

export function warmupThumb(src: string) {
  if (typeof window === "undefined") return;
  if (!warmupQueue.includes(src)) warmupQueue.push(src);
  // trigger processing via idle callback if available
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(() => processQueue(), { timeout: 5000 });
  } else {
    setTimeout(() => processQueue(), 1000);
  }
}

