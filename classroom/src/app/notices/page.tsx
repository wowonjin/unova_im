import Link from "next/link";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import { prisma } from "@/lib/prisma";

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

  const categoriesRaw = await prisma.notice.groupBy({
    by: ["category"],
    where: { isPublished: true },
    _count: { _all: true },
  });
  categoriesRaw.sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0));
  const categories = categoriesRaw.map((r) => ({ category: r.category, count: r._count._all }));

  const selected = typeof sp?.cat === "string" ? sp.cat.trim() : "";
  const selectedCategory = selected && categories.some((c) => c.category === selected) ? selected : "";

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
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h1 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] leading-[1.15]">
              공지사항
            </h1>
          </div>
        </section>

        {/* 컨텐츠 */}
        <section className="pb-24">
          <div className="mx-auto max-w-3xl px-6">
      {/* 카테고리 필터 */}
            <div className="flex items-center gap-2 mb-10">
          <Link
            href="/notices"
                className={`px-4 py-2 rounded-full text-[14px] font-medium transition-all ${
              !selectedCategory
                ? "bg-white text-black"
                    : "text-white/50 hover:text-white"
            }`}
          >
            전체
          </Link>
          {categories.map((c) => (
            <Link
              key={c.category}
              href={`/notices?cat=${encodeURIComponent(c.category)}`}
                  className={`px-4 py-2 rounded-full text-[14px] font-medium transition-all ${
                selectedCategory === c.category
                  ? "bg-white text-black"
                      : "text-white/50 hover:text-white"
              }`}
            >
              {c.category}
            </Link>
          ))}
      </div>

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
                      {n.category}
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
        </section>
      </main>
      
      <Footer />
        </div>
  );
}
