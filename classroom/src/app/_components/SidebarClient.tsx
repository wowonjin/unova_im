"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { warmupThumb } from "./pdfThumbWarmup";
import { useSidebar } from "./SidebarContext";
import { readRecentWatched } from "@/lib/recent-watch";
import { onProgressUpdated } from "@/lib/progress-events";

type Props = {
  email: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  showAllCourses?: boolean;
  enrolledCourses: {
    courseId: string;
    title: string;
    lastLessonId: string | null;
    lastLessonTitle: string | null;
    lastWatchedAtISO: string | null;
    lastSeconds: number | null;
    percent: number;
  }[];
};

function initials(nameOrEmail: string) {
  const s = nameOrEmail.trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? s[0];
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function ProgressRing({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const deg = p * 3.6;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(rgba(255,255,255,0.92) ${deg}deg, rgba(255,255,255,0.18) 0deg)`,
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-[#161616]">
        <span className="text-[11px] font-semibold text-white">{p}%</span>
      </div>
    </div>
  );
}

function NavItem({ href, label, icon }: { href: string; label: string; icon?: string }) {
  const pathname = usePathname();
  const activeBase = pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));
  // "수강중인 강좌"는 대시보드뿐 아니라 강좌/강의(lesson) 상세로 들어가도 계속 활성화로 보이게 처리
  const active =
    activeBase ||
    (href === "/dashboard" && (pathname?.startsWith("/course/") || pathname?.startsWith("/lesson/")));
  const cls = active
    ? "flex items-center gap-2 rounded-lg px-3 py-2 bg-white/10 text-white"
    : "flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10 text-white/90";
  return (
    <Link className={cls} href={href}>
      {icon ? (
        <span
          className="material-symbols-outlined shrink-0 leading-none text-white/70"
          style={{
            fontSize: "14px",
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 30",
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function SidebarClient({ email, userId, displayName, avatarUrl, isAdmin, isLoggedIn, showAllCourses, enrolledCourses }: Props) {
  const pathname = usePathname();
  const isAdminArea = pathname?.startsWith("/admin");
  const { isOpen, setIsOpen, isDesktopSidebarCollapsed } = useSidebar();
  const [showLogout, setShowLogout] = useState(false);
  const [recentFallback, setRecentFallback] = useState<Props["enrolledCourses"]>([]);
  const [liveCourses, setLiveCourses] = useState<Props["enrolledCourses"]>(enrolledCourses);
  const [recentLocal, setRecentLocal] = useState<Props["enrolledCourses"]>([]);
  const [recentProgressByLessonId, setRecentProgressByLessonId] = useState<Map<string, number>>(new Map());
  const isClassroomSection =
    pathname === "/dashboard" ||
    pathname?.startsWith("/dashboard/") ||
    pathname === "/materials" ||
    pathname?.startsWith("/materials/") ||
    pathname?.startsWith("/lesson/") ||
    pathname?.startsWith("/course/");

  useEffect(() => {
    // 서버에서 내려온 초기값/갱신값과 동기화
    setLiveCourses(enrolledCourses);
  }, [enrolledCourses]);

  const userStorageKey = useMemo(() => {
    const userKeyFromEmail = (typeof (email ?? "") === "string" && email) ? email : "";
    const key = (typeof (userId ?? "") === "string" && userId) ? userId : userKeyFromEmail;
    return key || "";
  }, [email, userId]);

  // localStorage 기반 최근 수강(강의 단위 누적) 로드
  useEffect(() => {
    if (!isLoggedIn) return;
    if (showAllCourses) return;
    if (!userStorageKey) return;
    const items = readRecentWatched(userStorageKey, 6).map((it) => ({
      courseId: it.courseId,
      title: it.courseTitle,
      lastLessonId: it.lessonId,
      lastLessonTitle: it.lessonTitle,
      lastWatchedAtISO: it.watchedAtISO,
      lastSeconds: null,
      percent: 0,
    }));
    setRecentLocal(items);
  }, [isLoggedIn, showAllCourses, userStorageKey, pathname]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (showAllCourses) return; // 테스트 모드에서는 "최근" 개념이 아니라 목록 노출이 목적

    // 오른쪽 커리큘럼과 동일하게 progress 이벤트를 구독해서
    // 1) 최근 수강 목록을 즉시 갱신하고
    // 2) 시청률(퍼센트)을 사이드바에도 즉시 반영
    return onProgressUpdated((d) => {
      const lessonId = typeof d.lessonId === "string" ? d.lessonId : "";
      const courseId = typeof d.courseId === "string" ? d.courseId : "";
      if (!lessonId) return;

      const nowISO = new Date().toISOString();
      const pct = Math.max(0, Math.min(100, Math.round(Number.isFinite(d.percent) ? d.percent : 0)));

      setLiveCourses((prev) => {
        const cur = Array.isArray(prev) ? prev : [];
        const idx = cur.findIndex((x) => x.lastLessonId === lessonId);
        const existing = idx >= 0 ? cur[idx] : null;
        const nextItem = {
          courseId: courseId || existing?.courseId || "",
          title: existing?.title ?? (typeof d.courseTitle === "string" && d.courseTitle ? d.courseTitle : "강좌"),
          lastLessonId: lessonId,
          lastLessonTitle: d.lessonTitle ?? existing?.lastLessonTitle ?? null,
          lastWatchedAtISO: nowISO,
          lastSeconds: existing?.lastSeconds ?? null,
          percent: pct,
        };

        // 최근 수강 목록은 강의(lesson) 단위로 누적
        const without = cur.filter((x) => x.lastLessonId !== lessonId);
        const merged = [nextItem, ...without];
        return merged.slice(0, 6);
      });

      // 최근 수강 목록(localStorage)을 실제 화면 표시 기준으로 쓰므로, 최신 로컬 기록을 다시 읽어온다.
      if (userStorageKey) {
        const items = readRecentWatched(userStorageKey, 6).map((it) => ({
          courseId: it.courseId,
          title: it.courseTitle,
          lastLessonId: it.lessonId,
          lastLessonTitle: it.lessonTitle,
          lastWatchedAtISO: it.watchedAtISO,
          lastSeconds: null,
          percent: 0,
        }));
        setRecentLocal(items);
      }

      // 새로고침 없이도 sidebar의 percent가 0으로 튀지 않게 캐시 업데이트
      setRecentProgressByLessonId((prev) => {
        const next = new Map(prev);
        next.set(lessonId, pct);
        return next;
      });
    });
  }, [isLoggedIn, showAllCourses, userStorageKey]);

  // 새로고침/재진입 시에도 계정(DB)에 저장된 percent를 최근 수강 목록에 반영
  useEffect(() => {
    if (!isLoggedIn) return;
    if (showAllCourses) return;
    const lessonIds = recentLocal.map((x) => x.lastLessonId).filter((x): x is string => typeof x === "string" && x.length > 0);
    if (lessonIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        lessonIds.map(async (lessonId) => {
          try {
            const res = await fetch(`/api/progress/${lessonId}`, { method: "GET", credentials: "include" });
            if (!res.ok) return null;
            const data = await res.json().catch(() => null);
            const pct = Number(data?.progress?.percent);
            if (!Number.isFinite(pct)) return null;
            return [lessonId, Math.max(0, Math.min(100, pct))] as const;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setRecentProgressByLessonId(() => {
        const m = new Map<string, number>();
        for (const e of entries) {
          if (!e) continue;
          m.set(e[0], e[1]);
        }
        return m;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, showAllCourses, recentLocal]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (showAllCourses) return;
    // 서버(Progress) 기반 목록이 비어 있으면, 클라이언트 로컬 기록으로 즉시 보완
    if (enrolledCourses.length > 0) return;
    const userKey = (typeof (email ?? "") === "string" && email) ? email : "";
    // 가능하면 userId를 우선 사용(더 안정적)
    const key = (typeof (userId ?? "") === "string" && userId) ? userId : userKey;
    if (!key) return;
    const items = readRecentWatched(key, 6);
    if (!items.length) return;
    setRecentFallback(
      items.map((it) => ({
        courseId: it.courseId,
        title: it.courseTitle,
        lastLessonId: it.lessonId,
        lastLessonTitle: it.lessonTitle,
        lastWatchedAtISO: it.watchedAtISO,
        lastSeconds: null,
        percent: 0,
      }))
    );
  }, [enrolledCourses.length, email, isLoggedIn, showAllCourses, userId]);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setIsOpen]);

  // 모바일 사이드바가 열려 있을 때: 페이지(body) 스크롤 잠금 + 드로어만 스크롤
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    const cls = "unova-no-scroll";
    if (isOpen) {
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
  }, [isOpen]);

  // 앱 첫 진입 시 교재 썸네일을 idle 타이밍에 미리 준비 (warmup)
  useEffect(() => {
    let cancelled = false;
    const doWarmup = async () => {
      try {
        const res = await fetch("/api/textbooks/available", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const textbooks: { id: string; title: string }[] = Array.isArray(data.textbooks) ? data.textbooks : [];
        for (const { id } of textbooks) {
          if (cancelled) return;
          warmupThumb(`/api/textbooks/${id}/view`);
        }
      } catch {
        /* ignore */
      }
    };
    const requestIdle = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout?: number }) => unknown);
    if (typeof requestIdle === "function") {
      const handle = requestIdle(() => doWarmup(), { timeout: 8000 });
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(handle);
      };
    } else {
      const tid = setTimeout(() => doWarmup(), 2000);
      return () => {
        cancelled = true;
        clearTimeout(tid);
      };
    }
  }, []);



  const EnrolledCoursesSection = useMemo(() => {
    // 서버(progress) 목록은 퍼센트 즉시 반영용으로만 보조 활용
    const percentByLessonId = new Map(
      (Array.isArray(liveCourses) ? liveCourses : [])
        .filter((x) => x?.lastLessonId)
        .map((x) => [x.lastLessonId as string, x.percent] as const)
    );

    // DB(progress) 기반 목록은 환경/스키마에 따라 "강좌별 1개"만 갱신될 수 있어
    // 실제 UX(강의별 최근 수강 누적)는 로컬 기록(localStorage)을 우선 사용한다.
    const base = recentLocal.length > 0 ? recentLocal : (liveCourses.length > 0 ? liveCourses : recentFallback);
    const list = base.map((x) => ({
      ...x,
      percent:
        recentProgressByLessonId.get(x.lastLessonId ?? "") ??
        percentByLessonId.get(x.lastLessonId ?? "") ??
        x.percent,
    }));
    return (
      <div className="mt-6">
        <p className="px-3 text-xs font-semibold text-white/60">{showAllCourses ? "강좌 목록(테스트)" : "최근 수강 목록"}</p>
        {list.length > 0 ? (
          <ul className="recent-watch-list mt-2 flex flex-col gap-1 p-0">
            {list.map((c) => {
              // 마지막 시청 강의가 있으면 해당 강의로, 없으면 대시보드로
              const href = c.lastLessonId ? `/lesson/${c.lastLessonId}` : `/dashboard`;
              return (
                <li key={c.lastLessonId ?? `${c.courseId}-${c.title}`} className="static block">
                  <Link
                    href={href}
                    className="static flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{c.title}</p>
                      {c.lastLessonTitle ? (
                        <p className="mt-0.5 truncate text-xs text-white/70">{c.lastLessonTitle}</p>
                      ) : null}
                      {!c.lastLessonTitle && !c.lastWatchedAtISO ? (
                        <p className="truncate text-xs text-white/60">{showAllCourses ? "미수강" : "시청 기록 없음"}</p>
                      ) : null}
                    </div>
                    <ProgressRing percent={c.percent} />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 px-3 text-sm text-white/50">최근 수강 목록이 없습니다.</p>
        )}
      </div>
    );
  }, [liveCourses, recentFallback, recentLocal, recentProgressByLessonId, showAllCourses]);

  const Nav = (
    <nav className="space-y-1 text-sm">
      {/* 관리자 페이지에서는 관리 메뉴만 표시 */}
      {isAdminArea ? (
        <>
          <NavItem href="/admin" label="관리자 대시보드" icon="dashboard" />
          <div className="mt-4">
          <p className="px-3 text-xs font-semibold text-white/60">관리</p>
          <div className="mt-2 space-y-1">
              <NavItem href="/admin/home" label="메인페이지 설정" icon="tune" />
              <NavItem href="/admin/textbooks" label="교재 관리" icon="menu_book" />
              <NavItem href="/admin/courses" label="강좌 관리" icon="video_library" />
              <NavItem href="/admin/members" label="회원 관리" icon="group" />
              <NavItem href="/admin/orders" label="주문 관리" icon="receipt_long" />
              <NavItem href="/admin/popups" label="팝업 관리" icon="web_asset" />
              <NavItem href="/admin/reviews" label="후기 관리" icon="rate_review" />
              <NavItem href="/admin/teachers" label="선생님 관리" icon="badge" />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 일반 사용자 메뉴: 교재 다운로드 -> 수강중인 강좌 -> 선생님 공지사항 -> 유노바 홈페이지 -> 최근 수강 목록 */}
      <NavItem href="/materials" label="교재 다운로드" icon="menu_book" />
      <NavItem href="/dashboard" label="수강중인 강좌" icon="school" />
      <NavItem href="/notices" label="선생님 공지사항" icon="campaign" />
          {/* 유노바 홈페이지 */}
      <a
            href="/"
        className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10 text-white/90"
      >
        <span
          className="material-symbols-outlined shrink-0 leading-none text-white/70"
          style={{
            fontSize: "14px",
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 30",
          }}
          aria-hidden="true"
        >
          home
        </span>
        <span className="truncate">유노바 홈페이지</span>
      </a>
      {/* 구분선: 유노바 홈페이지 ↔ 최근 수강 목록 */}
      <div className="my-3 mx-3 border-t-2 border-white/10" />
      {/* 최근 수강 목록 */}
      {EnrolledCoursesSection}
        </>
      )}
    </nav>
  );

  // 로그인하지 않은 경우 프로필 섹션 숨김
  const Profile = isLoggedIn ? (
    <div className="space-y-2">
      {/* 프로필 클릭 시 로그아웃 버튼 표시 */}
      <button
        type="button"
        onClick={() => setShowLogout(!showLogout)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
      >
        {/* 프로필 이미지 또는 이니셜 */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={avatarUrl} 
            alt="프로필" 
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
            {initials(displayName || email)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {/* 이름이 있으면 이름 표시, 아래에 이메일 */}
          {displayName && displayName !== email.split("@")[0] ? (
            <>
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs text-white/50">{email}</p>
            </>
          ) : (
            <p className="truncate text-sm text-white/80">{email}</p>
          )}
        </div>
        <span
          className="material-symbols-outlined text-white/40"
          style={{ fontSize: "16px", transform: showLogout ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          expand_more
        </span>
      </button>
      
      {/* 로그아웃 버튼 (토글) */}
      {showLogout && (
        <a
          href="/api/auth/logout"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "16px" }}
          >
            logout
          </span>
          로그아웃
        </a>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* 모바일 드로어 */}
      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-[1100] bg-black/60 lg:hidden animate-[fadeIn_180ms_ease-out]"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 left-0 z-[1200] w-72 bg-[#161616] p-5 lg:hidden animate-[drawerIn_180ms_ease-out] overflow-y-auto overscroll-contain"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <div />
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="메뉴 닫기"
                  className="rounded-lg p-2 hover:bg-white/10"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* 모바일 사이드 메뉴 */}
              <div className="mt-5">{Nav}</div>

              {/* 회원 정보: 왼쪽 하단 고정 */}
              <div className="mt-auto pt-6">{Profile}</div>
            </div>
          </div>
        </>
      ) : null}

      {/* 데스크탑 사이드바 */}
      <aside
        className={`${isDesktopSidebarCollapsed ? "hidden" : "hidden lg:block"} w-72 shrink-0 bg-[#161616] p-5`}
      >
        <div className="flex h-full flex-col">
          {Nav}
          {/* 나의 강의실(PC)은 헤더 우측으로 회원 UI를 이동하므로, 데스크탑 사이드바 하단 프로필은 숨깁니다. */}
          {!isClassroomSection ? (
            <div className="mt-auto pt-6">
              {Profile}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}


