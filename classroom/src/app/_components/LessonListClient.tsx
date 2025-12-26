"use client";

import { useState, useRef } from "react";
import { Badge, Button } from "@/app/_components/ui";

interface Lesson {
  id: string;
  position: number;
  title: string;
  vimeoVideoId: string;
  isPublished: boolean;
  attachmentCount: number;
}

interface Props {
  courseId: string;
  initialLessons: Lesson[];
}

export default function LessonListClient({ courseId, initialLessons }: Props) {
  const [lessons, setLessons] = useState(initialLessons);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  // 이전 순서 저장 (에러 시 복원용)
  const prevLessonsRef = useRef<Lesson[]>(initialLessons);

  const handleDragStart = (e: React.DragEvent, lessonId: string) => {
    setDraggedId(lessonId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lessonId);
  };

  const handleDragOver = (e: React.DragEvent, lessonId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== lessonId) {
      setDragOverId(lessonId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = lessons.findIndex((l) => l.id === draggedId);
    const targetIndex = lessons.findIndex((l) => l.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    // 이전 상태 저장
    prevLessonsRef.current = lessons;

    // Reorder locally
    const newLessons = [...lessons];
    const [removed] = newLessons.splice(draggedIndex, 1);
    newLessons.splice(targetIndex, 0, removed);

    // Update positions
    const reorderedLessons = newLessons.map((l, idx) => ({
      ...l,
      position: idx + 1,
    }));

    setLessons(reorderedLessons);
    setDraggedId(null);
    setIsReordering(true);
    setSaveStatus("saving");

    // Save to server
    try {
      const res = await fetch("/api/admin/lessons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          lessonIds: reorderedLessons.map((l) => l.id),
        }),
      });

      if (!res.ok) {
        // Revert on error
        setLessons(prevLessonsRef.current);
        setSaveStatus("error");
      } else {
        setSaveStatus("saved");
        // 3초 후 상태 초기화
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setLessons(prevLessonsRef.current);
      setSaveStatus("error");
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDelete = async (lessonId: string) => {
    setDeletingId(lessonId);
    try {
      const res = await fetch("/api/admin/lessons/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });

      if (res.ok) {
        // 삭제 후 로컬 상태 업데이트 및 순서 재정렬
        setLessons((prev) => {
          const filtered = prev.filter((l) => l.id !== lessonId);
          return filtered.map((l, idx) => ({ ...l, position: idx + 1 }));
        });
      }
    } catch {
      // Ignore
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      {saveStatus !== "idle" && (
        <div className={`mb-3 text-sm ${
          saveStatus === "saving" ? "text-white/60" :
          saveStatus === "saved" ? "text-emerald-400" :
          "text-red-400"
        }`}>
          {saveStatus === "saving" && "순서 저장 중..."}
          {saveStatus === "saved" && "순서가 저장되었습니다."}
          {saveStatus === "error" && "순서 저장에 실패했습니다."}
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="text-left text-white/60">
          <tr className="border-b border-white/10">
            <th className="py-3 pr-3 w-10"></th>
            <th className="py-3 pr-3">순서</th>
            <th className="py-3 pr-3">제목</th>
            <th className="py-3 pr-3">상태</th>
            <th className="py-3 pr-3">자료</th>
            <th className="py-3 pr-3 text-right" aria-label="액션" />
          </tr>
        </thead>
        <tbody>
          {lessons.map((l) => (
            <tr
              key={l.id}
              draggable
              onDragStart={(e) => handleDragStart(e, l.id)}
              onDragOver={(e) => handleDragOver(e, l.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, l.id)}
              onDragEnd={handleDragEnd}
              className={`border-b border-white/10 transition-colors ${
                draggedId === l.id ? "opacity-50" : ""
              } ${dragOverId === l.id ? "bg-white/10" : ""} ${
                isReordering ? "pointer-events-none" : ""
              }`}
            >
              <td className="py-3 pr-3">
                <div className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/60">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                </div>
              </td>
              <td className="py-3 pr-3 whitespace-nowrap">
                <Badge>{l.position}강</Badge>
              </td>
              <td className="py-3 pr-3 min-w-[280px]">
                <div className="font-medium text-white">{l.title}</div>
                <div className="mt-1 text-xs text-white/50">
                  Vimeo: {l.vimeoVideoId}
                </div>
              </td>
              <td className="py-3 pr-3">
                <Badge tone={l.isPublished ? "neutral" : "muted"}>
                  {l.isPublished ? "공개" : "비공개"}
                </Badge>
              </td>
              <td className="py-3 pr-3 text-white/60">{l.attachmentCount}개</td>
              <td className="py-3 pr-3">
                <div className="flex justify-end gap-2">
                  <Button href={`/admin/lesson/${l.id}`} size="sm">
                    편집
                  </Button>
                  {confirmDeleteId === l.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(l.id)}
                        disabled={deletingId === l.id}
                        className="px-2 py-1 text-xs font-medium text-red-400 bg-red-500/20 rounded hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {deletingId === l.id ? "삭제 중..." : "확인"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-xs font-medium text-white/60 bg-white/10 rounded hover:bg-white/20"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(l.id)}
                      className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {lessons.length === 0 && (
        <p className="py-8 text-center text-sm text-white/50">
          등록된 강의가 없습니다.
        </p>
      )}
    </div>
  );
}

