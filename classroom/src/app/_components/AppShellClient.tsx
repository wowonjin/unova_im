"use client";

import { SidebarProvider } from "@/app/_components/SidebarContext";
import LandingHeader from "@/app/_components/LandingHeader";
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
  
  return (
    <SidebarProvider>
      <div className={`min-h-screen ${bgClass} text-white flex flex-col`}>
        {/* 관리자 페이지에서만 헤더 표시 */}
        {isAdminPage && <LandingHeader />}
        
        {/* 메인 콘텐츠 영역 */}
        <div className={`flex flex-1 ${isAdminPage ? "pt-[70px]" : ""}`}>
          {sidebar}
          <main className="flex-1 px-4 pb-6 pt-6 md:px-8 md:py-6">{children}</main>
        </div>
        
        {floatingButton}
      </div>
    </SidebarProvider>
  );
}

