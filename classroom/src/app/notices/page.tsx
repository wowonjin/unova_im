import Link from "next/link";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import AdminNoticeComposerClient from "./AdminNoticeComposerClient";

function parseTeacherNameFromCategory(category: string): string | null {
  const c = (category || "").trim();
  const prefix = "선생님 공지사항 -";
  if (!c.startsWith(prefix)) return null;
  const name = c.slice(prefix.length).trim();
  return name || null;
}

function displayBoardName(category: string): string {
  const c = (category || "").trim();
  const prefix = "선생님 공지사항 -";
  if (c.startsWith(prefix)) {
    const name = c.slice(prefix.length).trim();
    if (name) return `${name}T 게시판`;
  }
  return c || "공지사항";
}

function fmtDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return fmtDate(date);
}

export default async function NoticesPage({
  searchParams,
}: {
  searchParams?: Promise<{ cat?: string; page?: string; slug?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  const rawSlug = typeof sp?.slug === "string" ? sp.slug : "";
  const activeSlug = (() => {
    if (!rawSlug) return "";
    try {
      return decodeURIComponent(rawSlug).normalize("NFC");
    } catch {
      return rawSlug.normalize("NFC");
    }
  })();

  // 게시판 목록:
  // - 기존: Notice.category groupBy → 공지가 0개인 게시판은 아예 생성/노출되지 않음
  // - 개선: Teacher 목록을 "게시판 정의"로 사용하고, 공지 카운트는 Notice에서 합산
  //   → 선생님을 추가하면 즉시 "{선생님}T 게시판"이 생성된 것처럼 노출 가능

  const [categoriesRaw, teachersRaw] = await Promise.all([
    prisma.notice.groupBy({
      by: ["category"],
      where: { isPublished: true },
      _count: { _all: true },
    }),
    prisma.teacher.findMany({
      where: { isActive: true },
      select: { name: true, position: true, createdAt: true },
    }),
  ]);

  // category → count 맵
  const countByCategory = new Map<string, number>();
  for (const r of categoriesRaw) {
    const key = (r.category || "").trim();
    if (!key) continue;
    countByCategory.set(key, r._count?._all ?? 0);
  }

  // 선생님 게시판: 관리자(teachers) 페이지의 position 정렬과 동일하게 맞춤
  // position=0 은 레거시/미설정이므로 맨 뒤로 보냄 (오름차순)
  const sortedTeachers = teachersRaw
    .slice()
    .sort((a, b) => {
      const ap = a.position === 0 ? Number.MAX_SAFE_INTEGER : a.position;
      const bp = b.position === 0 ? Number.MAX_SAFE_INTEGER : b.position;
      if (ap !== bp) return ap - bp;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const teacherPrefix = "선생님 공지사항 -";
  const teacherCategoriesFromTeachers = sortedTeachers.map((t) => {
    const category = `${teacherPrefix} ${t.name}`.replace(/\s+/g, " ").trim();
    const count = countByCategory.get(category) ?? 0;
    return { category, count };
  });

  // 기존 공지에 있는 카테고리 중, 선생님 게시판(prefix)인데 현재 활성 선생님 목록에 없는 것(레거시)을 뒤에 붙임
  const teacherCategorySet = new Set(teacherCategoriesFromTeachers.map((x) => x.category));
  const legacyTeacherCategories = Array.from(countByCategory.entries())
    .filter(([cat]) => cat.startsWith(teacherPrefix) && !teacherCategorySet.has(cat))
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category, "ko"));

  // 그 외 일반 카테고리: 기존처럼 공지 수(내림차순) 기준
  const normalCategories = Array.from(countByCategory.entries())
    .filter(([cat]) => !cat.startsWith(teacherPrefix))
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  const categories = [...teacherCategoriesFromTeachers, ...legacyTeacherCategories, ...normalCategories];

  const categorySuggestions = Array.from(
    new Set(categories.map((c) => c.category).filter((x): x is string => typeof x === "string" && x.trim().length > 0))
  ).sort((a, b) => a.localeCompare(b, "ko"));

  const defaultCategory = user?.name ? `선생님 공지사항 - ${user.name}` : "선생님 공지사항";

  const selected = typeof sp?.cat === "string" ? sp.cat.trim() : "";
  // Teacher 기반 게시판도(공지 0개) 선택 가능해야 하므로 categories 기준으로 검증
  const selectedCategory = selected && categories.some((c) => c.category === selected) ? selected : "";
  const pageTitle = selectedCategory ? displayBoardName(selectedCategory) : "공지사항";

  const where = {
    isPublished: true,
    ...(selectedCategory ? { category: selectedCategory } : {}),
  };

  const currentPage = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  const perPage = 15;
  const totalCount = await prisma.notice.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const validPage = Math.min(currentPage, totalPages);
  const filteredList = await prisma.notice.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    skip: (validPage - 1) * perPage,
    take: perPage,
    select: { id: true, slug: true, title: true, category: true, createdAt: true },
  });

  const isNew = (date: Date) => {
    const diffMs = new Date().getTime() - date.getTime();
    return diffMs < 3 * 24 * 60 * 60 * 1000;
  };

  const buildNoticesHref = (opts: { cat?: string; page?: number; slug?: string | null }) => {
    const q = new URLSearchParams();
    if (opts.cat) q.set("cat", opts.cat);
    if (opts.page && opts.page > 1) q.set("page", String(opts.page));
    if (opts.slug) q.set("slug", opts.slug);
    const qs = q.toString();
    return qs ? `/notices?${qs}` : "/notices";
  };

  const notice = activeSlug
    ? await prisma.notice.findFirst({
        where: { slug: activeSlug, ...(user?.isAdmin ? {} : { isPublished: true }) },
        select: { id: true, slug: true, title: true, body: true, category: true, createdAt: true },
      })
    : null;

  const [prevNotice, nextNotice] =
    activeSlug && notice
      ? await Promise.all([
          prisma.notice.findFirst({
            where: {
              createdAt: { lt: notice.createdAt },
              ...(user?.isAdmin ? {} : { isPublished: true }),
            },
            orderBy: { createdAt: "desc" },
            select: { slug: true, title: true },
          }),
          prisma.notice.findFirst({
            where: {
              createdAt: { gt: notice.createdAt },
              ...(user?.isAdmin ? {} : { isPublished: true }),
            },
            orderBy: { createdAt: "asc" },
            select: { slug: true, title: true },
          }),
        ])
      : [null, null];

  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />
      
      <main className="flex-1 pt-[70px]">
        {/* 히어로 (PC 유지) */}
        <section className="hidden md:block py-10 md:py-12">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h1 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em]">{pageTitle}</h1>
            <p className="mt-3 text-[15px] md:text-[16px] text-white/50">유노바 선생님의 칼럼을 읽어보세요</p>
          </div>
        </section>

        {/* 모바일 헤더 (리브랜딩) */}
        <section className="md:hidden">
          <div className="mx-auto max-w-6xl px-4">
            <div className="py-5">
              <h1 className="mt-1 text-[22px] font-bold tracking-[-0.02em]">{pageTitle}</h1>
              <p className="mt-2 text-[13px] text-white/55">최신 글을 빠르게 확인하세요</p>
            </div>
          </div>
        </section>

        {/* 컨텐츠 */}
        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-4">
            {/* PC 레이아웃 (유지) */}
            <div className="hidden md:block">
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
                {/* 왼쪽: 카테고리 리스트 */}
                <aside className="md:sticky md:top-[92px] self-start">
                  {/* 요청사항: 컨테이너 배경/카드 제거 */}
                  <div className="p-0">
                    {/* 오른쪽 리스트(첫 항목 py-6)와 시각적 상단 정렬을 맞추기 위해 데스크톱에서만 약간 아래로 */}
                    <nav className="space-y-1 md:pt-4">
                      <Link
                        href="/notices"
                        className={`block px-3 py-2 rounded-lg text-[14px] transition-colors ${
                          !selectedCategory ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        전체
                      </Link>

                      {categories.map((c) => (
                        <Link
                          key={c.category}
                          href={`/notices?cat=${encodeURIComponent(c.category)}`}
                          className={`block px-3 py-2 rounded-lg text-[14px] transition-colors ${
                            selectedCategory === c.category
                              ? "bg-white/12 text-white"
                              : "text-white/70 hover:bg-white/8 hover:text-white"
                          }`}
                          aria-current={selectedCategory === c.category ? "page" : undefined}
                          title={c.category}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{displayBoardName(c.category)}</span>
                          </div>
                        </Link>
                      ))}
                    </nav>

                    {/* 관리자: 공지 작성 */}
                    <AdminNoticeComposerClient
                      isAdmin={Boolean(user?.isAdmin)}
                      defaultCategory={defaultCategory}
                      categorySuggestions={categorySuggestions}
                    />
                  </div>
                </aside>

                {/* 오른쪽: 목록 */}
                <div>
                  {/* 목록 ↔ 상세 (프레임 유지) */}
                  {activeSlug ? (
                    notice ? (
                      <article className="py-2">
                        <header className="border-b border-white/10 pb-6">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="inline-flex items-center rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-white/70">
                              {displayBoardName(notice.category)}
                            </span>
                          </div>
                          <h2 className="text-2xl md:text-3xl font-bold leading-tight">{notice.title}</h2>
                          <p className="mt-3 text-sm text-white/40">{fmtDate(notice.createdAt)}</p>
                        </header>

                        <div
                          className="py-8 text-[15px] leading-[1.8] text-white/85
                            [&_p]:my-4
                            [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold
                            [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-bold
                            [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold
                            [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2
                            [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2
                            [&_li]:text-white/80
                            [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-white/20 [&_blockquote]:pl-5 [&_blockquote]:py-1 [&_blockquote]:text-white/70 [&_blockquote]:italic
                            [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-blue-300
                            [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-xl
                            [&_pre]:my-6 [&_pre]:rounded-xl [&_pre]:bg-white/[0.04] [&_pre]:p-4 [&_pre]:overflow-x-auto
                            [&_code]:text-sm [&_code]:text-amber-400
                            [&_hr]:my-8 [&_hr]:border-white/10"
                          // eslint-disable-next-line react/no-danger
                          dangerouslySetInnerHTML={{ __html: notice.body }}
                        />
                      </article>
                    ) : (
                      <div className="py-20 text-center">
                        <p className="text-[17px] text-white/40">공지사항을 찾을 수 없습니다</p>
                        <div className="mt-6">
                          <Link
                            href={buildNoticesHref({ cat: selectedCategory || undefined, page: validPage, slug: null })}
                            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
                          >
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            목록으로 돌아가기
                          </Link>
                        </div>
                      </div>
                    )
                  ) : filteredList.length > 0 ? (
                    <div className="space-y-0">
                      {filteredList.map((n, idx) => {
                        const href = buildNoticesHref({ cat: selectedCategory || undefined, page: validPage, slug: n.slug });
                        const relTime = getRelativeTime(n.createdAt);
                        const showNew = isNew(n.createdAt);

                        return (
                          <Link
                            key={n.id}
                            href={href}
                            className={`group flex items-start justify-between gap-6 py-6 transition-opacity hover:opacity-60 ${
                              idx !== 0 ? "border-t border-white/[0.08]" : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <span className="text-[12px] font-medium text-white/40">{displayBoardName(n.category)}</span>
                                {showNew && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              </div>
                              <h3 className="mt-2 text-[17px] font-medium leading-snug text-white/90">{n.title}</h3>
                            </div>
                            <div className="shrink-0 text-[14px] text-white/30 pt-6">{relTime}</div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <p className="text-[17px] text-white/40">등록된 공지사항이 없습니다</p>
                    </div>
                  )}

                  {/* 페이지네이션 */}
                  {!activeSlug && totalPages > 1 && (
                    <div className="mt-12 flex items-center justify-center gap-1">
                      {validPage > 1 && (
                        <Link
                          href={`/notices?${selectedCategory ? `cat=${encodeURIComponent(selectedCategory)}&` : ""}page=${validPage - 1}`}
                          className="w-10 h-10 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </Link>
                      )}

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (validPage <= 3) {
                          pageNum = i + 1;
                        } else if (validPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = validPage - 2 + i;
                        }

                        return (
                          <Link
                            key={pageNum}
                            href={`/notices?${selectedCategory ? `cat=${encodeURIComponent(selectedCategory)}&` : ""}page=${pageNum}`}
                            className={`w-10 h-10 flex items-center justify-center rounded-full text-[14px] font-medium transition-all ${
                              pageNum === validPage ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            {pageNum}
                          </Link>
                        );
                      })}

                      {validPage < totalPages && (
                        <Link
                          href={`/notices?${selectedCategory ? `cat=${encodeURIComponent(selectedCategory)}&` : ""}page=${validPage + 1}`}
                          className="w-10 h-10 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 모바일 레이아웃 (리브랜딩) */}
            <div className="md:hidden">
              {/* 게시판 탭 (가로 스크롤) */}
              <div className="sticky top-[70px] z-20 -mx-4 px-4 pb-3 pt-2 bg-[#161616] border-b border-white/[0.06]">
                <div
                  className="flex items-center gap-4 overflow-x-auto no-scrollbar overscroll-x-contain snap-x snap-mandatory"
                  style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
                >
                  <Link
                    href="/notices"
                    className={`shrink-0 py-2 text-[13px] font-medium transition-colors ${
                      !selectedCategory ? "text-white font-semibold underline underline-offset-4 decoration-white/30" : "text-white/60"
                    } snap-start`}
                  >
                    전체
                  </Link>

                  {categories.map((c) => {
                    const active = selectedCategory === c.category;
                    const label = displayBoardName(c.category);
                    return (
                      <Link
                        key={c.category}
                        href={`/notices?cat=${encodeURIComponent(c.category)}`}
                        className={`shrink-0 py-2 text-[13px] font-medium transition-colors ${
                          active ? "text-white font-semibold underline underline-offset-4 decoration-white/30" : "text-white/60"
                        } snap-start`}
                        aria-current={active ? "page" : undefined}
                        title={c.category}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="max-w-[180px] truncate">{label}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* 관리자: 공지 작성 (모바일에서도 접근 가능) */}
              <div className="mt-4">
                <AdminNoticeComposerClient
                  isAdmin={Boolean(user?.isAdmin)}
                  defaultCategory={defaultCategory}
                  categorySuggestions={categorySuggestions}
                />
              </div>

              {/* 목록 ↔ 상세 */}
              <div className="mt-4">
                {activeSlug ? (
                  notice ? (
                    <article className="pb-6">
                      <div className="mb-4">
                        <Link
                          href={buildNoticesHref({ cat: selectedCategory || undefined, page: validPage, slug: null })}
                          className="inline-flex items-center gap-2 text-[14px] text-white/70 hover:text-white"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                          목록
                        </Link>
                      </div>

                      <header className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-white/[0.08] px-2.5 py-1 text-[12px] font-medium text-white/75">
                            {displayBoardName(notice.category)}
                          </span>
                          <span className="text-[12px] text-white/45">{fmtDate(notice.createdAt)}</span>
                        </div>
                        <h2 className="mt-3 text-[20px] font-bold leading-snug tracking-[-0.02em]">{notice.title}</h2>
                      </header>

                      <div
                        className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-[15px] leading-[1.85] text-white/90
                          [&_p]:my-4
                          [&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold
                          [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold
                          [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold
                          [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2
                          [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2
                          [&_li]:text-white/85
                          [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:text-white/75
                          [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2
                          [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-xl
                          [&_pre]:my-5 [&_pre]:rounded-xl [&_pre]:bg-white/[0.04] [&_pre]:p-4 [&_pre]:overflow-x-auto
                          [&_code]:text-sm [&_code]:text-amber-400
                          [&_hr]:my-7 [&_hr]:border-white/10"
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: notice.body }}
                      />
                    </article>
                  ) : (
                    <div className="py-16 text-center">
                      <p className="text-[15px] text-white/55">공지사항을 찾을 수 없습니다</p>
                      <div className="mt-5">
                        <Link
                          href={buildNoticesHref({ cat: selectedCategory || undefined, page: validPage, slug: null })}
                          className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black"
                        >
                          목록으로
                        </Link>
                      </div>
                    </div>
                  )
                ) : filteredList.length > 0 ? (
                  <div className="space-y-3">
                    {filteredList.map((n) => {
                      const href = buildNoticesHref({ cat: selectedCategory || undefined, page: validPage, slug: n.slug });
                      const relTime = getRelativeTime(n.createdAt);
                      const showNew = isNew(n.createdAt);

                      return (
                        <Link
                          key={n.id}
                          href={href}
                          className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 active:bg-white/[0.05]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="truncate text-[12px] font-medium text-white/55">{displayBoardName(n.category)}</span>
                              {showNew ? <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> : null}
                            </div>
                            <span className="shrink-0 text-[12px] text-white/45">{relTime}</span>
                          </div>
                          <h3 className="mt-2 text-[16px] font-semibold leading-snug text-white/90">{n.title}</h3>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-[15px] text-white/55">등록된 공지사항이 없습니다</p>
                  </div>
                )}

                {/* 모바일 페이지네이션(간결) */}
                {!activeSlug && totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Link
                      href={`/notices?${selectedCategory ? `cat=${encodeURIComponent(selectedCategory)}&` : ""}page=${Math.max(1, validPage - 1)}`}
                      aria-disabled={validPage <= 1}
                      className={`flex-1 rounded-xl border border-white/[0.08] px-4 py-3 text-center text-sm font-semibold ${
                        validPage <= 1 ? "text-white/30" : "text-white/85 hover:bg-white/[0.04]"
                      }`}
                    >
                      이전
                    </Link>
                    <div className="shrink-0 text-[13px] text-white/55">
                      {validPage} / {totalPages}
                    </div>
                    <Link
                      href={`/notices?${selectedCategory ? `cat=${encodeURIComponent(selectedCategory)}&` : ""}page=${Math.min(totalPages, validPage + 1)}`}
                      aria-disabled={validPage >= totalPages}
                      className={`flex-1 rounded-xl border border-white/[0.08] px-4 py-3 text-center text-sm font-semibold ${
                        validPage >= totalPages ? "text-white/30" : "text-white/85 hover:bg-white/[0.04]"
                      }`}
                    >
                      다음
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
        </div>
  );
}
