"use client";

import { SidebarProvider } from "@/app/_components/SidebarContext";
import LandingHeader from "@/app/_components/LandingHeader";
import ClassroomDesktopHeader from "@/app/_components/ClassroomDesktopHeader";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
  sidebar: ReactNode;
  floatingButton: ReactNode;
};

export default function AppShellClient({ children, sidebar, floatingButton }: Props) {
  const pathname = usePathname();
  // 나의 강의실 전체 배경색: #161616
  const bgClass = "bg-[#161616]";
  // 관리자 페이지에서는 헤더 표시
  const isAdminPage = pathname?.startsWith("/admin");
  const showMobileHeader = !isAdminPage;

  // "나의 강의실" PC 전용 헤더: 대시보드 섹션에만 노출
  const isClassroomSection =
    pathname === "/dashboard" ||
    pathname?.startsWith("/dashboard/") ||
    pathname === "/materials" ||
    pathname?.startsWith("/materials/") ||
    pathname?.startsWith("/lesson/") ||
    pathname?.startsWith("/course/");

  const isLessonPage = pathname?.startsWith("/lesson/");
  
  return (
    <SidebarProvider>
      <div className={`min-h-screen ${bgClass} text-white flex flex-col`}>
        {/* 헤더 */}
        {isAdminPage ? (
          <LandingHeader />
        ) : (
          <>
            {/* 비관리자(AppShell) 페이지: 모바일에서만 헤더 표시(로고 중앙 + 메뉴 버튼) */}
            <div className="lg:hidden">
              <LandingHeader showMobileMenu fullWidth />
            </div>
            {/* 나의 강의실: PC 전용 헤더 */}
            {isClassroomSection ? <ClassroomDesktopHeader /> : null}
          </>
        )}
        
        {/* 메인 콘텐츠 영역 */}
        <div
          className={`flex flex-1 ${
            isAdminPage
              ? "pt-[70px]"
              : showMobileHeader
                ? isClassroomSection
                  ? "pt-[70px] lg:pt-[70px]"
                  : "pt-[70px] lg:pt-0"
                : ""
          }`}
        >
          {sidebar}
          <main
            className={`flex-1 pb-6 ${
              // 레슨 페이지: 좌측 패딩을 줄여(강의/아래 요소를 더 크게) 사이드바와 콘텐츠 사이 빈공간을 축소
              isLessonPage
                ? "pl-2 pr-2 pt-0 md:pl-4 md:pr-4 md:pt-2 lg:pt-2 md:pb-6"
                : "px-4 pt-4 md:px-8 md:py-6 lg:pt-6"
            }`}
          >
            {children}
          </main>
        </div>
        
        {floatingButton}
      </div>
    </SidebarProvider>
  );
}

