import Link from "next/link";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import { prisma } from "@/lib/prisma";

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

export default async function NoticesPage({ searchParams }: { searchParams?: Promise<{ cat?: string; page?: string }> }) {
  const sp = await searchParams;

  // "선생님 게시판" 카테고리 → 해당 선생님 상세 페이지로 이동시키기 위한 name→slug 매핑
  const teacherSlugByName = new Map<string, string>();
  const teachers = await prisma.teacher.findMany({ select: { slug: true, name: true } } as any);
  for (const t of teachers as any[]) {
    if (t && typeof t.name === "string" && typeof t.slug === "string") {
      teacherSlugByName.set(t.name.trim(), t.slug);
    }
  }

  const categoriesRaw = await prisma.notice.groupBy({
    by: ["category"],
    where: { isPublished: true },
    _count: { _all: true },
  });
  categoriesRaw.sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0));
  const categories = categoriesRaw.map((r) => ({ category: r.category, count: r._count._all }));

  const selected = typeof sp?.cat === "string" ? sp.cat.trim() : "";
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

  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />
      
      <main className="flex-1 pt-[70px]">
        {/* 히어로 */}
        <section className="py-10 md:py-12">
          {/* LandingHeader의 좌측 정렬선(mx-auto max-w-6xl px-4)과 맞춤 */}
          <div className="mx-auto max-w-6xl px-4 text-left">
            <h1 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em]">
              {pageTitle}
            </h1>
            <p className="mt-3 text-[15px] md:text-[16px] text-white/50">
              유노바 선생님의 칼럼을 읽어보세요
            </p>
          </div>
        </section>

        {/* 컨텐츠 */}
        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-4">
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
              !selectedCategory
                          ? "bg-white/12 text-white"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
            }`}
          >
            전체
          </Link>

          {categories.map((c) => (
            <Link
              key={c.category}
              href={(() => {
                const teacherName = parseTeacherNameFromCategory(c.category);
                const slug = teacherName ? teacherSlugByName.get(teacherName) : null;
                // 매핑이 되면 선생님 상세 페이지로 이동, 아니면 기존처럼 공지사항 필터
                return slug ? `/teachers/${encodeURIComponent(slug)}` : `/notices?cat=${encodeURIComponent(c.category)}`;
              })()}
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
                          <span className={`text-[12px] ${selectedCategory === c.category ? "text-white/70" : "text-white/30"}`}>
                            {c.count}
                          </span>
                        </div>
            </Link>
          ))}
                  </nav>
      </div>
              </aside>

              {/* 오른쪽: 목록 */}
              <div>

            {/* 목록 */}
            {filteredList.length > 0 ? (
              <div className="space-y-0">
                {filteredList.map((n, idx) => {
            const href = `/notices/${n.slug}`;
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
                          <span className="text-[12px] font-medium text-white/40">
                      {displayBoardName(n.category)}
                    </span>
                          {showNew && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <h3 className="mt-2 text-[17px] font-medium leading-snug text-white/90">
                          {n.title}
                        </h3>
                  </div>
                      <div className="shrink-0 text-[14px] text-white/30 pt-6">
                        {relTime}
                </div>
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
            {totalPages > 1 && (
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
                        pageNum === validPage
                          ? "bg-white text-black"
                          : "text-white/40 hover:text-white hover:bg-white/5"
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
        </section>
      </main>
      
      <Footer />
        </div>
  );
}
