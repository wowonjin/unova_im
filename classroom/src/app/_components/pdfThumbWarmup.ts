"use client";

import { generatePdfFirstPageThumbDataUrl, readCachedPdfThumb, writeCachedPdfThumb } from "./pdfFirstPageThumbCache";

/**
 * 주어진 PDF src를 미리 캔버스 렌더링해서 세션/메모리 캐시에 저장.
 * save-data on / slow 네트워크면 건너뜀.
 * 너무 동시 요청이 몰리지 않도록 직렬화(한 번에 하나씩) 처리.
 */
let warmupQueue: string[] = [];
let running = false;
const inflight = new Map<string, Promise<void>>();
const TARGET_WIDTH = 240;
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

async function processQueue() {
  if (running) return;
  running = true;
  while (warmupQueue.length > 0) {
    const src = warmupQueue.shift()!;
    // 이미 캐시 or 진행 중이면 skip
    if (readCachedPdfThumb({ src, targetWidth: TARGET_WIDTH, ttlMs: TTL_MS }) || inflight.has(src)) continue;
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
    const dataUrl = await generatePdfFirstPageThumbDataUrl({ src, targetWidth: TARGET_WIDTH });
    writeCachedPdfThumb({ src, targetWidth: TARGET_WIDTH, dataUrl });
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

