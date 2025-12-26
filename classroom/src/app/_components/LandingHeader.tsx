"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string | null;
  isAdmin?: boolean;
  profileImageUrl?: string | null;
};

type LandingHeaderProps = {
  showMobileMenu?: boolean;
  fullWidth?: boolean;
};

type SubMenuItem = {
  label: string;
  href: string;
  icon?: string;
  external?: boolean;
};

type MenuItem = {
  label: string;
  href: string;
  icon?: string;
  external?: boolean;
  subItems?: SubMenuItem[];
};

const menuItems: MenuItem[] = [
  {
    label: "나의 강의실",
    href: "/dashboard",
    icon: "school",
    subItems: [
      { label: "수강중인 강좌", href: "/dashboard", icon: "play_circle" },
      { label: "교재 다운로드", href: "/materials", icon: "menu_book" },
    ],
  },
  {
    label: "교재 및 강의 구매",
    href: "/store",
    subItems: [
      { label: "강좌 구매하기", href: "/store?type=강좌", icon: "video_library" },
      { label: "교재 구매하기", href: "/store?type=교재", icon: "auto_stories" },
    ],
  },
  {
    label: "유노바 선생님",
    href: "/teachers",
    subItems: [
      { label: "이상엽 선생님", href: "/teachers/lee-sangyeob", icon: "badge" },
      { label: "백하욱 선생님", href: "/teachers/baek-hawook", icon: "badge" },
      { label: "유예린 선생님", href: "/teachers/yoo-yerin", icon: "badge" },
      { label: "장진우 선생님", href: "/teachers/jang-jinwoo", icon: "badge" },
      { label: "Study Crack", href: "/teachers/study-crack", icon: "badge" },
    ],
  },
  {
    label: "공지사항",
    href: "/notices",
  },
];

// Optional hook for sidebar context (may not be available outside AppShell)
function useSidebarOptional() {
  try {
    // Dynamic import to avoid errors when context is not available
    const { useSidebar } = require("@/app/_components/SidebarContext");
    return useSidebar();
  } catch {
    return null;
  }
}

