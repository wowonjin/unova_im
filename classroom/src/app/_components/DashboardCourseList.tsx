"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FavoriteStarButton from "@/app/_components/FavoriteStarButton";

type Card = {
  enrollmentId: string;
  courseId: string;
  title: string;
  thumbnail: boolean;
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
  // iso: 2025-12-18T...
  return iso.slice(2, 10).replace(/-/g, ".");
}

function parseCourseMeta(title: string) {
  const bracket = title.match(/\[\s*([^\]]+)\]/)?.[1]?.trim() ?? null;
  const subjectFromBracket = bracket && !/^\d{2,4}$/.test(bracket) ? bracket : null;
  const subjectFromText = title.match(/(수학|국어|영어|과학|사회)/)?.[1] ?? null;
  const subject = subjectFromBracket ?? subjectFromText ?? null;
  const teacher = title.match(/\]\s*([^\s]+?)T\b/)?.[1]?.trim() ?? null;
  return { subject, teacher };
}

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
  const [fav, setFav] = useState<Set<string>>(() => readFavorites());
  const router = useRouter();

  const shouldOpenSidePanel = () => {
    if (!onSelectCourse) return false;
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(min-width: 1024px)")?.matches ?? window.innerWidth >= 1024;
  };

  useEffect(() => {
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
    arr.sort((a, b) => {
      const af = fav.has(a.courseId) ? 1 : 0;
      const bf = fav.has(b.courseId) ? 1 : 0;
      if (af !== bf) return bf - af; // 즐겨찾기 먼저

      const ad = a.lastProgressAtISO ?? a.startAtISO;
      const bd = b.lastProgressAtISO ?? b.startAtISO;
      if (ad !== bd) return bd.localeCompare(ad); // 최근 수강일(ISO desc)

      return a.endAtISO.localeCompare(b.endAtISO);
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
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((en) => {
          const meta = parseCourseMeta(en.title);
          const recentISO = en.lastProgressAtISO ?? en.startAtISO;
          const selected = Boolean(selectedCourseId && selectedCourseId === en.courseId);
          const thumbSrc = en.thumbnail ? `/api/courses/${en.courseId}/thumbnail` : null;
          return (
          <div
            key={en.enrollmentId}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (shouldOpenSidePanel()) onSelectCourse?.(en.courseId);
              else router.push(`/course/${en.courseId}`);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (shouldOpenSidePanel()) onSelectCourse?.(en.courseId);
                else router.push(`/course/${en.courseId}`);
              }
            }}
            className={`cursor-pointer rounded-2xl border p-5 focus:outline-none focus:ring-2 focus:ring-white/10 ${
              selected ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-4">
                {thumbSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbSrc}
                    alt="강좌 썸네일"
                    className="h-20 w-36 shrink-0 rounded-lg object-cover opacity-90"
                    loading="lazy"
                  />
                ) : null}

                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{en.title}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {(meta.subject ?? "수학")} {" | "} {(meta.teacher ?? "백하욱")} {" | "} 수강기간{" "}
                    {fmtISO(en.startAtISO)}~{fmtISO(en.endAtISO)} {" | "} 총 {en.totalLessons}강
                  </p>
                  <p className="mt-2 text-sm text-white/70">최근 수강일: {fmtISO(recentISO)}</p>
                </div>
              </div>
              <FavoriteStarButton courseId={en.courseId} />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">나의 학습 진도율</span>
                <span className="font-medium">
                  ({en.completedLessons}/{en.totalLessons}강) {en.avgPercent}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-white"
                  style={{ width: `${Math.min(100, Math.max(0, en.avgPercent))}%` }}
                />
              </div>
            </div>

            {en.lastLessonId ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="truncate text-sm text-white/80">
                  최근 수강: <span className="font-medium">{en.lastLessonTitle}</span>
                </p>
                <Link
                  href={`/lesson/${en.lastLessonId}`}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10"
                  onClick={(e) => {
                    // 카드 전체 클릭(강좌 이동)과 충돌 방지
                    e.stopPropagation();
                  }}
                >
                  이어보기
                </Link>
              </div>
            ) : null}
          </div>
        );
        })}
      </div>
    </div>
  );
}


