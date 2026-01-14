"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

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
  backgroundColor?: string;
  topBackgroundColor?: string;
  scrolledBackgroundColor?: string;
  scrolledOpacity?: number; // 0~1
  variant?: "dark" | "light";
  scrolledVariant?: "dark" | "light";
  /** PC(>=1024px)에서 스크롤 전 헤더 배경을 투명하게 만들어 콘텐츠와 겹치게(오버레이) 보이도록 합니다. */
  overlayOnDesktop?: boolean;
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
    label: "책 구매",
    href: "/books",
  },
  {
    label: "강의 구매",
    href: "/lectures",
  },
  {
    label: "유노바 선생님",
    href: "/teachers",
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

export default function LandingHeader({
  showMobileMenu = false,
  fullWidth = false,
  backgroundColor = "#161616",
  topBackgroundColor,
  scrolledBackgroundColor,
  scrolledOpacity = 0.72,
  variant = "dark",
  scrolledVariant,
  overlayOnDesktop = false,
}: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({});
  const [mobileProfileExpanded, setMobileProfileExpanded] = useState(false);
  const sidebar = showMobileMenu ? useSidebarOptional() : null;
  const pathname = usePathname();
  const [rawSearch, setRawSearch] = useState<string>("");
  const [teacherSubItems, setTeacherSubItems] = useState<SubMenuItem[] | null>(null);
  const currentVariant = scrolled ? scrolledVariant ?? variant : variant;
  const isLight = currentVariant === "light";
  const fgClass = isLight ? "text-black" : "text-white";
  const fgMutedClass = isLight ? "text-black/60" : "text-white/50";
  const fgSubtleClass = isLight ? "text-black/80" : "text-white/90";
  const hoverBgClass = isLight ? "hover:bg-black/5" : "hover:bg-white/10";
  const hoverSoftBgClass = isLight ? "hover:bg-black/[0.06]" : "hover:bg-white/[0.06]";
  // 모바일 드로어에서 hover 배경색이 "붙어 보이는" 현상 방지
  const mobileNoHoverBgClass = "hover:bg-transparent";

  // `useSearchParams()`는 SSR/프리렌더 단계에서 CSR bail-out + Suspense 요구를 유발할 수 있어,
  // 헤더에서는 window.location.search 기반으로만 사용합니다(메뉴 활성화 표시용).
  useEffect(() => {
    try {
      setRawSearch(window.location.search || "");
    } catch {
      setRawSearch("");
    }
  }, [pathname]);

  const searchParams = useMemo(() => {
    const s = (rawSearch || "").trim();
    const qs = s.startsWith("?") ? s.slice(1) : s;
    return new URLSearchParams(qs);
  }, [rawSearch]);

  const isActiveHref = (href: string) => {
    // 책/강의는 현재 구현상 /books, /lectures가 /store?type=... 로 리다이렉트되므로
    // /store 페이지에서도 책/강의 메뉴가 활성화되도록 별도 처리
    if (href === "/books") {
      return pathname === "/books" || (pathname === "/store" && (searchParams.get("type") || "") === "교재");
    }
    if (href === "/lectures") {
      const t = searchParams.get("type") || "";
      return pathname === "/lectures" || (pathname === "/store" && (t === "강의" || t === "강좌"));
    }

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

  // PC 여부(헤더 오버레이 효과는 PC에서만)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // "유노바 선생님" 서브메뉴: DB(어드민 등록) 기반으로 동적 생성
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/teachers/list");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error("FETCH_FAILED");
        const list = Array.isArray(json.teachers) ? json.teachers : [];
        const items: SubMenuItem[] = list
          .filter((t: any) => t && typeof t.slug === "string" && typeof t.name === "string")
          .map((t: any) => ({
            label: `${t.name} 선생님`,
            href: `/teachers/${t.slug}`,
            icon: "badge",
          }));
        setTeacherSubItems(items.length ? items : []);
      } catch {
        // 실패 시 서브메뉴 숨김(하드코딩 노출 방지)
        setTeacherSubItems([]);
      }
    };
    run();
  }, []);

  const mergedMenuItems = useMemo(() => {
    // teacherSubItems가 null이면 아직 로드 전이므로 서브메뉴를 숨깁니다.
    const teachersSub = teacherSubItems && teacherSubItems.length ? teacherSubItems : undefined;
    return menuItems.map((item) => (item.href === "/teachers" ? { ...item, subItems: teachersSub } : item));
  }, [teacherSubItems]);

  const toRgba = (color: string, alpha: number) => {
    // 이미 rgba/hsla면 그대로 사용(중복 변환 방지)
    if (color.startsWith("rgba(") || color.startsWith("hsla(")) return color;
    const a = Math.max(0, Math.min(1, alpha));
    // #RGB / #RRGGBB 만 지원 (그 외는 그대로 반환)
    const hex = color.trim();
    const short = /^#([0-9a-fA-F]{3})$/;
    const full = /^#([0-9a-fA-F]{6})$/;
    const m3 = hex.match(short);
    const m6 = hex.match(full);
    if (m3) {
      const h = m3[1];
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    if (m6) {
      const h = m6[1];
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return color;
  };

  // 모바일 드로어: 라우트 변경 시 닫기
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // 모바일 드로어: ESC로 닫기
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileDrawerOpen]);

  // 모바일 드로어: 닫힐 때 서브메뉴 상태 초기화
  useEffect(() => {
    if (!mobileDrawerOpen) {
      setMobileExpanded({});
      setMobileProfileExpanded(false);
    }
  }, [mobileDrawerOpen]);

  // 모바일 드로어가 열려 있을 때: 페이지(body) 스크롤을 잠가서
  // 스크롤에 따른 헤더 반투명 전환(scrolled)이 "메뉴 위에서" 발생하는 현상을 방지합니다.
  useEffect(() => {
    if (sidebar) return; // AppShell(대시보드 등) 사이드바 사용 시에는 관여하지 않음
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;
    const cls = "unova-no-scroll";

    if (mobileDrawerOpen) {
      root.classList.add(cls);
      body.classList.add(cls);
    } else {
      root.classList.remove(cls);
      body.classList.remove(cls);
    }

    return () => {
      root.classList.remove(cls);
      body.classList.remove(cls);
    };
  }, [mobileDrawerOpen, sidebar]);

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

  const openMenu = () => {
    // AppShell 컨텍스트가 있으면(대시보드 등) 기존 사이드바를 열고,
    // 그 외 페이지에서는 LandingHeader 자체 모바일 드로어를 사용합니다.
    if (sidebar) sidebar.setIsOpen(true);
    else setMobileDrawerOpen(true);
  };

  const closeMenu = () => setMobileDrawerOpen(false);

  const toggleMobileSubmenu = (label: string) => {
    setMobileExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };


  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[1000] transition-colors duration-300"
      style={{
        // 스크롤 시에는 살짝 반투명 + blur
        backgroundColor: scrolled
          ? toRgba(scrolledBackgroundColor ?? backgroundColor, scrolledOpacity)
          : overlayOnDesktop && isDesktop
            ? "transparent"
            : topBackgroundColor ?? backgroundColor,
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div className={fullWidth ? "px-4" : "mx-auto max-w-6xl px-4"}>
        <div className="relative flex items-center h-[50px] lg:h-[70px]">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={openMenu}
            aria-label="메뉴 열기"
            className={`mr-3 rounded-lg p-2 ${hoverBgClass} lg:hidden ${fgClass}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Logo (Desktop) */}
          <Link href="/" className="hidden lg:flex items-center gap-2 shrink-0">
            <Image
              src="/logoheader.png"
              alt="UNOVA"
              width={120}
              height={24}
              priority
              className="h-6 w-auto"
              style={isLight ? { filter: "brightness(0)" } : undefined}
            />
          </Link>

          {/* Logo (Mobile - Center) */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 lg:hidden"
            aria-label="홈으로"
          >
            <Image
              src="/logoheader.png"
              alt="UNOVA"
              width={120}
              height={24}
              priority
              className="h-5 sm:h-6 w-auto"
              style={isLight ? { filter: "brightness(0)" } : undefined}
            />
          </Link>

          {/* Center Navigation - 로고 옆에 배치 */}
          <div className="hidden lg:flex items-center gap-[2px] ml-4">
            {mergedMenuItems.map((item) => (
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
                  active={isActiveHref(item.href)}
                  variant={currentVariant}
                />
                
                {/* 서브메뉴 드롭다운 */}
                {item.subItems && activeMenu === item.label && (
                  <div 
                    className="absolute top-full left-0 pt-2 z-[1300]"
                    style={{ minWidth: "168px" }}
                  >
                    {/* 서브 메뉴 컨테이너: 원래처럼 흰 배경 */}
                    <div
                      className={`animate-[fadeIn_150ms_ease-out] rounded-xl p-2 shadow-lg ${
                        isLight ? "border border-black/10 bg-white" : "border border-white/10 bg-[#1C1C1C]"
                      }`}
                    >
                      {item.subItems.map((subItem, idx) => (
                        <Link
                          key={subItem.label}
                          href={subItem.href}
                          target={subItem.external ? "_blank" : undefined}
                          rel={subItem.external ? "noopener noreferrer" : undefined}
                          className={`flex items-center rounded-lg px-3 py-2 text-[14px] transition-colors ${
                            isLight
                              ? isActiveHref(subItem.href)
                                ? "bg-[rgba(94,91,92,0.2)] text-black"
                                : "text-black/80 hover:bg-[rgba(94,91,92,0.2)]"
                              : isActiveHref(subItem.href)
                                ? "bg-white/[0.08] text-white"
                                : "text-white/80 hover:bg-white/[0.06]"
                          }`}
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
                  <button className={`flex items-center gap-3 py-2 px-3 rounded-xl ${hoverSoftBgClass} transition-colors ${fgClass}`}>
                    {/* 프로필 이미지 */}
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="프로필"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full ${isLight ? "bg-black/10" : "bg-[#242424]"} flex items-center justify-center`}>
                        <span className={`text-[14px] font-semibold ${fgClass}`}>
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* 이름과 이메일 - 데스크탑에서만 표시 */}
                    <div className="hidden sm:block text-left">
                      <p className={`text-[14px] font-medium ${fgClass} leading-tight`}>
                        {user.name || "회원"}
                      </p>
                      <p className={`text-[12px] ${fgMutedClass} leading-tight`}>
                        {user.email.length > 20 ? user.email.slice(0, 20) + "..." : user.email}
                      </p>
                    </div>
                    <span
                      className={`material-symbols-outlined hidden sm:block ${fgMutedClass} group-hover:rotate-180 transition-transform duration-200`}
                      style={{ fontSize: "18px" }}
                    >
                      expand_more
                    </span>
                  </button>
                  {/* 드롭다운 메뉴 */}
                  <div
                    className={`absolute right-0 top-full mt-2 w-44 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[1300] py-1.5 ${
                      isLight ? "bg-white border border-black/[0.08]" : "bg-[#1C1C1C] border border-white/10"
                    }`}
                  >
                    <Link
                      href="/mypage/orders"
                      className={`flex items-center px-4 py-2.5 text-[14px] transition-colors ${
                        isLight ? "text-black/80 hover:bg-[rgba(94,91,92,0.2)]" : "text-white/80 hover:bg-white/[0.06]"
                      }`}
                    >
                      주문내역
                    </Link>
                    <Link
                      href="/mypage/edit"
                      className={`flex items-center px-4 py-2.5 text-[14px] transition-colors ${
                        isLight ? "text-black/80 hover:bg-[rgba(94,91,92,0.2)]" : "text-white/80 hover:bg-white/[0.06]"
                      }`}
                    >
                      정보 수정
                    </Link>
                    <div className={`my-2 border-t ${isLight ? "border-black/[0.06]" : "border-white/10"}`} />
                    <a
                      href="/api/auth/logout"
                      className={`flex items-center px-4 py-2.5 text-[14px] transition-colors ${
                        isLight ? "text-rose-600 hover:bg-[rgba(94,91,92,0.2)]" : "text-rose-300 hover:bg-white/[0.06]"
                      }`}
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
                  className={`hidden sm:inline-flex text-[16px] ${fgClass} ${isLight ? "hover:text-black/80" : "hover:text-white/80"} transition-colors`}
            >
              회원가입
            </Link>
            <Link
                  href="/login"
                  className={`flex items-center gap-1.5 px-4 py-2 text-[15px] ${fgClass} transition-all ${isLight ? "hover:text-black/80" : "hover:text-white/80"}`}
            >
                  <span 
                    className="material-symbols-outlined login-icon"
                    style={{ 
                      fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20"
                    }}
                  >
                    login
                  </span>
                  <span className="hidden sm:inline">로그인</span>
            </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Landing pages) */}
      {!sidebar && mobileDrawerOpen ? (
        <>
          <div
            className="fixed inset-0 z-[1100] bg-black/60 lg:hidden animate-[fadeIn_180ms_ease-out]"
            onClick={closeMenu}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 left-0 z-[1200] w-72 p-5 lg:hidden animate-[drawerIn_180ms_ease-out] overflow-y-auto overscroll-contain"
            style={{ backgroundColor }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center">
                <Link href="/" className="inline-flex items-center" onClick={closeMenu}>
                  <Image
                    src="/logoheader.png"
                    alt="UNOVA"
                    width={140}
                    height={24}
                    priority
                    className="h-5 sm:h-6 w-auto"
                    style={isLight ? { filter: "brightness(0)" } : undefined}
                  />
                </Link>
              </div>

              {/* 모바일 사이드 메뉴: 좌우 여백 제거(컨테이너가 드로어 끝까지 붙도록) */}
              <nav className="mt-6 -mx-5 space-y-1 text-sm">
                {mergedMenuItems.map((item) => (
                  <div key={`mobile-${item.label}`} className="w-full">
                    <div
                      className={`flex w-full items-center justify-between px-5 py-2 transition-colors ${mobileNoHoverBgClass} ${
                        isActiveHref(item.href) ? `${fgClass} font-semibold` : fgSubtleClass
                      }`}
                    >
                      <Link
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        onClick={closeMenu}
                        className="flex-1 font-medium"
                      >
                        {item.label}
                      </Link>
                      {item.subItems ? (
                        <button
                          type="button"
                          aria-label={`${item.label} 서브메뉴 토글`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleMobileSubmenu(item.label);
                          }}
                          className="ml-2 rounded-md p-1.5"
                        >
                          <span
                            className={`material-symbols-outlined ${isLight ? "text-black/60" : "text-white/70"} transition-transform duration-200`}
                            style={{
                              fontSize: "18px",
                              transform: mobileExpanded[item.label] ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                            aria-hidden="true"
                          >
                            expand_more
                          </span>
                        </button>
                      ) : (
                        // 서브메뉴가 없는 항목도 우측 영역 폭을 맞춰 높이/간격이 들쭉날쭉해 보이지 않게 함
                        <span className="ml-2 h-8 w-8" aria-hidden="true" />
                      )}
                    </div>

                    {item.subItems ? (
                      <div
                        className={`overflow-hidden px-5 transition-[max-height,opacity] duration-200 ease-out ${
                          mobileExpanded[item.label] ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        {/* 서브메뉴 컨테이너(테두리/배경 박스) 제거: 링크들만 바로 노출 */}
                        <div className="mt-1 space-y-0.5 pl-3 pb-0.5">
                          {item.subItems.map((sub) => (
                            <Link
                              key={`mobile-sub-${sub.label}`}
                              href={sub.href}
                              target={sub.external ? "_blank" : undefined}
                              rel={sub.external ? "noopener noreferrer" : undefined}
                              onClick={closeMenu}
                              className={`block w-full py-1.5 text-[13px] transition-colors ${
                                isActiveHref(sub.href)
                                  ? `${isLight ? "text-black font-semibold" : "text-white font-semibold"}`
                                  : `${isLight ? "text-black/70" : "text-white/70"}`
                              } ${mobileNoHoverBgClass}`}
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}

                {/* 관리자 */}
                {user?.isAdmin ? (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className={`mt-2 flex w-full items-center px-5 py-2 text-[14px] transition-colors ${mobileNoHoverBgClass} ${
                      isActiveHref("/admin") ? "text-amber-300 font-semibold" : "text-amber-400"
                    }`}
                  >
                    관리자
                  </Link>
                ) : null}
              </nav>

              <div className={`mt-auto pt-6 ${user ? `border-t ${isLight ? "border-black/10" : "border-white/10"}` : ""}`}>
                {loading ? (
                  <div className="h-10" />
                ) : user ? (
                  <div className="space-y-2">
                    {/* 프로필 클릭 -> 위에 메뉴(주문내역/정보 수정/로그아웃) 토글 */}
                    <div
                      className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${
                        mobileProfileExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div
                        className={`mb-2 rounded-xl p-2 shadow-lg ${
                          isLight ? "border border-black/10 bg-white" : "border border-white/10 bg-[#1C1C1C]"
                        }`}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href="/mypage/orders"
                            onClick={closeMenu}
                            className={`rounded-lg px-3 py-2 text-center text-sm transition-colors ${
                              isLight ? "text-black/80 hover:bg-[rgba(94,91,92,0.2)]" : "text-white/80 hover:bg-white/[0.06]"
                            }`}
                          >
                            주문내역
                          </Link>
                          <Link
                            href="/mypage/edit"
                            onClick={closeMenu}
                            className={`rounded-lg px-3 py-2 text-center text-sm transition-colors ${
                              isLight ? "text-black/80 hover:bg-[rgba(94,91,92,0.2)]" : "text-white/80 hover:bg-white/[0.06]"
                            }`}
                          >
                            정보 수정
                          </Link>
                          <a
                            href="/api/auth/logout"
                            className={`col-span-2 rounded-lg px-3 py-2 text-center text-sm transition-colors ${
                              isLight ? "text-rose-600 hover:bg-[rgba(94,91,92,0.2)]" : "text-rose-300 hover:bg-white/[0.06]"
                            }`}
                          >
                            로그아웃
                          </a>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMobileProfileExpanded((v) => !v)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left"
                      aria-label="프로필 메뉴 토글"
                    >
                      {user.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.profileImageUrl} alt="프로필" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                            isLight ? "bg-black/10 text-black" : "bg-white/10 text-white"
                          }`}
                        >
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${fgClass} truncate`}>{user.name || "회원"}</p>
                        <p className={`text-xs ${fgMutedClass} truncate`}>{user.email}</p>
                      </div>
                      <span
                        className={`material-symbols-outlined ${fgMutedClass} transition-transform duration-200`}
                        style={{
                          fontSize: "20px",
                          transform: mobileProfileExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                        aria-hidden="true"
                      >
                        expand_more
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/signup"
                      onClick={closeMenu}
                      className={`rounded-xl px-3 py-2.5 text-center text-[14px] font-semibold transition-colors border ${
                        isLight
                          ? "text-black/80 border-black/15 bg-black/[0.04] hover:bg-black/[0.07]"
                          : "text-white/85 border-white/15 bg-white/[0.06] hover:bg-white/[0.10]"
                      }`}
                    >
                      회원가입
                    </Link>
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className={`rounded-xl px-3 py-2.5 text-center text-[14px] font-bold transition-all shadow-sm ${
                        isLight
                          ? "bg-black text-white hover:bg-black/90"
                          : "bg-white text-black hover:bg-white/90"
                      }`}
                    >
                      로그인
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon,
  external,
  active,
  variant = "dark",
}: {
  href: string;
  label: string;
  icon?: string;
  external?: boolean;
  active?: boolean;
  variant?: "dark" | "light";
}) {
  const isExternal = external || href.startsWith("http");
  const isLight = variant === "light";
  const fgClass = isLight ? "text-black" : "text-white";
  const hoverFgClass = isLight ? "hover:text-black/70" : "hover:text-white/80";
  const decoClass = isLight ? "decoration-black/60" : "decoration-white/70";
  return (
    <Link
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={`flex items-center gap-1.5 px-[8px] py-2 text-[16px] ${fgClass} ${hoverFgClass} transition-all whitespace-nowrap tracking-[0] ${
        active ? `underline underline-offset-[10px] decoration-2 ${decoClass}` : ""
      }`}
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
