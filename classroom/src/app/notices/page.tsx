import Link from "next/link";
import AppShell from "@/app/_components/AppShell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

function fmtDate(yyyyMmDd: string) {
  // "2025-12-18" -> "25.12.18"
  return yyyyMmDd.slice(2, 10).replace(/-/g, ".");
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return fmtDate(date.toISOString().slice(0, 10));
}

export default async function NoticesPage({ searchParams }: { searchParams?: Promise<{ cat?: string }> }) {
  const user = await getCurrentUser();
  const baseWhere = user?.isAdmin ? {} : { isPublished: true };

  const groups = await prisma.notice.groupBy({
    by: ["category"],
    where: baseWhere,
    _count: { _all: true },
    orderBy: { category: "asc" },
  });

  const categories = groups
    .map((g) => ({ category: g.category, count: g._count._all }))
    .filter((x) => x.category && x.category.trim().length > 0);

  const total = categories.reduce((sum, c) => sum + c.count, 0);

  return <NoticesBoard baseWhere={baseWhere} categories={categories} total={total} searchParams={await searchParams} />;
}

async function NoticesBoard({
  baseWhere,
  categories,
  total,
  searchParams,
}: {
  baseWhere: object;
  categories: { category: string; count: number }[];
  total: number;
  searchParams?: { cat?: string };
}) {
  const selected = typeof searchParams?.cat === "string" ? searchParams.cat.trim() : "";
  const selectedCategory = selected && categories.some((c) => c.category === selected) ? selected : "";

  const list = await prisma.notice.findMany({
    where: selectedCategory ? { ...baseWhere, category: selectedCategory } : baseWhere,
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, slug: true, title: true, category: true, createdAt: true },
    take: 200,
  });

  // 최근 7일 이내 글인지 확인
  const isNew = (date: Date) => {
    const diffMs = new Date().getTime() - date.getTime();
    return diffMs < 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <AppShell>
      {/* 헤더 카드 */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.04] to-transparent p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08]">
              <span className="material-symbols-outlined text-[22px] text-white/70">campaign</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">선생님 공지사항</h1>
              <p className="mt-0.5 text-sm text-white/50">
                {total > 0 ? (
                  <>총 <span className="font-medium text-white/70">{total}개</span>의 공지사항이 있습니다</>
                ) : (
                  "등록된 공지사항이 없습니다"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/notices"
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              !selectedCategory
                ? "bg-white text-black"
                : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white/80"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">apps</span>
            전체
            <span className={`ml-0.5 text-xs ${!selectedCategory ? "text-black/60" : "text-white/40"}`}>
              {total}
            </span>
          </Link>
          {categories.map((c) => (
            <Link
              key={c.category}
              href={`/notices?cat=${encodeURIComponent(c.category)}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === c.category
                  ? "bg-white text-black"
                  : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white/80"
              }`}
            >
              {c.category}
              <span className={`text-xs ${selectedCategory === c.category ? "text-black/60" : "text-white/40"}`}>
                {c.count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 공지사항 목록 */}
      {list.length > 0 ? (
        <div className="space-y-2">
          {list.map((n, idx) => {
            const href = `/notices/${n.slug}`;
            const no = list.length - idx;
            const relTime = getRelativeTime(n.createdAt);
            const showNew = isNew(n.createdAt);

            return (
              <Link
                key={n.id}
                href={href}
                className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#1a1a1c] p-4 transition-colors hover:border-white/[0.1] hover:bg-[#1e1e20]"
              >
                {/* 번호 */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-sm font-medium text-white/40">
                  {no}
                </div>

                {/* 내용 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white group-hover:text-white">
                      {n.title}
                    </p>
                    {showNew && (
                      <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                    <span className="inline-flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5">
                      {n.category}
                    </span>
                    <span>·</span>
                    <span>{relTime}</span>
                  </div>
                </div>

                {/* 화살표 */}
                <span className="material-symbols-outlined shrink-0 text-[18px] text-white/20 transition-colors group-hover:text-white/40">
                  chevron_right
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
            <span className="material-symbols-outlined text-[32px] text-white/30">notifications_off</span>
          </div>
          <p className="mt-4 text-sm font-medium text-white/60">등록된 공지사항이 없습니다</p>
          <p className="mt-1 text-xs text-white/40">새로운 공지사항이 등록되면 여기에 표시됩니다</p>
        </div>
      )}
    </AppShell>
  );
}
