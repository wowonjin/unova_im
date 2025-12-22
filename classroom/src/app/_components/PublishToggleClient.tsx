"use client";

import { useEffect, useRef, useState } from "react";

export default function PublishToggleClient({
  courseId,
  initialValue,
}: {
  courseId: string;
  initialValue: boolean;
}) {
  const [isPublished, setIsPublished] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const reqSeqRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleChange(newValue: boolean) {
    if (newValue === isPublished) {
      setIsOpen(false);
      return;
    }

    setIsPublished(newValue);
    setIsOpen(false);
    const seq = ++reqSeqRef.current;
    setStatus("saving");

    const fd = new FormData();
    fd.set("courseId", courseId);
    fd.set("isPublished", newValue ? "1" : "0");

    const res = await fetch("/api/admin/courses/update-publish", {
      method: "POST",
      body: fd,
      headers: { "x-unova-client": "1", accept: "application/json" },
    }).catch(() => null);

    if (seq !== reqSeqRef.current) return;

    if (!res || !res.ok) {
      setStatus("error");
      setIsPublished(!newValue);
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    setStatus("idle");
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={status === "saving"}
        className={`
          inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all
          ${isPublished 
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
            : "bg-white/5 text-white/60 border border-white/10"
          }
          ${status === "saving" ? "opacity-60" : "hover:bg-white/10"}
        `}
      >
        <span className={`w-2 h-2 rounded-full ${isPublished ? "bg-emerald-400" : "bg-white/40"}`} />
        {status === "saving" ? (
          "저장중..."
        ) : status === "error" ? (
          <span className="text-red-400">오류</span>
        ) : (
          isPublished ? "공개" : "비공개"
        )}
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border border-white/10 bg-[#1a1a1c] shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => handleChange(true)}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
              ${isPublished ? "bg-emerald-500/10 text-emerald-300" : "text-white/70 hover:bg-white/5"}
            `}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            공개
            {isPublished && (
              <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleChange(false)}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
              ${!isPublished ? "bg-white/5 text-white/90" : "text-white/70 hover:bg-white/5"}
            `}
          >
            <span className="w-2 h-2 rounded-full bg-white/40" />
            비공개
            {!isPublished && (
              <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
