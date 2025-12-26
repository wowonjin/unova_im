"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TextbookAutoThumbnail from "@/app/_components/TextbookAutoThumbnail";

type TextbookRow = {
  id: string;
  title: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string | Date;
  isPublished: boolean;
  imwebProdCode: string | null;
  thumbnailUrl: string | null;
  entitlementDays?: number | null;
  teacherName?: string | null;
  subjectName?: string | null;
  price?: number | null;
  originalPrice?: number | null;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

function parseMoney(s: string): number | null | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined; // empty => no change
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export default function AdminTextbooksBulkClient({ textbooks }: { textbooks: TextbookRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const allIds = useMemo(() => textbooks.map((t) => t.id), [textbooks]);
  const allSelected = selected.size > 0 && selected.size === textbooks.length;

  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [busy, setBusy] = useState<null | "update" | "delete">(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allIds));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function bulkUpdate() {
    setError(null);
    if (!selectedIds.length) return;

    const payload: Record<string, unknown> = {
      action: "update",
      textbookIds: selectedIds,
      update: {},
    };

    const update: Record<string, unknown> = {};
    const parsedPrice = parseMoney(price);
    const parsedOriginal = parseMoney(originalPrice);
    if (parsedPrice !== undefined) update.price = parsedPrice;
    if (parsedOriginal !== undefined) update.originalPrice = parsedOriginal;

    if (teacherName.trim()) update.teacherName = teacherName.trim();
    if (subjectName.trim()) update.subjectName = subjectName.trim();

    if (Object.keys(update).length === 0) {
      setError("변경할 값이 없습니다. (빈 값은 '변경 없음'으로 처리됩니다)");
      return;
    }

    payload.update = update;

    setBusy("update");
    try {
      const res = await fetch("/api/admin/textbooks/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("UPDATE_FAILED");
      // reset inputs after successful apply
      setPrice("");
      setOriginalPrice("");
      setTeacherName("");
      setSubjectName("");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("일괄 변경에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function bulkDelete() {
    setError(null);
    if (!selectedIds.length) return;
    if (!confirm(`선택한 ${selectedIds.length}개 교재를 정말 삭제하시겠습니까? (되돌릴 수 없습니다)`)) return;

    setBusy("delete");
    try {
      const res = await fetch("/api/admin/textbooks/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", textbookIds: selectedIds }),
      });
      if (!res.ok) throw new Error("DELETE_FAILED");
      clearAll();
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("일괄 삭제에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  if (!textbooks.length) return null;

  return (
    <div className="space-y-3">
      {/* Bulk actions */}
      <div className="rounded-xl border border-white/10 bg-[#1a1a1c] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={allSelected ? clearAll : selectAll}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              {allSelected ? "전체 선택 해제" : "전체 선택"}
            </button>
            <span className="text-sm text-white/50">
              선택: <span className="text-white/80 font-medium">{selectedIds.length}</span>개
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={bulkDelete}
              disabled={!selectedIds.length || busy != null}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 disabled:opacity-50"
            >
              {busy === "delete" ? "삭제 중..." : "선택 삭제"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="block text-xs text-white/50 mb-1">할인 가격(원)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="예: 49000"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-white/50 mb-1">원래 가격(원)</label>
            <input
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="예: 99000"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-white/50 mb-1">선생님 이름</label>
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-white/50 mb-1">과목명</label>
            <input
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="예: 수학"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
            />
          </div>
          <div className="md:col-span-12 flex items-center justify-between gap-3">
            <p className="text-xs text-white/35">
              빈 값은 <span className="text-white/60">변경 없음</span>으로 처리됩니다.
            </p>
            <button
              type="button"
              onClick={bulkUpdate}
              disabled={!selectedIds.length || busy != null}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              {busy === "update" ? "적용 중..." : "선택 항목에 적용"}
            </button>
          </div>
          {error && (
            <div className="md:col-span-12 text-sm text-red-400">{error}</div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-3">
        {textbooks.map((t) => {
          const checked = selected.has(t.id);
          return (
            <div
              key={t.id}
              className={`group rounded-xl border bg-[#1a1a1c] p-4 transition-colors hover:bg-white/[0.04] ${
                checked ? "border-white/30" : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(t.id)}
                    className="mt-1 h-4 w-4 accent-white"
                    aria-label="선택"
                  />

                  <Link href={`/admin/textbook/${t.id}`} className="flex items-start gap-4 flex-1 min-w-0">
                    <TextbookAutoThumbnail textbookId={t.id} existingThumbnailUrl={t.thumbnailUrl} sizeBytes={t.sizeBytes} />

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{t.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
                        <span className="truncate max-w-[200px]" title={t.originalName}>
                          {t.originalName}
                        </span>
                        <span>•</span>
                        <span>{formatBytes(t.sizeBytes)}</span>
                        <span>•</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {t.imwebProdCode ? (
                          <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/70">코드: {t.imwebProdCode}</span>
                        ) : (
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-white/40">전체 공개</span>
                        )}
                        <span className="text-white/40">{t.entitlementDays ?? 30}일</span>
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center gap-3 lg:shrink-0">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      t.isPublished ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {t.isPublished ? "공개" : "비공개"}
                  </span>
                  {/* per-item delete still available */}
                  <form action={`/api/admin/textbooks/${t.id}/delete`} method="post" onSubmit={(e) => {
                    if (!confirm("정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) e.preventDefault();
                  }}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


