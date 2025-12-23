"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { warmupThumb } from "./pdfThumbWarmup";

type Props = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
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
      <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-[#1d1d1f]">
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

export default function SidebarClient({ email, displayName, avatarUrl, isAdmin, showAllCourses, enrolledCourses }: Props) {
  const pathname = usePathname();
  const isAdminArea = pathname?.startsWith("/admin");
  const [openRequested, setOpenRequested] = useState(false);
  const [openedAtPath, setOpenedAtPath] = useState<string>("");
  const open = openRequested && openedAtPath === pathname;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenRequested(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

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


  const MobileHeader = (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#1d1d1f]/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setOpenedAtPath(pathname);
            setOpenRequested(true);
          }}
          aria-label="메뉴 열기"
          className="rounded-lg p-2 hover:bg-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/dashboard" className="inline-flex items-center">
          <Image src="/unova-logo.png" alt="UNOVA" width={160} height={28} priority className="h-6 w-auto" />
        </Link>

        {/* 빈 공간으로 좌우 균형 맞춤 */}
        <div className="w-10" />
      </div>
    </header>
  );

  const EnrolledCoursesSection = useMemo(() => {
    return (
      <div className="mt-6">
        <p className="px-3 text-xs font-semibold text-white/60">{showAllCourses ? "강좌 목록(테스트)" : "최근 수강 목록"}</p>
        {enrolledCourses.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {enrolledCourses.map((c) => {
              const href = c.lastLessonId ? `/lesson/${c.lastLessonId}` : `/course/${c.courseId}`;
              return (
                <Link
                  key={c.courseId}
                  href={href}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-white/10"
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
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 px-3 text-sm text-white/50">최근 수강 목록이 없습니다.</p>
        )}
      </div>
    );
  }, [enrolledCourses, showAllCourses]);

  const Nav = (
    <nav className="space-y-1 text-sm">
      {/* 관리자 페이지에서는 빠른 생성/관리 버튼을 사이드바 상단에 노출 */}
      {isAdminArea ? (
        <div className="mb-4">
          <p className="px-3 text-xs font-semibold text-white/60">관리</p>
          <div className="mt-2 space-y-1">
            <NavItem href="/admin/textbooks" label="교재 만들기" icon="note_add" />
            <NavItem href="/admin/courses" label="강좌 만들기" icon="add_circle" />
            <NavItem href="/admin/notices" label="공지사항 만들기" icon="edit_note" />
          </div>
        </div>
      ) : null}

      {/* 순서: 교재 다운로드 -> 수강중인 강좌 -> 선생님 공지사항 -> 유노바 홈페이지 -> 최근 수강 목록 */}
      <NavItem href="/materials" label="교재 다운로드" icon="menu_book" />
      <NavItem href="/dashboard" label="수강중인 강좌" icon="school" />
      <NavItem href="/notices" label="선생님 공지사항" icon="campaign" />
      {/* 유노바 홈페이지 (새 창 열림) */}
      <a
        href="https://unova.co.kr"
        target="_blank"
        rel="noopener noreferrer"
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
      {/* 최근 수강 목록 */}
      {EnrolledCoursesSection}
      {/* admin 영역이 아니어도(예: 대시보드) 관리자라면 노출 */}
      {isAdmin && !isAdminArea ? (
        <>
          <NavItem href="/admin/textbooks" label="교재 만들기" icon="note_add" />
          <NavItem href="/admin/courses" label="강좌 만들기" icon="add_circle" />
          <NavItem href="/admin/notices" label="공지사항 만들기" icon="edit_note" />
        </>
      ) : null}
    </nav>
  );

  const Profile = (
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="회원 프로필" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
          {initials(displayName)}
        </div>
      )}

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{displayName}</p>
        <p className="truncate text-xs text-white/60">{email}</p>
      </div>
    </div>
  );

  return (
    <>
      {MobileHeader}

      {/* 모바일 드로어 */}
      {open ? (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 md:hidden animate-[fadeIn_180ms_ease-out]"
            onClick={() => setOpenRequested(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 left-0 z-[70] w-72 bg-[#1d1d1f] p-5 md:hidden animate-[drawerIn_180ms_ease-out]"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">메뉴</div>
                <button
                  type="button"
                  onClick={() => setOpenRequested(false)}
                  aria-label="메뉴 닫기"
                  className="rounded-lg p-2 hover:bg-white/10"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* 모바일 사이드 메뉴: 로고 제거, 메뉴만 표시 */}
              <div className="mt-5">{Nav}</div>

              {/* 회원 정보: 왼쪽 하단 고정 */}
              <div className="mt-auto pt-6">{Profile}</div>
            </div>
          </div>
        </>
      ) : null}

      {/* 데스크탑 사이드바 */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#1d1d1f] p-5 md:block">
        <div className="flex h-full flex-col">
          {/* 로고 - 아이콘들과 왼쪽 끝 맞춤 (px-3 = 12px) */}
          <div className="mb-6 px-3">
            <Link href="/dashboard" className="inline-flex items-center">
              <Image src="/unova-logo.png" alt="UNOVA" width={140} height={24} priority className="h-5 w-auto" />
            </Link>
          </div>
          {Nav}
          <div className="mt-auto pt-6">
            {Profile}
          </div>
        </div>
      </aside>
    </>
  );
}


