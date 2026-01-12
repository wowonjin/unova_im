"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generatePdfFirstPageThumbDataUrl, readCachedPdfThumb, writeCachedPdfThumb } from "@/app/_components/pdfFirstPageThumbCache";

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export default function PdfFirstPageThumbnailClient({
  src,
  targetWidth = 160,
  className = "",
}: {
  src: string;
  targetWidth?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const attempted = useRef(false);

  const cached = useMemo(() => readCachedPdfThumb({ src, targetWidth, ttlMs: TTL_MS }), [src, targetWidth]);

  useEffect(() => {
    if (cached) {
      setDataUrl(cached);
      return;
    }
    if (attempted.current) return;
    attempted.current = true;

    let cancelled = false;
    (async () => {
      try {
        const du = await generatePdfFirstPageThumbDataUrl({ src, targetWidth });
        if (cancelled) return;
        writeCachedPdfThumb({ src, targetWidth, dataUrl: du });
        setDataUrl(du);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, targetWidth, cached]);

  if (!dataUrl) {
    return (
      <div className={`flex h-16 w-12 items-center justify-center rounded-xl bg-white/[0.06] ${className}`}>
        <span className="material-symbols-outlined text-white/35" style={{ fontSize: "20px" }} aria-hidden="true">
          auto_stories
        </span>
      </div>
    );
  }

  return (
    <div className={`h-16 w-12 overflow-hidden rounded-xl bg-white/[0.06] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