export default function LandingHeader({ showMobileMenu = false, fullWidth = false }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const sidebar = showMobileMenu ? useSidebarOptional() : null;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActiveHref = (href: string) => {
    const [path, qs] = href.split("?");
    if (!path) return false;

    const pathMatches = pathname === path || (path !== "/" && pathname?.startsWith(path + "/"));
    if (!pathMatches) return false;

    if (!qs) return true;

    const target = new URLSearchParams(qs);
    for (const [k, v] of target.entries()) {
      if ((searchParams.get(k) || "") !== v) return false;
    }
    return true;
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 초기 상태 확인

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 로그인 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.user) {
            setUser(data.user);
          }
        }
      } catch {
        // 로그인 안됨
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);


  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(23, 23, 23, 0.8)" : "#161616",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div className={fullWidth ? "px-4" : "mx-auto max-w-6xl px-4"}>
        <div className="flex items-center h-[70px]">
          {/* Mobile Menu Button - Only show in AppShell context */}
          {showMobileMenu && sidebar && (
            <button
              type="button"
              onClick={() => sidebar.setIsOpen(true)}
              aria-label="메뉴 열기"
              className="mr-3 rounded-lg p-2 hover:bg-white/10 lg:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/unova-logo.png"
              alt="UNOVA"
              width={120}
              height={24}
              priority
              className="h-5 w-auto"
            />
          </Link>

          {/* Center Navigation - 로고 옆에 배치 */}
          <div className="hidden lg:flex items-center gap-[2px] ml-6">
            {menuItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setActiveMenu(item.label)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <NavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  external={item.external}
                />
                
                {/* 서브메뉴 드롭다운 */}
                {item.subItems && activeMenu === item.label && (
                  <div 
                    className="absolute top-full left-0 pt-2"
                    style={{ minWidth: "168px" }}
                  >
                    <div className="bg-[#FFF] border border-black/10 rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_150ms_ease-out]">
                      {item.subItems.map((subItem, idx) => (
                        <Link
                          key={subItem.label}
                          href={subItem.href}
                          target={subItem.external ? "_blank" : undefined}
                          rel={subItem.external ? "noopener noreferrer" : undefined}
                          className={`flex items-center px-4 py-2.5 text-[14px] transition-colors ${
                            isActiveHref(subItem.href)
                              ? "bg-[rgba(94,91,92,0.2)] text-black"
                              : "text-black/80 hover:bg-[rgba(94,91,92,0.2)] hover:text-black"
                          } ${idx !== item.subItems!.length - 1 ? "border-b border-black/5" : ""}`}
                            >
                          <span>{subItem.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-[16px] ml-auto">
            {loading ? (
              // 로딩 중
              <div className="w-20 h-8" />
            ) : user ? (
              // 로그인 상태
              <>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:inline-flex items-center gap-1.5 text-[15px] text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "16px" }}
                    >
                      admin_panel_settings
                    </span>
                    관리자
                  </Link>
                )}
                {/* 사용자 프로필 드롭다운 */}
                <div className="relative group">
                  <button className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.06] transition-colors">
                    {/* 프로필 이미지 */}
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="프로필"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#242424] flex items-center justify-center">
                        <span className="text-[14px] font-semibold text-white">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* 이름과 이메일 - 데스크탑에서만 표시 */}
                    <div className="hidden sm:block text-left">
                      <p className="text-[14px] font-medium text-white leading-tight">
                        {user.name || "회원"}
                      </p>
                      <p className="text-[12px] text-white/50 leading-tight">
                        {user.email.length > 20 ? user.email.slice(0, 20) + "..." : user.email}
                      </p>
                    </div>
                    <span
                      className="material-symbols-outlined hidden sm:block text-white/50 group-hover:rotate-180 transition-transform duration-200"
                      style={{ fontSize: "18px" }}
                    >
                      expand_more
                    </span>
                  </button>
                  {/* 드롭다운 메뉴 */}
                  <div className="absolute right-0 top-full mt-2 w-44 bg-[#FFF] rounded-xl shadow-lg border border-black/[0.08] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1.5">
                    <Link
                      href="/orders"
                      className="flex items-center px-4 py-2.5 text-[14px] text-black/80 hover:bg-[rgba(94,91,92,0.2)] transition-colors"
                    >
                      구매내역
                    </Link>
                    <Link
                      href="/mypage"
                      className="flex items-center px-4 py-2.5 text-[14px] text-black/80 hover:bg-[rgba(94,91,92,0.2)] transition-colors"
                    >
                      마이페이지
                    </Link>
                    <div className="my-2 border-t border-black/[0.06]" />
                    <a
                      href="/api/auth/logout"
                      className="flex items-center px-4 py-2.5 text-[14px] text-rose-600 hover:bg-[rgba(94,91,92,0.2)] transition-colors"
                    >
                      로그아웃
                    </a>
                  </div>
                </div>
              </>
            ) : (
              // 비로그인 상태
              <>
            <Link
                  href="/signup"
                  className="hidden sm:inline-flex text-[16px] text-white hover:text-white/80 transition-colors"
            >
              회원가입
            </Link>
            <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-4 py-2 text-[15px] text-white transition-all hover:text-white/80"
            >
                  <span 
                    className="material-symbols-outlined"
                    style={{ 
                      fontSize: "16px",
                      fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20"
                    }}
                  >
                    login
                  </span>
                  <span className="font-bold">로그인</span>
            </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label, icon, external }: { href: string; label: string; icon?: string; external?: boolean }) {
  const isExternal = external || href.startsWith("http");
  return (
    <Link
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="flex items-center gap-1.5 px-[8px] py-2 text-[16px] text-white hover:text-white/80 transition-all whitespace-nowrap tracking-[0]"
    >
      {icon && (
        <span 
          className="material-symbols-outlined"
          style={{ 
            fontSize: "18px",
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20"
          }}
        >
          {icon}
        </span>
      )}
      {label}
    </Link>
  );
}
