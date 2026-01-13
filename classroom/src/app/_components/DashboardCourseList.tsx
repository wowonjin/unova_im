"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FavoriteStarButton from "@/app/_components/FavoriteStarButton";
import { isAllCoursesTestModeFromAllParam, withAllParamIfNeeded } from "@/lib/test-mode";

type Card = {
  enrollmentId: string;
  courseId: string;
  title: string;
  thumbnail: boolean;
  thumbnailUpdatedAtISO: string | null;
  isEnrolled: boolean;
  startAtISO: string;
  endAtISO: string;
  totalLessons: number;
  avgPercent: number;
  completedLessons: number;
  lastLessonId: string | null;
  lastLessonTitle: string | null;
  lastProgressAtISO: string | null;
};

const LS_KEY = "unova_favorite_courses_v1";
const FAVORITES_CHANGED_EVENT = "unova-favorites-changed";

function readFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function fmtISO(iso: string) {
  return iso.slice(2, 10).replace(/-/g, ".");
}

function parseCourseMeta(title: string) {
  const bracket = title.match(/\[\s*([^\]]+)\]/)?.[1]?.trim() ?? null;
  const subjectFromBracket = bracket && !/^\d{2,4}$/.test(bracket) ? bracket : null;
  // 과목 패턴: 물리학I, 물리학II, 물리, 화학, 생물, 지구과학, 수학, 국어, 영어, 과학, 사회 등
  const subjectFromText = title.match(/(물리학[IⅠⅡ]*|화학[IⅠⅡ]*|생물[IⅠⅡ]*|지구과학[IⅠⅡ]*|수학|국어|영어|과학|사회)/)?.[1] ?? null;
  const subject = subjectFromBracket ?? subjectFromText ?? null;
  const teacher = title.match(/\]\s*([^\s]+?)T\b/)?.[1]?.trim() ?? null;
  return { subject, teacher };
}

type SortKey = "teacher" | "subject" | "progress" | "subjectWatch";
type SortDir = "asc" | "desc";

// 요청사항: 정렬 옵션 UI 제거 → URL 파라미터(sort/dir)는 무시하고 고정 정렬만 사용

export default function DashboardCourseList({
  cards,
  query,
  selectedCourseId,
  onSelectCourse,
}: {
  cards: Card[];
  query: string;
  selectedCourseId?: string | null;
  onSelectCourse?: (courseId: string) => void;
}) {
  const [fav, setFav] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const allowAll = isAllCoursesTestModeFromAllParam(searchParams.get("all"));

  const shouldOpenSidePanel = () => {
    if (!onSelectCourse) return false;
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(min-width: 1024px)")?.matches ?? window.innerWidth >= 1024;
  };

  // 마운트 후 클라이언트에서만 localStorage 값 읽기 (hydration 불일치 방지)
  useEffect(() => {
    setFav(readFavorites());
    const onChange = () => setFav(readFavorites());
    window.addEventListener(FAVORITES_CHANGED_EVENT, onChange as EventListener);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, onChange as EventListener);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const sorted = useMemo(() => {
    const arr = [...cards];

    const recentCmp = (a: typeof arr[number], b: typeof arr[number]) => {
      const ad = a.lastProgressAtISO ?? a.startAtISO;
      const bd = b.lastProgressAtISO ?? b.startAtISO;
      if (ad !== bd) return bd.localeCompare(ad);
      return a.endAtISO.localeCompare(b.endAtISO);
    };

    // 고정 정렬: (1) 즐겨찾기 우선 (2) 진도율 내림차순 (3) 최근 수강 보조정렬
    const keyCmp = (a: typeof arr[number], b: typeof arr[number]) => {
      const ap = Number.isFinite(a.avgPercent) ? a.avgPercent : 0;
      const bp = Number.isFinite(b.avgPercent) ? b.avgPercent : 0;
      if (ap !== bp) return bp - ap;
      return recentCmp(a, b);
    };

    arr.sort((a, b) => {
      const af = fav.has(a.courseId) ? 1 : 0;
      const bf = fav.has(b.courseId) ? 1 : 0;
      if (af !== bf) return bf - af;
      return keyCmp(a, b);
    });
    return arr;
  }, [cards, fav]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => {
      const meta = parseCourseMeta(c.title);
      const hay = [
        c.title,
        meta.subject ?? "",
        meta.teacher ?? "",
        c.lastLessonTitle ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, sorted]);

  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((en) => {
          const meta = parseCourseMeta(en.title);
          const recentISO = en.lastProgressAtISO ?? en.startAtISO;
          const selected = Boolean(selectedCourseId && selectedCourseId === en.courseId);
          const thumbSrc = en.thumbnail
            ? withAllParamIfNeeded(
                `/api/courses/${en.courseId}/thumbnail${
                  en.thumbnailUpdatedAtISO ? `?v=${encodeURIComponent(en.thumbnailUpdatedAtISO)}` : ""
                }`,
                allowAll
              )
            : "/course-placeholder.svg";
          const teacherLabel = meta.teacher?.trim() || "";
          const subjectLabel = meta.subject?.trim() || "";

          return (
            <div
              key={en.enrollmentId}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (shouldOpenSidePanel()) onSelectCourse?.(en.courseId);
                else onSelectCourse?.(en.courseId);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (shouldOpenSidePanel()) onSelectCourse?.(en.courseId);
                  else onSelectCourse?.(en.courseId);
                }
              }}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-white/10 ${
                selected
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-[#1C1C1C] hover:bg-[#232323]"
              }`}
            >
              {/* 썸네일 */}
              <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbSrc}
                  alt={en.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {/* 즐겨찾기 별 (주황색) */}
                <div className="absolute right-2 top-2">
                  <FavoriteStarButton courseId={en.courseId} />
                </div>
              </div>

              {/* 정보 */}
              <div className="p-4">
                <h3 className="font-medium text-white leading-snug">{en.title}</h3>
                <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                  {teacherLabel && <span>{teacherLabel}T</span>}
                  {teacherLabel && subjectLabel && <span>·</span>}
                  {subjectLabel && <span>{subjectLabel}</span>}
                </div>

                {/* 진도율 */}
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">학습 진도율</span>
                    <span className="font-medium text-white/70">
                      {en.totalLessons}강 ({en.avgPercent}%)
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-white/60"
                      style={{ width: `${Math.min(100, Math.max(0, en.avgPercent))}%` }}
                    />
                  </div>
                </div>

                {/* 최근 수강 */}
                <div className="mt-3 text-xs">
                  {en.lastLessonId && en.lastLessonTitle ? (
                    <button
                      type="button"
                      className="w-full text-left text-white/50 hover:text-white/80 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(withAllParamIfNeeded(`/lesson/${en.lastLessonId}`, allowAll));
                      }}
                    >
                      <span className="text-white/40">최근 수강:</span>{" "}
                      <span className="text-white/60">{fmtISO(recentISO)}</span>{" "}
                      <span className="text-white/40">·</span>{" "}
                      <span className="text-white/60 hover:underline">{en.lastLessonTitle}</span>
                    </button>
                  ) : en.lastProgressAtISO ? (
                    <span className="text-white/40">최근 수강: {fmtISO(recentISO)}</span>
                  ) : (
                    <span className="text-white/40">최근 수강이 없습니다</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
