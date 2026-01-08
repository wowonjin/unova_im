"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardCourseList from "@/app/_components/DashboardCourseList";
import DashboardCourseSidePanel from "@/app/_components/DashboardCourseSidePanel";
import { useClassroomSearch } from "@/app/_components/ClassroomSearchContext";

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
  textbookItems,
  lessonItems,
}: {
  cards: Card[];
  initialQuery: string;
  textbookItems?: { id: string; type: "textbook"; title: string; href: string; subtitle?: string | null }[];
  lessonItems?: { id: string; type: "lesson"; title: string; href: string; subtitle?: string | null }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setItemsForKey, clearKey } = useClassroomSearch();
  // 메인 영역(강좌 카드)은 검색으로 필터링하지 않음. (드롭다운만 사용)
  const query = "";
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string | null>(null);
  const open = Boolean(selectedCourseId);

  // deps 길이가 렌더마다 바뀌어 warning이 뜨지 않도록, 배열 의존성을 문자열 키로 축약
  const searchDepsKey = [
    cards.map((c) => c.courseId).join("|"),
    Array.isArray(textbookItems) ? textbookItems.map((t) => t.id).join("|") : "",
    Array.isArray(lessonItems) ? lessonItems.map((l) => l.id).join("|") : "",
  ].join("::");

  // 대시보드 강좌 목록을 헤더 검색 대상으로 등록
  useEffect(() => {
    const items = cards.map((c) => ({
      id: c.courseId,
      type: "course" as const,
      title: c.title,
      href: `/dashboard?course=${encodeURIComponent(c.courseId)}`,
      subtitle: "수강중인 강좌",
    }));
    setItemsForKey("dashboardCourses", items);
    setItemsForKey("dashboardTextbooks", Array.isArray(textbookItems) ? textbookItems : []);
    setItemsForKey("dashboardLessons", Array.isArray(lessonItems) ? lessonItems : []);
    return () => {
      clearKey("dashboardCourses");
      clearKey("dashboardTextbooks");
      clearKey("dashboardLessons");
    };
  }, [searchDepsKey, setItemsForKey, clearKey]);

  // 검색 결과 클릭(/dashboard?course=...) 시 우측 커리큘럼 패널이 열리도록 처리
  useEffect(() => {
    const cid = searchParams.get("course");
    if (!cid) return;
    if (selectedCourseId === cid) return;
    setSelectedCourseId(cid);
    setSelectedCourseTitle(cards.find((c) => c.courseId === cid)?.title ?? null);
  }, [searchParams, cards, selectedCourseId]);

  return (
    <div className="mt-2">
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
        onClose={() => {
          setSelectedCourseId(null);
          setSelectedCourseTitle(null);
          // URL에서 course 파라미터 제거(검색 결과 클릭으로 열린 상태 정리)
          const sp = new URLSearchParams(searchParams.toString());
          if (sp.has("course")) {
            sp.delete("course");
            const qs = sp.toString();
            router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
          }
        }}
      />
    </div>
  );
}
