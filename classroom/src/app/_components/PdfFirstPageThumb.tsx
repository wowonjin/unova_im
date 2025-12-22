"use client";

import { useEffect, useState } from "react";
import { readCachedPdfThumb, writeCachedPdfThumb, generatePdfFirstPageThumbDataUrl } from "@/app/_components/pdfFirstPageThumbCache";

export default function PdfFirstPageThumb({
  src,
  title,
  className,
  targetWidth = 240,
  cacheTtlMs = 1000 * 60 * 60 * 24, // 24h
}: {
  src: string;
  title: string;
  className?: string;
  targetWidth?: number;
  cacheTtlMs?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    (async () => {
      try {
        const cached = readCachedPdfThumb({ src, targetWidth, ttlMs: cacheTtlMs });
        if (cached) {
          if (!cancelled) setDataUrl(cached);
          return;
        }

        const url = await generatePdfFirstPageThumbDataUrl({ src, targetWidth });
        if (cancelled) return;
        setDataUrl(url);
        writeCachedPdfThumb({ src, targetWidth, dataUrl: url });
      } catch (e) {
        if (cancelled) return;
        // 디버깅 편의(운영에서 문제되면 제거 가능)
        console.warn("[PdfFirstPageThumb] failed", { title, src, error: String((e as any)?.message || e) });
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, title, targetWidth, cacheTtlMs]);

  if (dataUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={dataUrl} alt={`${title} 미리보기`} className={className} />;
  }

  return (
    <div
      className={className}
      aria-label={failed ? `${title} 미리보기 실패` : `${title} 미리보기 생성 중`}
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
      }}
    />
  );
}


