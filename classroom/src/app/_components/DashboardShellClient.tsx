"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import DashboardCourseList from "@/app/_components/DashboardCourseList";
import DashboardCourseSidePanel from "@/app/_components/DashboardCourseSidePanel";

type Card = {
  enrollmentId: string;
  courseId: string;
  title: string;
  thumbnail: boolean;
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

export default function DashboardShellClient({
  cards,
  initialQuery,
}: {
  cards: Card[];
  initialQuery: string;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? initialQuery;
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string | null>(null);
  const open = Boolean(selectedCourseId);

  return (
    <div className="mt-6">
      <div className="min-w-0 flex-1">
        <DashboardCourseList
          cards={cards}
          query={query}
          selectedCourseId={selectedCourseId}
          onSelectCourse={(courseId) => {
            setSelectedCourseId(courseId);
            setSelectedCourseTitle(cards.find((c) => c.courseId === courseId)?.title ?? null);
          }}
        />
      </div>
      {/* Desktop: Notion-like side panel */}
      <DashboardCourseSidePanel
        open={open}
        courseId={selectedCourseId}
        courseTitle={selectedCourseTitle}
        onClose={() => setSelectedCourseId(null)}
      />
    </div>
  );
}
