"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

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

function SearchBox({
  containerClassName,
  value,
  onChangeValue,
  onClear,
}: {
  containerClassName: string;
  value: string;
  onChangeValue: (next: string) => void;
  onClear: () => void;
}) {
  return (
    <div className={containerClassName}>
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <input
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        placeholder="강좌/선생님/최근 수강 강의 검색"
        className="h-10 w-full rounded-lg border border-white/10 bg-transparent pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-white/10"
      />
      {value.trim().length ? (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={onClear}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export default function SidebarClient({ email, displayName, avatarUrl, isAdmin, showAllCourses, enrolledCourses }: Props) {
  const pathname = usePathname();
  const isAdminArea = pathname?.startsWith("/admin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const [q, setQ] = useState(qParam);
  const debounceRef = useRef<number | null>(null);
  const [openRequested, setOpenRequested] = useState(false);
  const [openedAtPath, setOpenedAtPath] = useState<string>("");
  const open = openRequested && openedAtPath === pathname;
  const exitUrl = process.env.NEXT_PUBLIC_EXIT_URL || "/";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenRequested(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const onSearchChange = (next: string) => {
    setQ(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next.trim().length) sp.set("q", next);
      else sp.delete("q");
      const qs = sp.toString();
      const target = qs ? `/dashboard?${qs}` : "/dashboard";
      if (pathname !== "/dashboard") router.push(target);
      else router.replace(target);
    }, 200);
  };

  const onSearchClear = () => {
    setQ("");
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("q");
    if (pathname !== "/dashboard") router.push("/dashboard");
    else router.replace("/dashboard");
  };

  const DesktopHeader = (
    <header className="fixed left-0 right-0 top-0 z-50 hidden h-16 items-center justify-between border-b border-white/10 bg-[#1d1d1f]/95 px-4 backdrop-blur md:flex md:px-6">
      <Link href="/dashboard" className="inline-flex items-center">
        <Image src="/unova-logo.png" alt="UNOVA" width={180} height={32} priority className="h-6 w-auto" />
      </Link>

      <div className="flex items-center gap-2">
        <SearchBox
          containerClassName="relative w-44 sm:w-72 md:w-[380px]"
          value={q}
          onChangeValue={onSearchChange}
          onClear={onSearchClear}
        />
        <a
          href={exitUrl}
          className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white/90 hover:bg-white/10"
        >
          나가기
        </a>
      </div>
    </header>
  );

  const MobileHeader = (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#1d1d1f]/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="grid grid-cols-3 items-center">
        <button
          type="button"
          onClick={() => {
            setOpenedAtPath(pathname);
            setOpenRequested(true);
          }}
          aria-label="메뉴 열기"
          className="justify-self-start rounded-lg p-2 hover:bg-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/dashboard" className="inline-flex items-center justify-self-center">
          <Image src="/unova-logo.png" alt="UNOVA" width={160} height={28} priority className="h-6 w-auto" />
        </Link>

        <a
          href={exitUrl}
          className="justify-self-end inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/90 hover:bg-white/10"
        >
          나가기
        </a>
      </div>

      <div className="mt-3">
        <SearchBox
          containerClassName="relative w-full"
          value={q}
          onChangeValue={onSearchChange}
          onClear={onSearchClear}
        />
      </div>
    </header>
  );

  const EnrolledCoursesSection = useMemo(() => {
    if (!enrolledCourses.length) return null;
    return (
      <div className="mt-6">
        <p className="px-3 text-xs font-semibold text-white/60">{showAllCourses ? "강좌 목록(테스트)" : "강의 시청 기록"}</p>
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

      {/* 순서: 공지사항 -> 교재 다운로드 -> 수강중인 강좌 */}
      <NavItem href="/notices" label="선생님 공지사항" icon="campaign" />
      <NavItem href="/materials" label="교재 다운로드" icon="menu_book" />
      <NavItem href="/dashboard" label="수강중인 강좌" icon="school" />
      {/* 수강중인 강좌 버튼 아래: 강좌 리스트 */}
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
      {DesktopHeader}

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
          {Nav}
          <div className="mt-auto pt-6">
            {Profile}
          </div>
        </div>
      </aside>
    </>
  );
}


