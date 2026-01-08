"use client";

import { useEffect, useState } from "react";
import { getPdfPageCount } from "@/app/_components/pdfFirstPageThumbCache";

export default function PdfPageCount({ src }: { src: string }) {
  const [pages, setPages] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPages(null);

    (async () => {
      try {
        const n = await getPdfPageCount({ src });
        if (cancelled) return;
        setPages(Number.isFinite(n) && n > 0 ? n : null);
      } catch {
        if (cancelled) return;
        setPages(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return <span>{pages ? `${pages}쪽` : "-"}</span>;
}

