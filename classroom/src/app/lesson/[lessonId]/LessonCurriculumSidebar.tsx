"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type CurriculumLesson = {
  id: string;
  title: string;
  position: number;
  vimeoVideoId: string;
  durationSeconds: number | null;
  percent: number;
  completed: boolean;
};

type Props = {
  courseId: string;
  courseTitle: string;
  currentLessonId: string;
  curriculum: CurriculumLesson[];
};

function ProgressRing({ percent, active }: { percent: number; active: boolean }) {
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
      <div
        className={`absolute inset-[3px] flex items-center justify-center rounded-full bg-[#29292a] group-hover:bg-[#3f3e3f] ${
          active ? "!bg-[#3f3e3f]" : ""
        }`}
      >
        <span className="text-[11px] font-semibold text-white">{p}%</span>
      </div>
    </div>
  );
}

function fmtTime(totalSeconds: number | null) {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}시간 ${m}분 ${sec}초`;
  return `${m}분 ${sec}초`;
}

function curriculumTitle(position: number, title: string) {
  // title like "1강. 오리엔테이션" / "1강 OT" / "1 강. OT" etc
  const stripped = title.replace(new RegExp(`^(?:\\s*${position}\\s*강\\s*\\.?\\s*)+`), "").trim();
  return `${position}강. ${stripped || title}`;
}

function vimeoThumbUrl(vimeoVideoId: string) {
  // Simple, no-auth thumbnail. (vimeoVideoId in seed is placeholder, but real IDs work)
  return `https://vumbnail.com/${encodeURIComponent(vimeoVideoId)}.jpg`;
}

export default function LessonCurriculumSidebar({ courseId, courseTitle, currentLessonId, curriculum }: Props) {
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    // 현재 강의가 우측 커리큘럼 목록에서 자동으로 보이도록 스크롤
    activeRef.current?.scrollIntoView({ block: "center" });
  }, [currentLessonId]);

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs text-white/60">강의 목차</p>
        <p className="mt-1 truncate text-sm font-semibold">{courseTitle}</p>
      </div>

      {/* Airclass 느낌: 오른쪽 고정 패널에 스크롤되는 커리큘럼 */}
      <div className="max-h-[70vh] overflow-auto px-3 py-3">
        <ul className="space-y-2">
          {curriculum.map((l) => {
            const pct = Math.max(0, Math.min(100, Math.round(l.percent)));
            const active = l.id === currentLessonId;
            const time = fmtTime(l.durationSeconds);
            const displayTitle = curriculumTitle(l.position, l.title);
            return (
              <li key={l.id}>
                <Link
                  href={`/lesson/${l.id}`}
                  ref={active ? activeRef : undefined}
                  className={`group block rounded-xl border px-3 py-3 hover:bg-white/10 ${
                    active ? "border-white/30 bg-white/10" : "border-white/10 bg-transparent"
                  }`}
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
                        <p className="line-clamp-2 text-sm font-medium">{displayTitle}</p>
                        <p className="mt-1 text-[11px] text-white/60">
                          강의 시간: {time ?? "-"}
                        </p>
                      </div>
                    </div>
                    <ProgressRing percent={pct} active={active} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}


