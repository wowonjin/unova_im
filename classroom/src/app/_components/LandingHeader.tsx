"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useSidebarOptional } from "@/app/_components/SidebarContext";
// SidebarProvider 밖에서도 렌더될 수 있어 optional hook 사용

type User = {
  id: string;
  email: string;
  name: string | null;
  isAdmin?: boolean;
  profileImageUrl?: string | null;
};

type TeacherAccount = {
  teacherId: string;
  teacherSlug: string;
  teacherName: string;
};

type ReviewReplyNotification = {
  id: string;
  productId: string | null;
  productTitle: string;
  teacherName: string;
  isSecret: boolean;
  repliedAtISO: string | null;
};

type LandingHeaderProps = {
  showMobileMenu?: boolean;
  fullWidth?: boolean;
  /** 관리자 등에서 헤더 컨테이너를 화면 양 끝까지 확장(좌/우 패딩 제거) */
  edgeToEdge?: boolean;
  backgroundColor?: string;
  topBackgroundColor?: string;
  scrolledBackgroundColor?: string;
  scrolledOpacity?: number; // 0~1 (prop 우선, 없으면 CSS 변수/기본값 사용)
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
  subItems?: SubMenuItem[];
};

type MenuItem = {
  label: string;
  href: string;
  icon?: string;
  external?: boolean;
  subItems?: SubMenuItem[];
};

