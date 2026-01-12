"use client";

import { useState } from "react";
import Link from "next/link";

type Course = {
  id: string;
  title: string;
  slug: string;
  teacherName: string | null;
  subjectName: string | null;
  isPublished: boolean;
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

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">내 강좌 목록</div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${courses.length ? "bg-white/10 text-white/80" : "bg-white/5 text-white/40"}`}>
            {courses.length}개
          </span>
        </div>

        {/* Filters */}
        <form method="get" action="/admin/courses" className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            name="q"
            defaultValue={q}
            placeholder="제목/선생님/과목 검색 후 Enter"
            className="h-9 w-full rounded-xl border border-white/10 bg-[#1d1d1f] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-white/10 sm:w-72"
          />
          <select
            name="published"
            defaultValue={publishedRaw}
            className="h-9 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10 sm:w-40"
            aria-label="공개 상태 필터"
          >
            <option value="all">전체</option>
            <option value="1">공개만</option>
            <option value="0">비공개만</option>
          </select>

          {!deleteMode ? (
            <button
              type="button"
              onClick={() => setDeleteMode(true)}
              className="h-9 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              삭제하기
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/70 transition-colors hover:bg-white/10"
              >
                {selected.size === courses.length ? "전체 해제" : "전체 선택"}
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

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {courses.map((c) => {
            const teacherLabel = c.teacherName?.trim() || inferTeacherFromTitle(c.title) || "";
            const subjectLabel = c.subjectName?.trim() || inferSubjectFromTitle(c.title) || "";
            const hasThumbnail = Boolean(c.thumbnailStoredPath || c.thumbnailUrl);
            // NOTE: 썸네일은 재업로드 시 변경될 수 있으므로, 목록에서도 캐시 버스팅 파라미터를 붙인다.
            const thumbSrc = hasThumbnail
              ? `/api/courses/${c.id}/thumbnail?v=${encodeURIComponent(c.updatedAtISO)}`
              : "/course-placeholder.svg";
            const isSelected = selected.has(c.id);

            const cardContent = (
              <>
                {/* 썸네일 */}
                <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc}
                    alt={c.title}
                    className="h-full w-full object-cover"
                  />
                  {/* 공개 상태 */}
                  <div className="absolute right-2 top-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${
                      c.isPublished ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                    }`}>
                      {c.isPublished ? "공개" : "비공개"}
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
                      : "border-white/10 bg-[#1a1a1c] hover:border-white/20 hover:bg-[#1f1f21]"
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
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1c] transition-all hover:border-white/20 hover:bg-[#1f1f21]"
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

