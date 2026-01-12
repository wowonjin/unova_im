"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DbTextbookRow = {
  id: string;
  title: string;
  originalName: string;
  createdAt: string | Date;
  sizeBytes: number;
  pageCount: number | null;
  thumbnailUrl: string | null;
};

function formatBytes(bytes: number | null | undefined) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const digits = v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${units[i]}`;
}

export default function AdminTextbookRegisterLogClient({ items }: { items: DbTextbookRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    // 서버에서 정렬되어 오지만, 안전하게 한 번 더 정렬합니다.
    return items
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items]);

  async function deleteTextbook(id: string) {
    if (!confirm("정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/textbooks/${id}/delete`, {
        method: "POST",
        headers: { accept: "application/json", "x-unova-client": "1" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.ok !== true) throw new Error(data?.error || "DELETE_FAILED");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("삭제에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setDeletingId(null);
    }
  }

  async function refreshMetadata(id: string) {
    setRefreshingId(id);
    try {
      const res = await fetch(`/api/admin/textbooks/${id}/refresh-metadata`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.ok !== true) throw new Error("REFRESH_FAILED");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("정보 갱신에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setRefreshingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden h-fit sticky top-6">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">교재 DB</h3>
              <p className="text-xs text-white/40">
                DB 기준: {sorted.length}개
              </p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-white/30">
          ※ 이 목록은 DB에 저장된 “교재 등록” 업로드 목록입니다. 판매(상품) 설정된 항목은 제외됩니다.
        </p>
      </div>

      {/* List */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.03]">
              <svg className="w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-sm text-white/40">등록 기록이 없습니다</p>
            <p className="mt-1 text-xs text-white/25">교재를 등록하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {sorted.map((t, idx) => {
              const when = new Date(t.createdAt).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div key={idx} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-14 rounded-lg overflow-hidden border border-white/10 bg-white/[0.03]">
                      {t.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-white/35">
                        <span>{when}</span>
                        {t.pageCount && (
                          <>
                            <span className="text-white/20">•</span>
                            <span>{t.pageCount}쪽</span>
                          </>
                        )}
                        {t.sizeBytes && (
                          <>
                            <span className="text-white/20">•</span>
                            <span>{formatBytes(t.sizeBytes)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2 items-end">
                      <button
                        type="button"
                        onClick={() => refreshMetadata(t.id)}
                        disabled={refreshingId === t.id || deletingId === t.id}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/[0.06] disabled:opacity-50"
                        title="파일 정보 다시 불러오기"
                      >
                        {refreshingId === t.id ? "갱신중..." : "정보 다시"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTextbook(t.id)}
                        disabled={deletingId === t.id || refreshingId === t.id}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                        title="교재 삭제"
                      >
                        {deletingId === t.id ? "삭제중..." : "삭제"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
