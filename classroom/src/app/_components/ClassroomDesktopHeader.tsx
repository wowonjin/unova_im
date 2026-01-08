"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { useSidebar } from "@/app/_components/SidebarContext";

type User = {
  id: string;
  email: string;
  name: string | null;
  isAdmin?: boolean;
  profileImageUrl?: string | null;
};

export default function ClassroomDesktopHeader() {
  const { isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed } = useSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data?.ok && data?.user) setUser(data.user as User);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed left-0 right-0 top-0 z-[1000] hidden h-[70px] lg:block transition-colors duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(22, 22, 22, 0.72)" : "#161616",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      {/* AppShellClient 메인 영역과 동일한 좌우 패딩 기준으로 정렬(강의 목차 패널 우측 끝과 선상 맞춤) */}
      <div className="flex h-full items-center px-4 md:px-8">
        {/* Left: menu + logo + name */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            aria-label="메뉴"
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-transparent text-white/80 transition-opacity hover:opacity-80"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "22px", fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              menu
            </span>
          </button>

          <Link href="/" className="flex items-center gap-2">
            <Image src="/logoheader.png" alt={siteConfig.name} width={120} height={24} priority className="h-6 w-auto" />
          </Link>
        </div>

        {/* Right: member buttons */}
        <div className="ml-auto flex items-center gap-3">
          {loading ? (
            <div className="h-10 w-40" />
          ) : user ? (
            <>
              {/* 관리자 버튼: 우측 끝을 강의 목차 패널 우측 끝과 같은 선상으로 */}
              {user.isAdmin ? (
                <Link
                  href="/admin"
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-transparent px-2 text-[15px] text-amber-300 transition-opacity hover:opacity-80"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    admin_panel_settings
                  </span>
                  관리자
                </Link>
              ) : null}

              <div className="relative group">
                <button className="flex items-center gap-3 rounded-xl px-3 py-2 text-white/90 transition-colors hover:bg-white/[0.06]">
                  {user.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.profileImageUrl} alt="프로필" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden text-left sm:block">
                    <p className="text-[14px] font-medium leading-tight text-white/90">{user.name || "회원"}</p>
                    <p className="text-[12px] leading-tight text-white/50">
                      {user.email.length > 22 ? user.email.slice(0, 22) + "..." : user.email}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-white/40 transition-transform duration-200 group-hover:rotate-180">
                    expand_more
                  </span>
                </button>

                <div className="invisible absolute right-0 top-full z-[1300] mt-2 w-44 rounded-xl border border-white/10 bg-[#1C1C1C] py-1.5 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <Link href="/orders" className="flex items-center px-4 py-2.5 text-[14px] text-white/80 hover:bg-white/[0.06]">
                    구매내역
                  </Link>
                  <Link href="/mypage" className="flex items-center px-4 py-2.5 text-[14px] text-white/80 hover:bg-white/[0.06]">
                    마이페이지
                  </Link>
                  <div className="my-2 border-t border-white/10" />
                  <a href="/api/auth/logout" className="flex items-center px-4 py-2.5 text-[14px] text-rose-300 hover:bg-white/[0.06]">
                    로그아웃
                  </a>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="hidden rounded-xl px-3 py-2 text-[15px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white sm:inline-flex"
              >
                회원가입
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-transparent px-2 text-[15px] text-white/80 transition-opacity hover:opacity-80"
              >
                <span className="material-symbols-outlined login-icon">login</span>
                <span className="hidden sm:inline">로그인</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}


