"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAllCoursesTestModeFromAllParam, withAllParamIfNeeded } from "@/lib/test-mode";

type Lesson = {
  id: string;
  title: string;
  position: number;
  vimeoVideoId: string;
  durationSeconds: number | null;
  percent: number;
  completed: boolean;
};

function ProgressRing({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const deg = p * 3.6;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(rgba(255,255,255,0.92) ${deg}deg, rgba(255,255,255,0.18) 0deg)`,
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-[#29292a] group-hover:bg-[#3f3e3f]">
        <span className="text-[11px] font-semibold text-white">{p}%</span>
      </div>
    </div>
  );
}

function fmtKoreanDuration(totalSeconds: number | null) {
  if (!totalSeconds || totalSeconds <= 0) return "-";
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}시간 ${m}분 ${sec}초`;
  return `${m}분 ${sec}초`;
}

function curriculumTitle(position: number, title: string) {
  const stripped = title.replace(new RegExp(`^(?:\\s*${position}\\s*강\\s*\\.?\\s*)+`), "").trim();
  return `${position}강. ${stripped || title}`;
}

function vimeoThumbUrl(vimeoVideoId: string) {
  return `https://vumbnail.com/${encodeURIComponent(vimeoVideoId)}.jpg`;
}

export default function DashboardCourseSidePanel({
  open,
  courseId,
  courseTitle,
  onClose,
}: {
  open: boolean;
  courseId: string | null;
  courseTitle: string | null;
  onClose: () => void;
}) {
  const searchParams = useSearchParams();
  const allowAll = isAllCoursesTestModeFromAllParam(searchParams.get("all"));
  const [loading, setLoading] = useState(false);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !courseId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(withAllParamIfNeeded(`/api/courses/${courseId}/curriculum`, allowAll))
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `HTTP_${r.status}`);
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setLessons(Array.isArray(data?.lessons) ? data.lessons : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e));
        setLessons([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, courseId, allowAll]);

  const headerTitle = courseTitle || "커리큘럼";
  const list = useMemo(() => lessons ?? [], [lessons]);

  return (
    <>
      {/* Desktop overlay */}
      {open ? (
        <div
          className="fixed inset-0 z-[80] hidden bg-black/40 lg:block"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed bottom-0 right-0 top-16 z-[90] hidden w-[420px] border-l border-white/10 bg-[#1d1d1f] transition-transform duration-200 lg:block ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
            <div className="min-w-0">
              <p className="text-xs text-white/60">커리큘럼</p>
              <p className="mt-1 truncate text-base font-semibold">{headerTitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="사이드 패널 닫기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {loading ? <p className="text-sm text-white/70">불러오는 중…</p> : null}
            {error ? <p className="text-sm text-red-300">불러오기 실패: {error}</p> : null}

            {!loading && !error && list.length === 0 ? (
              <p className="text-sm text-white/70">노출된 강의가 없습니다.</p>
            ) : null}

            <ul className="space-y-2">
              {list.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/lesson/${l.id}`}
                    className="group block rounded-xl border border-white/10 bg-transparent px-3 py-3 hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vimeoThumbUrl(l.vimeoVideoId)}
                          alt=""
                          aria-hidden="true"
                          className="mt-0.5 h-12 w-20 shrink-0 rounded-md object-cover bg-black/20"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium">{curriculumTitle(l.position, l.title)}</p>
                          <p className="mt-1 text-[11px] text-white/60">강의 시간: {fmtKoreanDuration(l.durationSeconds)}</p>
                        </div>
                      </div>
                      <ProgressRing percent={l.percent} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}


