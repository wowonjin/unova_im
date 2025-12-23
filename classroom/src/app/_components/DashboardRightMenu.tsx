"use client";

import Link from "next/link";

type RecentCourse = {
  courseId: string;
  title: string;
  lastLessonId: string | null;
  lastLessonTitle: string | null;
  lastProgressAtISO: string;
};

function fmtISO(iso: string) {
  return iso.slice(2, 10).replace(/-/g, ".");
}

export default function DashboardRightMenu({
  query,
  setQuery,
  recentCourses,
}: {
  query: string;
  setQuery: (v: string) => void;
  recentCourses: RecentCourse[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:sticky lg:top-6">
      <div className="text-sm font-semibold">검색</div>

      <div className="mt-3">
        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="강좌/선생님/최근 수강 강의 검색"
            className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-white/10"
          />
          {query.trim().length ? (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold">최근 수강 강좌</div>
        {recentCourses.length === 0 ? (
          <p className="mt-2 text-sm text-white/70">최근 수강 기록이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentCourses.map((c) => (
              <li key={c.courseId} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <Link href={c.lastLessonId ? `/lesson/${c.lastLessonId}` : `/dashboard`} className="block">
                  <p className="truncate text-sm font-semibold">{c.title}</p>
                  <p className="mt-1 truncate text-xs text-white/60">
                    {c.lastLessonTitle ? `최근 강의: ${c.lastLessonTitle}` : "최근 강의: -"} · {fmtISO(c.lastProgressAtISO)}
                  </p>
                </Link>
                {c.lastLessonId ? (
                  <div className="mt-2">
                    <Link href={`/lesson/${c.lastLessonId}`} className="text-xs underline text-white/70 hover:text-white">
                      이어보기
                    </Link>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


