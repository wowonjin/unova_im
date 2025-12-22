"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAllCoursesTestModeFromAllParam, withAllParamIfNeeded } from "@/lib/test-mode";

type CurriculumLesson = {
  id: string;
  title: string;
  position: number;
  durationSeconds: number | null;
  percent: number; // 0~100
  completed: boolean;
};

type Props = {
  courseId: string;
  lessons: CurriculumLesson[];
};

function fmtTime(totalSeconds: number | null) {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${m}:${ss.padStart(2, "0")}`;
}

export default function CourseCurriculumClient({ lessons }: Props) {
  const searchParams = useSearchParams();
  const allowAll = isAllCoursesTestModeFromAllParam(searchParams.get("all"));
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "notStarted" | "inProgress" | "completed">("all");

  const stats = useMemo(() => {
    const total = lessons.length;
    const completed = lessons.filter((l) => l.completed).length;
    const inProgress = lessons.filter((l) => !l.completed && l.percent > 0).length;
    const notStarted = total - completed - inProgress;
    return { total, completed, inProgress, notStarted };
  }, [lessons]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return lessons.filter((l) => {
      if (filter === "completed" && !l.completed) return false;
      if (filter === "inProgress" && (l.completed || l.percent <= 0)) return false;
      if (filter === "notStarted" && (l.completed || l.percent > 0)) return false;
      if (!query) return true;
      return `${l.position} ${l.title}`.toLowerCase().includes(query);
    });
  }, [lessons, q, filter]);

  return (
    <div className="mt-6">
      {/* 메인: 커리큘럼 */}
      <section className="rounded-2xl border border-white/10 bg-white/5">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">커리큘럼</h2>
            <p className="mt-1 text-xs text-white/60">
              총 {stats.total}강 · 완료 {stats.completed} · 진행중 {stats.inProgress} · 미수강 {stats.notStarted}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
              {(
                [
                  ["all", "전체"],
                  ["inProgress", "진행중"],
                  ["completed", "완료"],
                  ["notStarted", "미수강"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    filter === k ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="강의명 검색"
              className="h-10 w-full rounded-xl border border-white/10 bg-[#1d1d1f] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/10 sm:w-56"
            />
          </div>
        </div>

        <ul className="divide-y divide-white/10">
          {filtered.map((l) => {
            const time = fmtTime(l.durationSeconds);
            const pct = Math.max(0, Math.min(100, Math.round(l.percent)));
            const stateLabel = l.completed ? "완료" : pct > 0 ? "진행중" : "미수강";
            return (
              <li key={l.id} className="px-5 py-4">
                <Link
                  href={withAllParamIfNeeded(`/lesson/${l.id}`, allowAll)}
                  className="group flex items-start gap-4 rounded-xl p-3 hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70">{l.position}강</span>
                      <span
                        className={`rounded-lg px-2 py-1 text-xs ${
                          l.completed
                            ? "bg-emerald-500/15 text-emerald-200"
                            : pct > 0
                              ? "bg-sky-500/15 text-sky-200"
                              : "bg-white/10 text-white/70"
                        }`}
                      >
                        {stateLabel}
                      </span>
                      {time ? <span className="text-xs text-white/50">{time}</span> : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium group-hover:text-white">{l.title}</p>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>진도</span>
                        <span className="font-medium text-white/80">{pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                        <div className="h-1.5 rounded-full bg-white/70" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}


