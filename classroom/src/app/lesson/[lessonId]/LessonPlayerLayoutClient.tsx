"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function LessonPlayerLayoutClient({ left, right }: Props) {
  const leftRef = useRef<HTMLDivElement>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);

  // 페이지 로드 시 스크롤을 맨 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 비디오 플레이어 영역 높이 측정
  useEffect(() => {
    const measure = () => {
      if (leftRef.current) {
        // 비디오 플레이어만의 높이 (첫 번째 자식 = VimeoPlayer wrapper)
        const videoWrapper = leftRef.current.querySelector(".rounded-2xl.bg-black");
        if (videoWrapper) {
          const height = videoWrapper.getBoundingClientRect().height;
          setSidebarHeight(height);
        }
      }
    };

    // 초기 측정 + 리사이즈 시 재측정
    measure();
    const timer = setTimeout(measure, 500); // iframe 로드 후 재측정
    window.addEventListener("resize", measure);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div ref={leftRef} className="min-w-0">
        {left}
      </div>

      <div 
        className="xl:sticky xl:top-4"
        style={sidebarHeight ? { maxHeight: sidebarHeight } : undefined}
      >
        {right}
      </div>
    </div>
  );
}
