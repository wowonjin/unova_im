"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TextbookAutoThumbnail from "@/app/_components/TextbookAutoThumbnail";
import { Badge, Button, Field, Input } from "@/app/_components/ui";

type TextbookRow = {
  id: string;
  position?: number;
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
  gradeCategory?: "G1_2" | "SUNEUNG" | "TRANSFER" | null;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

function formatMoneyKRW(amount: number | null | undefined) {
  if (!Number.isFinite(amount ?? NaN)) return null;
  return new Intl.NumberFormat("ko-KR").format(amount as number);
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
  const [items, setItems] = useState<TextbookRow[]>(() => textbooks);
  const lastItemsRef = useRef<TextbookRow[]>(textbooks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ===== Filters =====
  const [q, setQ] = useState("");
  const [published, setPublished] = useState<"all" | "published" | "unpublished">("all");
  const [sale, setSale] = useState<"all" | "priced" | "no_price">("all");
  const [thumb, setThumb] = useState<"all" | "has" | "missing">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of items) {
      const v = (t.subjectName || "").trim();
      if (v) set.add(v);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b, "ko"))];
  }, [items]);
  const teacherOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of items) {
      const v = (t.teacherName || "").trim();
      if (v) set.add(v);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b, "ko"))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((t) => {
      if (qq) {
        const hay = `${t.title} ${t.originalName}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      if (published !== "all") {
        if (published === "published" && !t.isPublished) return false;
        if (published === "unpublished" && t.isPublished) return false;
      }
      if (sale !== "all") {
        const hasPrice = Number.isFinite(t.price ?? NaN) && (t.price as number) > 0;
        if (sale === "priced" && !hasPrice) return false;
        if (sale === "no_price" && hasPrice) return false;
      }
      if (thumb !== "all") {
        const hasThumb = Boolean(t.thumbnailUrl);
        if (thumb === "has" && !hasThumb) return false;
        if (thumb === "missing" && hasThumb) return false;
      }
      if (subjectFilter !== "all") {
        if ((t.subjectName || "") !== subjectFilter) return false;
      }
      if (teacherFilter !== "all") {
        if ((t.teacherName || "") !== teacherFilter) return false;
      }
      return true;
    });
  }, [items, q, published, sale, thumb, subjectFilter, teacherFilter]);

  const hasActiveFilter =
    q.trim() ||
    published !== "all" ||
    sale !== "all" ||
    thumb !== "all" ||
    subjectFilter !== "all" ||
    teacherFilter !== "all";

  const visibleIds = useMemo(() => filteredItems.map((t) => t.id), [filteredItems]);
  const selectedIds = useMemo(() => Array.from(selected).filter((id) => visibleIds.includes(id)), [selected, visibleIds]);
  const allSelected = selectedIds.length > 0 && selectedIds.length === visibleIds.length;

  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [entitlementDays, setEntitlementDays] = useState("");
  const [gradeCategory, setGradeCategory] = useState<"" | "G1_2" | "SUNEUNG" | "TRANSFER">("");
  const [publishOnRegister, setPublishOnRegister] = useState(false);
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
    setSelected(new Set(visibleIds));
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
    if (gradeCategory) update.gradeCategory = gradeCategory;
    if (entitlementDays.trim()) {
      const n = parseInt(entitlementDays.trim(), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 3650) update.entitlementDays = n;
      else {
        setError("이용 기간(일)은 1~3650 사이의 숫자여야 합니다.");
        return;
      }
    }
    // 판매 등록 UX: 체크되어 있으면 공개로 전환(기본값)
    if (publishOnRegister) update.isPublished = true;

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
      setGradeCategory("");
      setEntitlementDays("");
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

  async function persistOrder(next: TextbookRow[]) {
    const ids = next.map((t) => t.id);
    try {
      const res = await fetch("/api/admin/textbooks/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ textbookIds: ids }),
      });
      if (!res.ok) throw new Error("REORDER_FAILED");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("순서 저장에 실패했습니다.");
      // revert UI
      setItems(lastItemsRef.current);
    }
  }

  function moveItem(fromId: string, toId: string) {
    if (fromId === toId) return;
    const fromIndex = items.findIndex((t) => t.id === fromId);
    const toIndex = items.findIndex((t) => t.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = items.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    lastItemsRef.current = items;
    setItems(next);
    void persistOrder(next);
  }

  if (!items.length) return null;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1c] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="w-full lg:w-[360px]">
              <Field label="검색" hint="제목/파일명/상품코드 기준">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: CONNECT / 2027 / 코드" className="bg-transparent" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              <div className="md:col-span-1">
                <Field label="공개">
                  <select
                    value={published}
                    onChange={(e) => setPublished(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#131315] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  >
                    <option value="all">전체</option>
                    <option value="published">공개</option>
                    <option value="unpublished">비공개</option>
                  </select>
                </Field>
              </div>
              <div className="md:col-span-1">
                <Field label="가격">
                  <select
                    value={sale}
                    onChange={(e) => setSale(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#131315] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  >
                    <option value="all">전체</option>
                    <option value="priced">가격 있음</option>
                    <option value="no_price">가격 없음</option>
                  </select>
                </Field>
              </div>
              <div className="md:col-span-1">
                {/* 접근/상품코드 기반 필터는 제거(요청사항) */}
                <Field label="썸네일">
                  <select
                    value={thumb}
                    onChange={(e) => setThumb(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#131315] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  >
                    <option value="all">전체</option>
                    <option value="has">있음</option>
                    <option value="missing">없음</option>
                  </select>
                </Field>
              </div>
              <div className="md:col-span-1">
                <Field label="과목">
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#131315] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  >
                    {subjectOptions.map((s) => (
                      <option key={s} value={s}>
                        {s === "all" ? "전체" : s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="md:col-span-1">
                <Field label="선생님">
                  <select
                    value={teacherFilter}
                    onChange={(e) => setTeacherFilter(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#131315] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  >
                    {teacherOptions.map((s) => (
                      <option key={s} value={s}>
                        {s === "all" ? "전체" : s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-white/50">
              표시: <span className="text-white/85 font-medium">{filteredItems.length}</span> / {items.length}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQ("");
                setPublished("all");
                setSale("all");
                setThumb("all");
                setSubjectFilter("all");
                setTeacherFilter("all");
                clearAll();
              }}
            >
              필터 초기화
            </Button>
          </div>
        </div>
        {hasActiveFilter ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            필터가 적용된 상태에서는 정렬(드래그)이 꺼집니다. (전체 보기로 돌리면 다시 사용 가능)
          </div>
        ) : null}
      </div>

      {/* Bulk Update */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1c] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-white/70">
            선택됨: <span className="text-white font-semibold">{selectedIds.length}</span> / {visibleIds.length}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={selectAll}>
              전체 선택
            </Button>
            <Button type="button" variant="secondary" onClick={clearAll}>
              선택 해제
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="학년 일괄 변경">
            <select
              value={gradeCategory}
              onChange={(e) => setGradeCategory(e.target.value as typeof gradeCategory)}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#131315] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
            >
              <option value="">변경 없음</option>
              <option value="G1_2">고1/2</option>
              <option value="SUNEUNG">수능</option>
              <option value="TRANSFER">편입</option>
            </select>
          </Field>
          <Field label="공개로 전환">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#131315] px-3">
              <input
                type="checkbox"
                checked={publishOnRegister}
                onChange={(e) => setPublishOnRegister(e.target.checked)}
                className="h-4 w-4 accent-white"
              />
              <span className="text-sm text-white/70">선택 항목 공개</span>
            </div>
          </Field>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void bulkUpdate()} disabled={busy !== null || selectedIds.length === 0}>
            선택 항목 변경 적용
          </Button>
          <button
            type="button"
            onClick={() => void bulkDelete()}
            disabled={busy !== null || selectedIds.length === 0}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            선택 항목 삭제
          </button>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredItems.map((t) => {
          const checked = selected.has(t.id);
          return (
            <div
              key={t.id}
              onDragOver={(e) => {
                if (!draggingId) return;
                if (hasActiveFilter) return;
                e.preventDefault();
                setDragOverId(t.id);
              }}
              onDragLeave={() => {
                if (dragOverId === t.id) setDragOverId(null);
              }}
              onDrop={(e) => {
                if (!draggingId) return;
                if (hasActiveFilter) return;
                e.preventDefault();
                setDragOverId(null);
                moveItem(draggingId, t.id);
              }}
              className={`group rounded-xl border bg-[#1a1a1c] p-4 transition-colors hover:bg-white/[0.04] ${
                dragOverId === t.id && draggingId !== t.id
                  ? "border-white/40 bg-white/[0.05]"
                  : checked
                    ? "border-white/30"
                    : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Drag handle */}
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      setError(null);
                      if (hasActiveFilter) return;
                      setDraggingId(t.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", t.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 ${
                      hasActiveFilter ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"
                    }`}
                    title="드래그하여 순서 변경"
                    aria-label="드래그하여 순서 변경"
                    onClick={(e) => e.preventDefault()}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 4a1 1 0 102 0 1 1 0 00-2 0zM7 10a1 1 0 102 0 1 1 0 00-2 0zM7 16a1 1 0 102 0 1 1 0 00-2 0zM11 4a1 1 0 102 0 1 1 0 00-2 0zM11 10a1 1 0 102 0 1 1 0 00-2 0zM11 16a1 1 0 102 0 1 1 0 00-2 0z" />
                    </svg>
                  </button>
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
                        <Badge tone="muted">교재</Badge>
                        <span className="text-white/40">{t.entitlementDays ?? 30}일</span>
                      </div>

                      {/* Prices (always show both) */}
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                        <span className="text-white/40">할인가</span>
                        <span className="font-semibold text-white/85">
                          {formatMoneyKRW(t.price) ? `${formatMoneyKRW(t.price)}원` : "미설정"}
                        </span>
                        <span className="text-white/30">원래가</span>
                        <span className="text-white/50 line-through decoration-white/30">
                          {formatMoneyKRW(t.originalPrice) ? `${formatMoneyKRW(t.originalPrice)}원` : "미설정"}
                        </span>
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
                  <Link
                    href={`/store/${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10"
                    title="스토어에서 보기(구매 테스트)"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      shopping_bag
                    </span>
                    스토어
                  </Link>
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


