import Link from "next/link";
import AppShell from "@/app/_components/AppShell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

function fmtDate(yyyyMmDd: string) {
  // "2025-12-18" -> "25.12.18"
  return yyyyMmDd.slice(2, 10).replace(/-/g, ".");
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
  baseWhere: any;
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

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">선생님 공지사항</h1>

      {/* 카테고리 탭 */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href="/notices"
          className={`rounded-xl border px-3 py-2 text-xs ${
            !selectedCategory ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          전체 <span className="text-white/60">({total})</span>
        </Link>
        {categories.map((c) => (
          <Link
            key={c.category}
            href={`/notices?cat=${encodeURIComponent(c.category)}`}
            className={`rounded-xl border px-3 py-2 text-xs ${
              selectedCategory === c.category
                ? "border-white/20 bg-white/10 text-white"
                : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            {c.category} <span className="text-white/60">({c.count})</span>
          </Link>
        ))}
      </div>

      {/* 게시판 테이블 */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#212123]">
        <table className="w-full text-sm">
          <thead className="text-left text-white/60">
            <tr className="border-b border-white/10">
              <th className="px-5 py-3 pr-3 w-[76px]">번호</th>
              <th className="px-5 py-3 pr-3">카테고리</th>
              <th className="py-3 pr-3">제목</th>
              <th className="py-3 pr-3">작성일</th>
            </tr>
          </thead>
          <tbody>
            {list.map((n, idx) => {
              const href = `/notices/${n.slug}`;
              const no = list.length - idx; // 최신글이 위로 오므로 번호는 desc
              const date = fmtDate(n.createdAt.toISOString().slice(0, 10));
              const cellClass =
                "block w-full px-5 py-3 pr-3 hover:underline hover:text-white focus:outline-none focus:ring-2 focus:ring-white/10 rounded-lg";
              return (
                <tr key={n.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-5 py-3 pr-3 text-white/60">
                    <Link href={href} className="inline-flex w-full hover:underline">
                      {no}
                    </Link>
                  </td>
                  <td className="px-5 py-3 pr-3 text-white/70">
                    <Link href={href} className="inline-flex w-full hover:underline">
                      {n.category}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    <Link href={href} className="inline-flex w-full font-medium text-white hover:underline">
                      {n.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-white/60">
                    <Link href={href} className="inline-flex w-full hover:underline">
                      {date}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-white/60">
                  등록된 공지사항이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}


