"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Course = {
  id: string;
  position?: number;
  title: string;
  slug: string;
  teacherName: string | null;
  subjectName: string | null;
  isPublished: boolean;
  isSoldOut: boolean;
  updatedAtISO: string;
  thumbnailStoredPath: string | null;
  thumbnailUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  lessonCount: number;
  publishedLessonCount: number;
  enrollmentCount: number;
};

function formatMoneyKRW(amount: number | null | undefined) {
  if (!Number.isFinite(amount ?? NaN)) return null;
  return new Intl.NumberFormat("ko-KR").format(amount as number);
}

function inferTeacherFromTitle(title: string) {
  const m = title.match(/\]\s*([^\s]+?)T\b/);
  if (!m?.[1]) return "";
  return m[1].trim();
}

function inferSubjectFromTitle(title: string) {
  const bracket = title.match(/\[\s*([^\]]+)\]/)?.[1]?.trim() ?? null;
  if (bracket && !/^\d{2,4}$/.test(bracket)) return bracket;
  return title.match(/(수학|국어|영어|과학|사회)/)?.[1] ?? "";
}

export default function CourseListClient({
  courses,
  q,
  publishedRaw,
}: {
  courses: Course[];
  q: string;
  publishedRaw: string;
}) {
  const [deleteMode, setDeleteMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [items, setItems] = useState<Course[]>(() => courses);
  const lastItemsRef = useRef<Course[]>(courses);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    setItems(courses);
    lastItemsRef.current = courses;
  }, [courses]);

  const hasActiveFilter = Boolean(q.trim()) || publishedRaw !== "all";
  const canReorder = !hasActiveFilter && !deleteMode;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === courses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(courses.map((c) => c.id)));
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const confirmed = window.confirm(`선택한 ${selected.size}개의 강좌를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      for (const courseId of selected) {
        const form = new FormData();
        form.append("courseId", courseId);
        await fetch("/api/admin/courses/delete", {
          method: "POST",
          body: form,
        });
      }
      window.location.reload();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelected(new Set());
  };

  function readDraggingIdFromEvent(e: React.DragEvent): string | null {
    const fromState = draggingId;
    if (fromState) return fromState;
    const fromTransfer = e.dataTransfer?.getData?.("text/plain");
    return typeof fromTransfer === "string" && fromTransfer ? fromTransfer : null;
  }

  async function persistOrder(next: Course[]) {
    setOrderError(null);
    const ids = next.map((c) => c.id);
    try {
      const res = await fetch("/api/admin/courses/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseIds: ids }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const err = typeof body?.error === "string" ? body.error : `HTTP_${res.status}`;
        throw new Error(err);
      }
      window.location.reload();
    } catch (e) {
      console.error(e);
      const msg = String((e as any)?.message || "");
      if (msg === "FORBIDDEN" || msg === "HTTP_401" || msg === "HTTP_403") {
        setOrderError("권한이 없거나 로그인 정보가 만료되었습니다. 새로고침 후 다시 시도해주세요.");
      } else {
        setOrderError("순서 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
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

  return (
    <div className="rounded-2xl border border-white/10 bg-transparent">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">내 강좌 목록</div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${items.length ? "bg-white/10 text-white/80" : "bg-white/5 text-white/40"}`}>
            {items.length}개
          </span>
        </div>

        {/* Filters */}
        <form method="get" action="/admin/courses" className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            name="q"
            defaultValue={q}
            placeholder="제목/선생님/과목 검색 후 Enter"
            className="h-9 w-full rounded-xl border border-white/10 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-white/10 sm:w-72"
          />
          <select
            name="published"
            defaultValue={publishedRaw}
            className="h-9 w-full rounded-xl border border-white/10 bg-transparent px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10 sm:w-40"
            aria-label="공개 상태 필터"
          >
            <option value="all">전체</option>
            <option value="1">공개만</option>
            <option value="0">비공개만</option>
            <option value="soldout">준비중</option>
          </select>

          {!deleteMode ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteMode(true)}
                className="h-9 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                삭제하기
              </button>
              <span className={`text-xs ${hasActiveFilter ? "text-white/35" : "text-white/50"}`}>
                {hasActiveFilter ? "검색/필터 중에는 드래그 정렬이 꺼집니다" : "드래그로 순서 변경 가능"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/70 transition-colors hover:bg-white/10"
              >
                {selected.size === items.length ? "전체 해제" : "전체 선택"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={selected.size === 0 || deleting}
                className="h-9 rounded-xl bg-red-500 px-4 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : `${selected.size}개 삭제`}
              </button>
              <button
                type="button"
                onClick={cancelDeleteMode}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/70 transition-colors hover:bg-white/10"
              >
                취소
              </button>
            </div>
          )}
        </form>
      </div>

      {hasActiveFilter ? (
        <div className="border-b border-white/10 px-5 py-3 text-xs text-white/50">
          검색/필터 상태에서는 정렬(드래그)이 꺼집니다. (필터를 전체로 돌리면 다시 사용 가능)
        </div>
      ) : null}

      {orderError ? (
        <div className="border-b border-red-500/30 bg-red-500/10 px-5 py-3 text-xs text-red-200">
          {orderError}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((c) => {
            const teacherLabel = c.teacherName?.trim() || inferTeacherFromTitle(c.title) || "";
            const subjectLabel = c.subjectName?.trim() || inferSubjectFromTitle(c.title) || "";
            const hasThumbnail = Boolean(c.thumbnailStoredPath || c.thumbnailUrl);
            // NOTE: 썸네일은 재업로드 시 변경될 수 있으므로, 목록에서도 캐시 버스팅 파라미터를 붙인다.
            const thumbSrc = hasThumbnail
              ? `/api/courses/${c.id}/thumbnail?v=${encodeURIComponent(c.updatedAtISO)}`
              : "/course-placeholder.svg";
            const isSelected = selected.has(c.id);
            const statusLabel = !c.isPublished ? "비공개" : c.isSoldOut ? "준비중" : "공개";
            const statusToneClass = !c.isPublished
              ? "bg-white/10 text-white/60"
              : c.isSoldOut
                ? "bg-zinc-500/30 text-zinc-100"
                : "bg-emerald-500/20 text-emerald-300";

            const cardContent = (
              <>
                {/* 썸네일 */}
                <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02]">
                  {/* Drag handle (정렬 가능할 때만) */}
                  <div className="absolute left-2 top-2 z-10">
                    <button
                      type="button"
                      draggable={canReorder}
                      onClick={(e) => e.preventDefault()}
                      onDragStart={(e) => {
                        setOrderError(null);
                        if (!canReorder) return;
                        setDraggingId(c.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", c.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-black/40 text-white/60 backdrop-blur-sm ${
                        canReorder ? "cursor-grab active:cursor-grabbing hover:bg-black/55" : "cursor-not-allowed opacity-40"
                      }`}
                      title={canReorder ? "드래그하여 순서 변경" : "전체 보기에서만 정렬할 수 있습니다"}
                      aria-label="드래그하여 순서 변경"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M7 4a1 1 0 102 0 1 1 0 00-2 0zM7 10a1 1 0 102 0 1 1 0 00-2 0zM7 16a1 1 0 102 0 1 1 0 00-2 0zM11 4a1 1 0 102 0 1 1 0 00-2 0zM11 10a1 1 0 102 0 1 1 0 00-2 0zM11 16a1 1 0 102 0 1 1 0 00-2 0z" />
                      </svg>
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc}
                    alt={c.title}
                    className="h-full w-full object-cover"
                  />
                  {/* 공개 상태 */}
                  <div className="absolute right-2 top-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${statusToneClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  {/* 선택 체크박스 */}
                  {deleteMode && (
                    <div className="absolute left-2 top-2">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                        isSelected ? "border-red-500 bg-red-500" : "border-white/40 bg-black/40"
                      }`}>
                        {isSelected && (
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="p-4">
                  <h3 className="font-medium text-white leading-snug">{c.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-white/50">
                    <div className="flex items-center gap-2">
                      {teacherLabel && <span>{teacherLabel}T</span>}
                      {teacherLabel && subjectLabel && <span>·</span>}
                      {subjectLabel && <span>{subjectLabel}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-white/40">
                      <span>{c.enrollmentCount}명</span>
                      <span>·</span>
                      <span>{c.publishedLessonCount}/{c.lessonCount}차시</span>
                    </div>
                  </div>

                  {/* Prices (always show both) */}
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                    <span className="text-white/40">할인가</span>
                    <span className="font-semibold text-white/85">
                      {formatMoneyKRW(c.price) ? `${formatMoneyKRW(c.price)}원` : "미설정"}
                    </span>
                    <span className="text-white/30">원래가</span>
                    <span className="text-white/50 line-through decoration-white/30">
                      {formatMoneyKRW(c.originalPrice) ? `${formatMoneyKRW(c.originalPrice)}원` : "미설정"}
                    </span>
                  </div>
                </div>
              </>
            );

            if (deleteMode) {
              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all ${
                    isSelected
                      ? "border-red-500 bg-red-500/10"
                      : "border-white/10 bg-transparent hover:border-white/20 hover:bg-transparent"
                  }`}
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={c.id}
                href={`/admin/course/${c.id}?tab=settings`}
                draggable={canReorder}
                onDragStart={(e) => {
                  setOrderError(null);
                  if (!canReorder) return;
                  setDraggingId(c.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", c.id);
                }}
                onDragOver={(e) => {
                  const fromId = readDraggingIdFromEvent(e);
                  if (!fromId) return;
                  if (!canReorder) return;
                  e.preventDefault();
                  setDragOverId(c.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === c.id) setDragOverId(null);
                }}
                onDrop={(e) => {
                  const fromId = readDraggingIdFromEvent(e);
                  if (!fromId) return;
                  if (!canReorder) return;
                  e.preventDefault();
                  setDragOverId(null);
                  moveItem(fromId, c.id);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverId(null);
                }}
                className={`group relative overflow-hidden rounded-xl border bg-transparent transition-all hover:border-white/20 hover:bg-transparent ${
                  dragOverId === c.id && draggingId !== c.id ? "border-white/30 ring-1 ring-white/15" : "border-white/10"
                }`}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-white/60">
          아직 생성된 강좌가 없습니다.
        </div>
      )}
    </div>
  );
}