export default function LandingHeader({
  showMobileMenu = false,
  fullWidth = false,
  edgeToEdge = false,
  backgroundColor = "#161616",
  topBackgroundColor,
  scrolledBackgroundColor,
  scrolledOpacity,
  variant = "dark",
  scrolledVariant,
  overlayOnDesktop = false,
}: LandingHeaderProps) {
  const router = useRouter();
  const didPrefetchRef = useRef(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [dynamicScrolledOpacity, setDynamicScrolledOpacity] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teacherAccount, setTeacherAccount] = useState<TeacherAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyNotifCount, setReplyNotifCount] = useState(0);
  const [replyNotifs, setReplyNotifs] = useState<ReviewReplyNotification[]>([]);
  const [replyNotifOpen, setReplyNotifOpen] = useState(false);
  const replyNotifRef = useRef<HTMLDivElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [desktopExpanded, setDesktopExpanded] = useState<Record<string, boolean>>({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({});
  const [mobileProfileExpanded, setMobileProfileExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const promoBannerHref = "/store?type=교재&exam=편입&subject=기출문제집";
  const promoBannerLeadText = "성공적인 2027 대학 편입.";
  const promoBannerCtaText = "학교별 기출 문제집 지금 구매하기";
  const sidebarContext = useSidebarOptional();
  const sidebar = showMobileMenu ? sidebarContext : null;
  const pathname = usePathname();
  const isTeacherConsole = pathname?.startsWith("/teacher");
  const isHome = pathname === "/";
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

  // Portal 렌더링을 위한 mounted 상태 (SSR 안전)
  useEffect(() => {
    setMounted(true);
  }, []);

  // `useSearchParams()`는 SSR/프리렌더 단계에서 CSR bail-out + Suspense 요구를 유발할 수 있어,
  // 헤더에서는 window.location.search 기반으로만 사용합니다(메뉴 활성화 표시용).
  useEffect(() => {
    const syncSearch = () => {
      try {
        const next = window.location.search || "";
        setRawSearch((prev) => (prev === next ? prev : next));
      } catch {
        setRawSearch((prev) => (prev === "" ? prev : ""));
      }
    };

    let scheduled = false;
    const enqueue = typeof queueMicrotask === "function" ? queueMicrotask : (cb: () => void) => Promise.resolve().then(cb);
    const scheduleSyncSearch = () => {
      if (scheduled) return;
      scheduled = true;
      // Next 내부 replaceState가 useInsertionEffect 타이밍에 호출될 수 있어
      // setState는 마이크로태스크로 미뤄 "useInsertionEffect must not schedule updates" 경고를 피합니다.
      enqueue(() => {
        scheduled = false;
        syncSearch();
      });
    };
    const handleLocationChange = () => scheduleSyncSearch();

    syncSearch();
    window.addEventListener("popstate", handleLocationChange);

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = (...args: Parameters<History["pushState"]>) => {
      const result = originalPushState(...args);
      scheduleSyncSearch();
      return result;
    };

    window.history.replaceState = (...args: Parameters<History["replaceState"]>) => {
      const result = originalReplaceState(...args);
      scheduleSyncSearch();
      return result;
    };

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const searchParams = useMemo(() => {
    const s = (rawSearch || "").trim();
    const qs = s.startsWith("?") ? s.slice(1) : s;
    return new URLSearchParams(qs);
  }, [rawSearch]);

  const isActiveHref = (href: string) => {
    // 레거시(/books, /lectures)로 진입한 경우에도 메뉴 활성화가 자연스럽게 보이도록 처리
    // (현재는 대부분 /store로 직접 이동하지만, 외부 링크/캐시 등으로 레거시가 남을 수 있음)
    if (pathname === "/books") {
      return href.startsWith("/store") && (new URLSearchParams(href.split("?")[1] || "").get("type") || "") === "교재";
    }
    if (pathname === "/lectures") {
      const t = new URLSearchParams(href.split("?")[1] || "").get("type") || "";
      return href.startsWith("/store") && (t === "강의" || t === "강좌");
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

  const isMenuItemActive = (item: MenuItem) => {
    if (pathname === "/store") {
      const currentType = (searchParams.get("type") || "").trim();
      if (item.label === "교재 구매하기") return currentType === "교재";
      if (item.label === "강의 구매하기") return currentType === "강의" || currentType === "강좌";
    }
    return isActiveHref(item.href);
  };

  // 메뉴 클릭 전에 스토어 페이지를 미리 받아와서 체감 로딩을 줄입니다.
  useEffect(() => {
    if (didPrefetchRef.current) return;
    didPrefetchRef.current = true;
    // NOTE: 메뉴 구조가 자주 바뀌어 불필요한 프리패치를 줄입니다.
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 초기 상태 확인

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 외부(페이지/컴포넌트)에서 CSS 변수로 헤더 투명도를 동적으로 제어할 수 있게 함
  // - 예: 스토어 상세에서 탭이 헤더 아래에 sticky로 붙을 때 탭 배경과 동일한 알파로 동기화
  useEffect(() => {
    const read = () => {
      try {
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue("--unova-header-scrolled-opacity")
          .trim();
        if (!raw) {
          setDynamicScrolledOpacity(null);
          return;
        }
        const v = Number.parseFloat(raw);
        if (!Number.isFinite(v)) {
          setDynamicScrolledOpacity(null);
          return;
        }
        setDynamicScrolledOpacity(Math.max(0, Math.min(1, v)));
      } catch {
        setDynamicScrolledOpacity(null);
      }
    };

    // 초기 1회
    read();

    // 변수 변경을 통지받으면 즉시 반영
    const on = () => read();
    window.addEventListener("unova:header-opacity", on);
    return () => window.removeEventListener("unova:header-opacity", on);
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
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/teachers/list", { cache: "force-cache" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error("FETCH_TEACHERS_FAILED");
        const list = Array.isArray(json.teachers) ? json.teachers : [];
        const items: SubMenuItem[] = list
          .filter((t: any) => typeof t?.slug === "string" && typeof t?.name === "string")
          .map((t: any) => ({
            label: `${String(t.name).trim()} 선생님`,
            href: `/teachers/${encodeURIComponent(String(t.slug).trim())}`,
          }));

        if (!cancelled) setTeacherSubItems(items);
      } catch {
        // 실패 시에도 메뉴는 깨지지 않게: 서브메뉴만 숨김(기본 /teachers 링크는 유지)
        if (!cancelled) setTeacherSubItems([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const baseMenuItems = useMemo<MenuItem[]>(
    () => [
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
        label: "교재 구매하기",
        href: "/store?type=교재&exam=수능",
        subItems: [
          { label: "수능 교재 구매하기", href: "/store?type=교재&exam=수능" },
          { label: "내신 교재 구매하기", href: "/store?type=교재&exam=내신" },
          { label: "편입 교재 구매하기", href: "/store?type=교재&exam=편입" },
        ],
      },
      {
        label: "강의 구매하기",
        href: "/store?type=강의",
        subItems: [
          { label: "고1 강의 구매하기", href: "/store?type=강의&grade=G1" },
          { label: "고2 강의 구매하기", href: "/store?type=강의&grade=G2" },
          { label: "고3 강의 구매하기", href: "/store?type=강의&grade=G3" },
        ],
      },
      {
        label: "유노바 선생님",
        href: "/teachers",
      },
      {
        label: "공지사항",
        href: "/notices",
      },
    ],
    []
  );

  const mergedMenuItems = useMemo(() => {
    // teacherSubItems가 null이면 아직 로드 전이므로 서브메뉴를 숨깁니다.
    const teachersSub = teacherSubItems && teacherSubItems.length ? teacherSubItems : undefined;
    return baseMenuItems.map((item) =>
      item.href === "/teachers" ? { ...item, subItems: teachersSub } : item
    );
  }, [teacherSubItems, baseMenuItems]);

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

  const effectiveScrolledOpacity = dynamicScrolledOpacity ?? scrolledOpacity ?? 0.72;

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

  // PC 드롭다운이 닫히면 2단계 펼침 상태 초기화
  useEffect(() => {
    if (!activeMenu) setDesktopExpanded({});
  }, [activeMenu]);

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
            setTeacherAccount(data.teacherAccount ?? null);
          }
        }
      } catch {
        // 로그인 안됨
        setTeacherAccount(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // 답글 알림(미확인) 확인
  useEffect(() => {
    if (!user) {
      setReplyNotifCount(0);
      setReplyNotifs([]);
      return;
    }
    let cancelled = false;
    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/notifications/review-replies", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.ok) {
          setReplyNotifCount(Number(data.unreadCount || 0));
          setReplyNotifs(Array.isArray(data.notifications) ? data.notifications : []);
        }
      } catch {
        // ignore
      }
    };
    fetchNotifs();
    // 가벼운 폴링(다른 서비스들처럼 주기적 갱신)
    const t = window.setInterval(fetchNotifs, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [user?.id]);

  // 알림 드롭다운: 바깥 클릭으로 닫기
  useEffect(() => {
    if (!replyNotifOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = replyNotifRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setReplyNotifOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [replyNotifOpen]);

  const markAllReplyNotifsRead = async () => {
    try {
      const res = await fetch("/api/notifications/review-replies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error("MARK_READ_FAILED");
      setReplyNotifCount(0);
      setReplyNotifs([]);
    } catch {
      // ignore
    }
  };

  const openReplyNotification = async (n: ReviewReplyNotification) => {
    try {
      await fetch("/api/notifications/review-replies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewIds: [n.id] }),
      });
    } catch {
      // ignore
    }
    setReplyNotifCount((c) => Math.max(0, c - 1));
    setReplyNotifs((prev) => prev.filter((x) => x.id !== n.id));
    setReplyNotifOpen(false);
    if (n.productId) router.push(`/store/${n.productId}`);
  };

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
  const toggleDesktopSubmenu = (label: string) => {
    setDesktopExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };


  const showPromoBanner = !isTeacherConsole;
  const eventBannerOffset = showPromoBanner ? "var(--unova-event-banner-h)" : "0px";

  return (
    <div className="unova-event-banner-vars" style={{ ["--unova-event-banner-offset" as any]: eventBannerOffset } as any}>
      {/* 상단 프로모션 배너 */}
      {showPromoBanner && (
        <div
          className="fixed left-0 right-0 top-0 z-[1001] h-[var(--unova-event-banner-h)] overflow-hidden"
          style={{
            background: "linear-gradient(90deg, #7aa7ff 0%, #b989ff 50%, #e297f1 100%)",
          }}
        >
          <div className="relative mx-auto flex h-full max-w-6xl items-center justify-center px-4">
            <Link
              href={promoBannerHref}
              className="group flex h-full w-full items-center justify-center"
            >
              <span className="flex items-center justify-center gap-1.5 text-center text-[12px] tracking-[0.01em] text-white sm:gap-2 sm:text-[15px]">
                <span className="font-normal">
                  {promoBannerLeadText}
                </span>
                <span className="font-semibold">
                  {promoBannerCtaText}
                </span>
              </span>
            </Link>
          </div>
        </div>
      )}

      <nav
        suppressHydrationWarning
        className="fixed left-0 right-0 z-[1000] transition-all duration-300 top-[var(--unova-event-banner-offset)]"
        style={{
          // 스크롤 시에는 살짝 반투명 + blur
          backgroundColor: scrolled
            ? toRgba(scrolledBackgroundColor ?? backgroundColor, effectiveScrolledOpacity)
            : overlayOnDesktop && isDesktop
              ? "transparent"
              : topBackgroundColor ?? backgroundColor,
          backdropFilter: scrolled ? "blur(12px)" : "none",
        }}
      >
      <div
        className={
          edgeToEdge
            ? "px-4 md:px-6"
            : fullWidth
              ? "px-4"
              : "mx-auto max-w-6xl px-4"
        }
      >
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
              style={{ width: "auto", ...(isLight ? { filter: "brightness(0)" } : {}) }}
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
              style={{ width: "auto", ...(isLight ? { filter: "brightness(0)" } : {}) }}
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
                  active={isMenuItemActive(item)}
                  variant={currentVariant}
                />
                
                {/* 서브메뉴 드롭다운 */}
                {item.subItems && activeMenu === item.label && (
                  <div 
                    className="absolute top-full left-0 pt-2 z-[1300]"
                    style={{ minWidth: "190px" }}
                  >
                    {/* 서브 메뉴 컨테이너: 원래처럼 흰 배경 */}
                    <div
                      className={`animate-[fadeIn_150ms_ease-out] rounded-xl p-2 shadow-lg max-h-[60vh] overflow-y-auto space-y-1 ${
                        isLight ? "border border-black/10 bg-white" : "border border-white/10 bg-[#1C1C1C]"
                      }`}
                    >
                      {item.subItems.map((subItem, idx) => {
                        const nestedKey = `${item.label}::${subItem.label}::${idx}`;
                        const hasNested = Boolean(subItem.subItems && subItem.subItems.length > 0);
                        const hasActiveNested = Boolean(
                          subItem.subItems?.some((nested) => isActiveHref(nested.href))
                        );
                        const subItemActive = isActiveHref(subItem.href) || hasActiveNested;

                        if (!hasNested) {
                          return (
                            <Link
                              key={nestedKey}
                              href={subItem.href}
                              target={subItem.external ? "_blank" : undefined}
                              rel={subItem.external ? "noopener noreferrer" : undefined}
                              className={`flex items-center rounded-lg px-3 py-2 text-[14px] whitespace-nowrap transition-colors ${
                                isLight
                                  ? subItemActive
                                    ? "bg-[rgba(94,91,92,0.2)] text-black"
                                    : "text-black/80 hover:bg-[rgba(94,91,92,0.2)]"
                                  : subItemActive
                                    ? "bg-white/[0.08] text-white"
                                    : "text-white/80 hover:bg-white/[0.06]"
                              }`}
                            >
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        }

                        const nestedOpen = Boolean(desktopExpanded[nestedKey]) || hasActiveNested;

                        return (
                          <div key={nestedKey} className="space-y-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleDesktopSubmenu(nestedKey);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[14px] whitespace-nowrap transition-colors ${
                                isLight
                                  ? subItemActive
                                    ? "bg-[rgba(94,91,92,0.2)] text-black"
                                    : "text-black/80 hover:bg-[rgba(94,91,92,0.2)]"
                                  : subItemActive
                                    ? "bg-white/[0.08] text-white"
                                    : "text-white/80 hover:bg-white/[0.06]"
                              }`}
                              aria-label={`${subItem.label} 서브메뉴 토글`}
                            >
                              <span>{subItem.label}</span>
                              <span
                                className="material-symbols-outlined transition-transform duration-200"
                                style={{
                                  fontSize: "18px",
                                  transform: nestedOpen ? "rotate(180deg)" : "rotate(0deg)",
                                }}
                                aria-hidden="true"
                              >
                                expand_more
                              </span>
                            </button>

                            {nestedOpen ? (
                              <div
                                className={`ml-2 space-y-1 pl-3 border-l ${
                                  isLight ? "border-black/10" : "border-white/10"
                                }`}
                              >
                                {subItem.subItems!.map((nestedItem, nestedIdx) => (
                                  <Link
                                    key={`${nestedKey}::nested::${nestedIdx}`}
                                    href={nestedItem.href}
                                    target={nestedItem.external ? "_blank" : undefined}
                                    rel={nestedItem.external ? "noopener noreferrer" : undefined}
                                    className={`flex items-center rounded-lg px-3 py-2 text-[13px] whitespace-nowrap transition-colors ${
                                      isLight
                                        ? isActiveHref(nestedItem.href)
                                          ? "bg-[rgba(94,91,92,0.2)] text-black"
                                          : "text-black/75 hover:bg-[rgba(94,91,92,0.2)]"
                                        : isActiveHref(nestedItem.href)
                                          ? "bg-white/[0.08] text-white"
                                          : "text-white/75 hover:bg-white/[0.06]"
                                    }`}
                                  >
                                    {nestedItem.label}
                                  </Link>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
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
                {teacherAccount ? (
                  <Link
                    href="/teacher"
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[14px] transition-colors ${
                      isActiveHref("/teacher")
                        ? isLight
                          ? "text-black bg-black/[0.06]"
                          : "text-white bg-white/[0.10]"
                        : isLight
                          ? "text-black/80 hover:bg-black/[0.06]"
                          : "text-white/80 hover:bg-white/[0.06]"
                    }`}
                    aria-label="선생님 콘솔"
                    title="선생님 콘솔"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "18px",
                        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                      }}
                      aria-hidden="true"
                    >
                      badge
                    </span>
                    <span className="hidden sm:inline">선생님 콘솔</span>
                  </Link>
                ) : null}

                {/* 답글 알림(선생님 답글) */}
                <div ref={replyNotifRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setReplyNotifOpen((v) => !v)}
                    className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl ${hoverSoftBgClass} transition-colors ${fgClass}`}
                    aria-label="알림"
                    title="알림"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }} aria-hidden="true">
                      notifications
                    </span>
                    {replyNotifCount > 0 ? (
                      <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                        {replyNotifCount > 99 ? "99+" : replyNotifCount}
                      </span>
                    ) : null}
                  </button>

                  {replyNotifOpen ? (
                    <div
                      className={`absolute right-0 top-full mt-2 w-[320px] rounded-2xl shadow-lg z-[1300] overflow-hidden ${
                        isLight ? "bg-white border border-black/[0.08]" : "bg-[#1C1C1C] border border-white/10"
                      }`}
                    >
                      <div className={`flex items-center justify-between px-4 py-3 ${isLight ? "border-b border-black/10" : "border-b border-white/10"}`}>
                        <p className={`text-[13px] font-semibold ${isLight ? "text-black" : "text-white"}`}>알림</p>
                        <button
                          type="button"
                          onClick={markAllReplyNotifsRead}
                          className={`text-[12px] ${isLight ? "text-black/60 hover:text-black/80" : "text-white/60 hover:text-white/80"}`}
                        >
                          모두 읽음
                        </button>
                      </div>

                      {replyNotifs.length === 0 ? (
                        <div className={`px-4 py-6 text-[13px] ${isLight ? "text-black/60" : "text-white/60"}`}>
                          새로운 알림이 없습니다.
                        </div>
                      ) : (
                        <div className="max-h-[360px] overflow-y-auto">
                          {replyNotifs.map((n) => {
                            const dateText = n.repliedAtISO ? n.repliedAtISO.slice(0, 10).replace(/-/g, ".") : "";
                            return (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => openReplyNotification(n)}
                                className={`w-full text-left px-4 py-3 transition-colors ${
                                  isLight ? "hover:bg-black/[0.04]" : "hover:bg-white/[0.06]"
                                }`}
                              >
                                <p className={`text-[13px] font-semibold ${isLight ? "text-black/90" : "text-white/90"}`}>
                                  {n.teacherName} 답글
                                  {n.isSecret ? <span className={`ml-2 text-[11px] ${isLight ? "text-black/50" : "text-white/50"}`}>비밀</span> : null}
                                </p>
                                <p className={`mt-0.5 text-[12px] ${isLight ? "text-black/60" : "text-white/60"} line-clamp-1`}>
                                  {n.productTitle}
                                </p>
                                {dateText ? (
                                  <p className={`mt-1 text-[11px] ${isLight ? "text-black/45" : "text-white/45"}`}>{dateText}</p>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

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
                  href="/login"
                  className={`flex items-center gap-1.5 pl-4 pr-2 py-2 text-[15px] ${fgClass} transition-all ${isLight ? "hover:text-black/80" : "hover:text-white/80"}`}
            >
                  <span 
                    className="material-symbols-outlined login-icon sm:!hidden"
                    style={{ 
                      fontSize: "18px",
                      fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20"
                    }}
                  >
                    login
                  </span>
                  <span className="hidden sm:inline">로그인</span>
            </Link>
            <Link
                  href="/signup"
                  className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[#FEE500] px-4 py-2 text-[14px] font-bold text-black transition-[filter,transform] hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center" aria-hidden="true">
                {/* 카카오 아이콘(검정) */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4.5c-4.42 0-8 2.74-8 6.12 0 2.2 1.55 4.12 3.94 5.18-.17.6-.62 2.18-.71 2.55-.11.45.16.44.33.33.13-.09 2.1-1.44 2.94-2.02.48.07.98.1 1.5.1 4.42 0 8-2.74 8-6.12S16.42 4.5 12 4.5Z"
                    fill="#000000"
                  />
                </svg>
              </span>
              1초 회원가입
            </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Landing pages) - Portal로 body에 렌더링 */}
      {mounted && !sidebar && mobileDrawerOpen && createPortal(
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
              <div className="flex items-center justify-between">
                <Link href="/" className="inline-flex items-center" onClick={closeMenu}>
                  <Image
                    src="/logoheader.png"
                    alt="UNOVA"
                    width={140}
                    height={24}
                    priority
                    className="h-5 sm:h-6 w-auto"
                    style={{ width: "auto", ...(isLight ? { filter: "brightness(0)" } : {}) }}
                  />
                </Link>
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="메뉴 닫기"
                  className={`-mr-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isLight
                      ? "text-black/70 hover:bg-black/[0.06] hover:text-black focus-visible:ring-black/40 ring-offset-white"
                      : "text-white/75 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/40 ring-offset-[#161616]"
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }} aria-hidden="true">
                    close
                  </span>
                </button>
              </div>

              {/* 모바일 사이드 메뉴: 좌우 여백 제거(컨테이너가 드로어 끝까지 붙도록) */}
              <nav className="mt-4 -mx-5 space-y-0.5 text-[13px]">
                {mergedMenuItems.map((item) => (
                  <div key={`mobile-${item.label}`} className="w-full">
                    <div
                      className={`flex w-full items-center justify-between px-5 py-1.5 transition-colors ${mobileNoHoverBgClass} ${
                        isMenuItemActive(item) ? `${fgClass} font-semibold` : fgSubtleClass
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
                            className="ml-2 rounded-md p-1"
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
                          <span className="ml-2 h-6 w-6" aria-hidden="true" />
                      )}
                    </div>

                    {item.subItems && mobileExpanded[item.label] ? (
                      <div className="px-5">
                        {/* 서브메뉴: 클릭 즉시 표시(애니메이션 제거) + 메인 메뉴와 동일한 줄간격 */}
                        <div className="mt-1 space-y-1 pl-3 pb-1">
                          {item.subItems.map((sub, idx) => {
                            const nestedKey = `${item.label}::${sub.label}::${idx}`;
                            const hasNested = Boolean(sub.subItems && sub.subItems.length > 0);
                            const hasActiveNested = Boolean(
                              sub.subItems?.some((nested) => isActiveHref(nested.href))
                            );
                            const subActive = isActiveHref(sub.href) || hasActiveNested;

                            if (!hasNested) {
                              return (
                                <Link
                                  key={`mobile-sub-${nestedKey}`}
                                  href={sub.href}
                                  target={sub.external ? "_blank" : undefined}
                                  rel={sub.external ? "noopener noreferrer" : undefined}
                                  onClick={closeMenu}
                                  className={`block w-full py-1.5 text-[13px] transition-colors ${
                                    subActive
                                      ? `${isLight ? "text-black font-semibold" : "text-white font-semibold"}`
                                      : `${isLight ? "text-black/70" : "text-white/70"}`
                                  } ${mobileNoHoverBgClass}`}
                                >
                                  {sub.label}
                                </Link>
                              );
                            }

                            return (
                              <div key={`mobile-sub-${nestedKey}`} className="w-full">
                                <button
                                  type="button"
                                  onClick={() => toggleMobileSubmenu(nestedKey)}
                                  className={`flex w-full items-center justify-between py-1.5 text-left text-[13px] transition-colors ${
                                    subActive
                                      ? `${isLight ? "text-black font-semibold" : "text-white font-semibold"}`
                                      : `${isLight ? "text-black/70" : "text-white/70"}`
                                  } ${mobileNoHoverBgClass}`}
                                  aria-label={`${sub.label} 서브메뉴 토글`}
                                >
                                  <span>{sub.label}</span>
                                  <span
                                    className={`material-symbols-outlined ${
                                      isLight ? "text-black/60" : "text-white/70"
                                    } transition-transform duration-200`}
                                    style={{
                                      fontSize: "16px",
                                      transform: mobileExpanded[nestedKey] ? "rotate(180deg)" : "rotate(0deg)",
                                    }}
                                    aria-hidden="true"
                                  >
                                    expand_more
                                  </span>
                                </button>

                                {mobileExpanded[nestedKey] ? (
                                  <div
                                    className={`mt-1 space-y-1 pl-3 pb-1 border-l ${
                                      isLight ? "border-black/10" : "border-white/10"
                                    }`}
                                  >
                                    {sub.subItems!.map((nested, nestedIdx) => (
                                      <Link
                                        key={`mobile-sub-${nestedKey}-nested-${nestedIdx}`}
                                        href={nested.href}
                                        target={nested.external ? "_blank" : undefined}
                                        rel={nested.external ? "noopener noreferrer" : undefined}
                                        onClick={closeMenu}
                                        className={`block w-full py-1.5 text-[13px] transition-colors ${
                                          isActiveHref(nested.href)
                                            ? `${isLight ? "text-black font-semibold" : "text-white font-semibold"}`
                                            : `${isLight ? "text-black/70" : "text-white/70"}`
                                        } ${mobileNoHoverBgClass}`}
                                      >
                                        {nested.label}
                                      </Link>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
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

              <div className={`mt-auto pt-4 ${user ? `border-t ${isLight ? "border-black/10" : "border-white/10"}` : ""}`}>
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
                            href="/teacher"
                            onClick={closeMenu}
                            className={`col-span-2 rounded-lg px-3 py-2 text-center text-sm transition-colors ${
                              isLight ? "text-black/80 hover:bg-[rgba(94,91,92,0.2)]" : "text-white/80 hover:bg-white/[0.06]"
                            }`}
                          >
                            선생님 콘솔
                          </Link>
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
                  <div className="flex items-end justify-center gap-2 text-[14px]">
                    {/* 회원가입 + 말풍선(회원가입 바로 위에 고정) */}
                    <div className="flex flex-col items-center">
                      <Link
                        href="/login"
                        onClick={closeMenu}
                        className="animate-[gentleBounce_2s_ease-in-out_infinite] group -mb-0.5"
                        aria-label="카카오로 1초 로그인"
                      >
                        <div className="relative whitespace-nowrap rounded-full bg-[#FEE500] px-3 py-1.5 text-[12px] font-bold leading-none text-[#3C1E1E] shadow-md transition-transform group-hover:scale-105">
                          <span className="inline-flex items-center gap-1.5">
                            {/* 카카오 아이콘(노란 버튼 안) */}
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                              className="h-4 w-4"
                            >
                              <path
                                d="M12 4.5c-4.42 0-8 2.74-8 6.12 0 2.2 1.55 4.12 3.94 5.18-.17.6-.62 2.18-.71 2.55-.11.45.16.44.33.33.13-.09 2.1-1.44 2.94-2.02.48.07.98.1 1.5.1 4.42 0 8-2.74 8-6.12S16.42 4.5 12 4.5Z"
                                fill="#3C1E1E"
                              />
                            </svg>
                            1초 만에 시작
                          </span>
                          {/* 말풍선 꼬리(삼각형): 회원가입 중앙을 향하도록 */}
                          <span
                            className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-[#FEE500]"
                            aria-hidden="true"
                          />
                        </div>
                      </Link>
                      <Link
                        href="/signup"
                        onClick={closeMenu}
                        className={`px-1 py-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                          isLight
                            ? "text-black/80 hover:text-black focus-visible:ring-black/40 ring-offset-white"
                            : "text-white/80 hover:text-white focus-visible:ring-white/40 ring-offset-[#161616]"
                        }`}
                      >
                        1초 회원가입
                      </Link>
                    </div>
                    <span className={`${isLight ? "text-black/25" : "text-white/25"}`} aria-hidden="true">
                      ·
                    </span>
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className={`px-1 py-1.5 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        isLight
                          ? "text-black hover:text-black/80 focus-visible:ring-black/40 ring-offset-white"
                          : "text-white hover:text-white/90 focus-visible:ring-white/40 ring-offset-[#161616]"
                      }`}
                    >
                      로그인
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </nav>
      {/* 배너 높이만큼 콘텐츠를 아래로 밀어줍니다. */}
      <div
        aria-hidden="true"
        className="h-[var(--unova-event-banner-offset)]"
      />
    </div>
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
