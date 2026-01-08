"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

export default function ScrollProgress() {
  // SSR/CSR 첫 렌더 결과를 강제로 동일하게 맞춰 hydration mismatch를 방지합니다.
  // (scroll 위치/이벤트 의존 UI는 마운트 후에만 노출)
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const handleScroll = () => {
      // 문서의 현재 스크롤 위치
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      // 문서 전체 스크롤 가능한 높이 (보이는 높이를 제외)
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      // 스크롤 진행 정도(%) 계산
      const scrolled = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgress(scrolled);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // 초기 값 설정

    return () => window.removeEventListener("scroll", handleScroll);
  }, [mounted]);

  // 진행바 컨테이너 클릭 시 해당 위치로 스크롤 이동
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    // 컨테이너의 크기와 위치 정보 가져오기
    const rect = containerRef.current.getBoundingClientRect();
    // 컨테이너 내 클릭한 x 좌표
    const clickX = e.clientX - rect.left;
    // 컨테이너의 총 너비
    const containerWidth = rect.width;
    // 클릭한 위치가 전체의 몇 퍼센트에 해당하는지 계산
    const clickPercentage = clickX / containerWidth;
    
    // 스크롤 가능한 전체 높이 계산
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    // 목표 스크롤 위치
    const targetScrollTop = scrollHeight * clickPercentage;
    
    // 부드럽게 스크롤 이동
    window.scrollTo({
      top: targetScrollTop,
      behavior: "smooth"
    });
  };

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="fixed top-0 left-0 w-full h-[5px] bg-transparent z-[9999] cursor-pointer"
      aria-hidden="true"
    >
      <div
        className="h-full bg-white transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
