"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onProgressUpdated } from "@/lib/progress-events";
import { useSearchParams } from "next/navigation";
import { isAllCoursesTestModeFromAllParam, withAllParamIfNeeded } from "@/lib/test-mode";

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
        className={`absolute inset-[3px] flex items-center justify-center rounded-full bg-[#1d1d1f] group-hover:bg-[#3f3e3f] ${
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
  const [items, setItems] = useState<CurriculumLesson[]>(curriculum);
  const searchParams = useSearchParams();
  const allowAll = isAllCoursesTestModeFromAllParam(searchParams.get("all"));

  useEffect(() => {
    // 현재 강의가 우측 커리큘럼 목록에서 자동으로 보이도록 스크롤
    activeRef.current?.scrollIntoView({ block: "center" });
  }, [currentLessonId]);

  useEffect(() => {
    // 강의 이동 등으로 서버에서 새 curriculum이 내려오면 동기화
    setItems(curriculum);
  }, [curriculum]);

  useEffect(() => {
    // VimeoPlayer가 저장 성공 시 발행하는 이벤트를 받아 즉시 퍼센트 반영
    return onProgressUpdated(({ lessonId, percent, completed }) => {
      setItems((prev) =>
        prev.map((l) =>
          l.id === lessonId
            ? {
                ...l,
                percent,
                completed: Boolean(completed) || percent >= 99,
              }
            : l
        )
      );
    });
  }, []);

  return (
    <aside className="rounded-2xl border border-white/10">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs text-white/60">강의 목차</p>
        <p className="mt-1 truncate text-sm font-semibold">{courseTitle}</p>
      </div>

      {/* 강의 목차 리스트 - 비디오 플레이어 높이에 맞춤 */}
      <div className="max-h-[520px] overflow-auto px-3 py-3 scrollbar-hide">
        <ul className="space-y-0">
          {items.map((l) => {
            const pct = Math.max(0, Math.min(100, Math.round(l.percent)));
            const active = l.id === currentLessonId;
            const time = fmtTime(l.durationSeconds);
            const displayTitle = curriculumTitle(l.position, l.title);
            return (
              <li key={l.id}>
                <Link
                  href={withAllParamIfNeeded(`/lesson/${l.id}`, allowAll)}
                  ref={active ? activeRef : undefined}
                  className="group relative block -mx-3 px-3 py-3"
                >
                  {/* Hover/active highlight (full-width rectangle behind content) */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0 left-0 right-0 bg-white/10 opacity-0 transition-opacity ${
                      active ? "!opacity-100 bg-white/12" : "group-hover:opacity-100"
                    }`}
                  />

                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vimeoThumbUrl(l.vimeoVideoId)}
                        alt=""
                        aria-hidden="true"
                        className="mt-0.5 h-14 w-24 shrink-0 rounded-md object-cover bg-black/20"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium">{displayTitle}</p>
                        <p className="mt-1 text-[11px] text-white/60">강의 시간: {time ?? "-"}</p>
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


