"use client";

import { useEffect } from "react";
import { useSidebar } from "@/app/_components/SidebarContext";

type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function LessonPlayerLayoutClient({ left, right }: Props) {
  const { setIsOpen } = useSidebar();

  // 강의 페이지 진입 시 왼쪽 사이드바 닫기
  useEffect(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  return (
    <div className="mt-0 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">{left}</div>

      {/* 우측 패널은 스크롤 내내 자연스럽게 따라다니도록(viewport 기준) sticky + 고정 높이로 처리 */}
      <div className="lg:sticky lg:top-6 lg:self-start lg:h-[calc(100vh-3rem)]">
        {right}
      </div>
    </div>
  );
}
