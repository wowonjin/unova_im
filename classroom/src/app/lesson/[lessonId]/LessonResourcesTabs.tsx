"use client";

import { useMemo, useState } from "react";
import LessonQna from "./LessonQna";
import { useSearchParams } from "next/navigation";
import { isAllCoursesTestModeFromAllParam, withAllParamIfNeeded } from "@/lib/test-mode";

type Attachment = {
  id: string;
  title: string;
  originalName: string;
  sizeBytes: number;
};

type Props = {
  lessonId: string;
  lessonPosition: number;
  lessonTitle: string;
  lessonDescription: string | null;
  lessonGoals: string[];
  lessonOutline: string[];
  prevLessonId: string | null;
  nextLessonId: string | null;
  isTeacher: boolean;
  currentUserEmail: string;
  courseAttachments: Attachment[];
  lessonAttachments: Attachment[];
};

function formatBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

function isPdfFileName(name: string) {
  return /\.pdf$/i.test(name.trim());
}

export default function LessonResourcesTabs({
  lessonId,
  lessonPosition,
  lessonTitle,
  lessonDescription,
  lessonGoals,
  lessonOutline,
  prevLessonId,
  nextLessonId,
  isTeacher,
  currentUserEmail,
  courseAttachments,
  lessonAttachments,
}: Props) {
  const searchParams = useSearchParams();
  const allowAll = isAllCoursesTestModeFromAllParam(searchParams.get("all"));
  const [tab, setTab] = useState<"description" | "files" | "qa">("description");
  const displayTitle = lessonTitle
    .replace(new RegExp(`^(?:\\s*${lessonPosition}\\s*강\\s*\\.?\\s*)+`), "")
    .trim();

  const allFiles = useMemo(
    () => [
      ...(courseAttachments || []).map((a) => ({ ...a, scope: "강좌" as const })),
      ...(lessonAttachments || []).map((a) => ({ ...a, scope: "차시" as const })),
    ],
    [courseAttachments, lessonAttachments]
  );

  return (
    <div className="mt-4">
      {/* 강의 소개(요청하신 블록): 탭(설명/자료/Q&A) 위에 고정 */}
      <div className="px-1">
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-xl bg-white/10 px-3 py-1 text-lg font-semibold leading-tight text-white md:text-2xl">
            {lessonPosition}강
          </span>
          <p className="min-w-0 truncate text-2xl font-semibold leading-tight text-white md:text-3xl">
            {displayTitle || lessonTitle}
          </p>
        </div>
      </div>

      {/* 탭 바 (에어클래스 느낌: 하단 라인 + active 밑줄) */}
      <div className="mt-4 border-b border-white/10">
        <div className="flex items-center gap-8 px-1">
          <button
            type="button"
            onClick={() => setTab("description")}
            className={`relative py-4 text-base ${
              tab === "description" ? "font-semibold text-white" : "text-white/70 hover:text-white"
            }`}
          >
            설명
            {tab === "description" ? <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-white" /> : null}
          </button>
          <button
            type="button"
            onClick={() => setTab("files")}
            className={`relative py-4 text-base ${
              tab === "files" ? "font-semibold text-white" : "text-white/70 hover:text-white"
            }`}
          >
            자료{allFiles.length ? `(${allFiles.length})` : ""}
            {tab === "files" ? <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-white" /> : null}
          </button>
          <button
            type="button"
            onClick={() => setTab("qa")}
            className={`relative py-4 text-base ${tab === "qa" ? "font-semibold text-white" : "text-white/70 hover:text-white"}`}
          >
            Q&amp;A
            {tab === "qa" ? <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-white" /> : null}
          </button>
        </div>
      </div>

      {tab === "description" ? (
        <div className="pt-6">
          <div className="px-1">
            <h2 className="text-base font-semibold text-white">강의 설명</h2>
            {lessonDescription?.trim().length ? (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/70">{lessonDescription}</p>
            ) : (
              <p className="mt-2 text-sm text-white/60">강의 설명이 아직 등록되지 않았습니다.</p>
            )}

            <h3 className="mt-6 text-base font-semibold text-white">학습 목표</h3>
            {lessonGoals.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
                {lessonGoals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-white/60">등록된 목표가 없습니다.</p>
            )}

            <h3 className="mt-6 text-base font-semibold text-white">목차</h3>
            {lessonOutline.length ? (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-white/70">
                {lessonOutline.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-white/60">등록된 목차가 없습니다.</p>
            )}
          </div>
        </div>
      ) : tab === "files" ? (
        <div className="pt-6">
          {allFiles.length === 0 ? (
            <p className="text-sm text-white/70">등록된 자료가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {allFiles.map((f) => (
                <li key={f.id}>
                  <a
                    href={withAllParamIfNeeded(`/api/attachments/${f.id}/download`, allowAll)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#343335] p-3 hover:bg-[#3e3d40] focus:outline-none focus:ring-2 focus:ring-white/10"
                  >
                    {isPdfFileName(f.originalName || f.title) ? (
                      <span
                        className="material-symbols-outlined shrink-0 text-[18px] leading-none text-[#ff6b6b]"
                        aria-hidden="true"
                      >
                        picture_as_pdf
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.title}</p>
                      <p className="text-xs text-white/70">
                        {f.scope} · {formatBytes(f.sizeBytes)}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <LessonQna lessonId={lessonId} isTeacher={isTeacher} currentUserEmail={currentUserEmail} />
      )}
    </div>
  );
}


