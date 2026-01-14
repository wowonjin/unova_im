"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TextbookTeacherImageUpload({
  textbookId,
  currentImageUrl,
}: {
  textbookId: string;
  currentImageUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  // 부모에서 currentImageUrl이 갱신되면(자동 매칭/저장 등) 버튼 미리보기도 동기화
  useEffect(() => {
    if (status === "uploading") return;
    setPreview(currentImageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImageUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 미리보기
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // 업로드
    setStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("textbookId", textbookId);
      formData.append("image", file);

      const res = await fetch("/api/admin/textbooks/teacher-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("UPLOAD_FAILED");
      
      setStatus("done");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  async function handleRemove() {
    setStatus("uploading");
    try {
      const res = await fetch("/api/admin/textbooks/teacher-image", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ textbookId }),
      });

      if (!res.ok) throw new Error("DELETE_FAILED");

      setPreview(null);
      setStatus("done");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="relative w-14 h-14 rounded-full border-2 border-dashed border-white/20 bg-white/5 overflow-hidden transition-colors hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
        title="선생님 이미지 업로드"
      >
        {preview ? (
          <img
            src={preview}
            alt="선생님 프로필"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-white/40">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
        )}
        
        {status === "uploading" && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </span>
        )}
      </button>

      {preview && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={status === "uploading"}
          className="text-xs text-white/50 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          삭제
        </button>
      )}

      <div className="text-xs">
        {status === "done" && <span className="text-emerald-400">저장됨</span>}
        {status === "error" && <span className="text-red-400">오류 발생</span>}
      </div>
    </div>
  );
}
