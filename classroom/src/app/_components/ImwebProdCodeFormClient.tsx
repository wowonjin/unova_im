"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImwebProdCodeFormClient({
  courseId,
  codes,
}: {
  courseId: string;
  codes: { id: string; code: string }[];
}) {
  const [inputCode, setInputCode] = useState("");
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim() || pending) return;

    setPending(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.set("courseId", courseId);
      fd.set("op", "add");
      fd.set("imwebProdCode", inputCode.trim());

      const res = await fetch("/api/admin/courses/update-imweb", {
        method: "POST",
        body: fd,
        headers: { "x-unova-client": "1", accept: "application/json" },
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        if (payload?.error === "DUPLICATE") {
          setError("이미 다른 강좌에 등록된 상품 코드입니다.");
        } else {
          setError("저장에 실패했습니다.");
        }
        return;
      }

      setInputCode("");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (codeId: string) => {
    if (deletingId) return;
    setDeletingId(codeId);
    setError(null);

    try {
      const fd = new FormData();
      fd.set("courseId", courseId);
      fd.set("codeId", codeId);

      const res = await fetch("/api/admin/courses/delete-imweb-code", {
        method: "POST",
        body: fd,
        headers: { "x-unova-client": "1", accept: "application/json" },
      });

      if (!res.ok) {
        setError("삭제에 실패했습니다.");
        return;
      }

      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 입력 폼 */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="상품 코드 입력 후 Enter"
              disabled={pending}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !inputCode.trim()}
            className="shrink-0 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? "저장중..." : "추가"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </form>

      {/* 저장된 코드 목록 */}
      {codes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/50">등록된 상품 코드</p>
          <div className="flex flex-wrap gap-2">
            {codes.map((c) => (
              <div
                key={c.id}
                className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5"
              >
                <span className="text-sm text-white/80 font-mono">{c.code}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="삭제"
                >
                  {deletingId === c.id ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {codes.length === 0 && (
        <p className="text-xs text-white/40">등록된 상품 코드가 없습니다.</p>
      )}
    </div>
  );
}
