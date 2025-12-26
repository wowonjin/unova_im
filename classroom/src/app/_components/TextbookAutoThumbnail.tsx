"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generatePdfFirstPageThumbDataUrl } from "@/app/_components/pdfFirstPageThumbCache";

type Props = {
  textbookId: string;
  existingThumbnailUrl: string | null;
  sizeBytes?: number;
  className?: string;
};

export default function TextbookAutoThumbnail({ textbookId, existingThumbnailUrl, sizeBytes = 0, className = "" }: Props) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(existingThumbnailUrl);
  const [status, setStatus] = useState<"idle" | "generating" | "saving" | "done" | "error">(
    existingThumbnailUrl ? "done" : "idle"
  );
  const hasAttempted = useRef(false);
  const hasSizeUpdated = useRef(false);

  // 파일 크기가 0인 경우 자동으로 업데이트
  useEffect(() => {
    if (sizeBytes === 0 && !hasSizeUpdated.current) {
      hasSizeUpdated.current = true;
      fetch(`/api/admin/textbooks/${textbookId}/update-size`, { method: "POST" })
        .catch((e) => console.error("[TextbookAutoThumbnail] Failed to update size:", e));
    }
  }, [textbookId, sizeBytes]);

  const generateThumbnail = useCallback(async () => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    setStatus("generating");

    try {
      // 1. PDF에서 첫 페이지 추출하여 이미지 생성
      const dataUrl = await generatePdfFirstPageThumbDataUrl({
        src: `/api/textbooks/${textbookId}/view`,
        targetWidth: 300,
      });

      setStatus("saving");

      // 2. 서버에 저장
      const res = await fetch(`/api/admin/textbooks/${textbookId}/thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailDataUrl: dataUrl }),
      });

      if (!res.ok) {
        throw new Error("SAVE_FAILED");
      }

      const result = await res.json();
      setThumbnailUrl(result.thumbnailUrl || dataUrl);
      setStatus("done");
    } catch (e) {
      console.error("[TextbookAutoThumbnail]", e);
      setStatus("error");
    }
  }, [textbookId]);

  // 자동 생성: 썸네일이 없으면 자동으로 생성
  useEffect(() => {
    if (!existingThumbnailUrl && status === "idle" && !hasAttempted.current) {
      // 약간의 지연 후 자동 생성 시작
      const timer = setTimeout(() => {
        generateThumbnail();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [existingThumbnailUrl, status, generateThumbnail]);

  // 썸네일이 있는 경우
  if (thumbnailUrl || status === "done") {
    return (
      <div className={`shrink-0 w-12 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/5 ${className}`}>
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  // 생성 중인 경우
  if (status === "generating" || status === "saving") {
    return (
      <div className={`shrink-0 w-12 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center ${className}`}>
        <svg className="w-4 h-4 text-white/40 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // 에러 또는 기본 상태 (PDF 아이콘)
  return (
    <div className={`shrink-0 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 ${className}`}>
      <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1.25v3.75H8.5V13zm2.5 0h1.25v3.75H11V13zm2.5 0h1.25v1.5c0 .414.336.75.75.75h.75v1.5h-.75A2.252 2.252 0 0 1 13.5 14.5V13z"/>
      </svg>
    </div>
  );
}

