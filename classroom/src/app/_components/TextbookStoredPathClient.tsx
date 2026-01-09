"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TextbookStoredPathClient({
  textbookId,
  initialStoredPath,
}: {
  textbookId: string;
  initialStoredPath: string;
}) {
  const [storedPath, setStoredPath] = useState(initialStoredPath || "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const router = useRouter();

  const saveData = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const fd = new FormData();
      fd.set("textbookId", textbookId);
      fd.set("storedPath", storedPath);

      const res = await fetch("/api/admin/textbooks/update-file-url", {
        method: "POST",
        body: fd,
        headers: { "x-unova-client": "1", accept: "application/json" },
      });

      if (!res.ok) throw new Error("SAVE_FAILED");

      setSaveStatus("saved");
      router.refresh(); // 서버 컴포넌트 재조회 → 페이지 수/용량 표시도 즉시 반영
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  }, [textbookId, storedPath, router]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => saveData(), 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [storedPath, saveData]);

  const statusEl =
    saveStatus === "saving" ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        저장 중...
      </span>
    ) : saveStatus === "saved" ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">저장됨</span>
    ) : saveStatus === "error" ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-400">저장 실패</span>
    ) : (
      <span className="text-xs text-white/30">자동 저장</span>
    );

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium text-white/60">파일 주소(URL)</h4>
        <div className="shrink-0">{statusEl}</div>
      </div>
      <div className="mt-3">
        <input
          type="text"
          value={storedPath}
          onChange={(e) => setStoredPath(e.target.value)}
          placeholder="예: https://storage.googleapis.com/버킷/파일.pdf 또는 gs://bucket/path"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <p className="mt-2 text-xs text-white/35">
          URL을 바꾼 뒤 용량/페이지 수가 필요하면 위의 <span className="text-white/50">파일 정보 다시 가져오기</span>를 눌러 갱신하세요.
        </p>
      </div>
    </div>
  );
}

