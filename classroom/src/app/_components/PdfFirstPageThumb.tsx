"use client";

import { useEffect, useState } from "react";

export default function PdfFirstPageThumb({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    (async () => {
      try {
        // Next.js 환경에서 가장 호환성이 좋은 legacy build 사용
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

        const task = lib.getDocument({ url: src, withCredentials: true });
        const pdf = await task.promise;
        const page = await pdf.getPage(1);

        // 카드 썸네일: 적당히 작은 크기
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
        if (cancelled) return;
        setDataUrl(url);
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
  }, [src, title]);

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


