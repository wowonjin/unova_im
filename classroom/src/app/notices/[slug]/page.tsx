import Link from "next/link";
import AppShell from "@/app/_components/AppShell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

function fmtDate(yyyyMmDd: string) {
  return yyyyMmDd.slice(2, 10).replace(/-/g, ".");
}

export default async function NoticeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  // Next.js 라우트 파라미터가 URL-encoded 형태로 들어오는 케이스가 있어 안전하게 decode 처리
  let slug = rawSlug;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    // ignore
  }
  // 한글 등 유니코드 정규화 차이로 매칭이 실패하는 경우를 방지
  slug = slug.normalize("NFC");
  const user = await getCurrentUser();
  const baseWhere = user?.isAdmin ? {} : { isPublished: true };

  const notice = await prisma.notice.findFirst({
    where: { slug, ...(user?.isAdmin ? {} : { isPublished: true }) },
    select: { title: true, body: true, category: true, createdAt: true },
  });

  if (!notice) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/80">공지사항을 찾을 수 없습니다.</p>
          <Link href="/notices" className="mt-4 inline-block underline text-white/80">
            선생님 공지사항 목록으로
          </Link>
        </div>
      </AppShell>
    );
  }

  // 상단 카테고리 탭(리스트 페이지와 동일한 UX)
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
  const selectedCategory = notice.category?.trim() || "";

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

      {/* 글 컨테이너 */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs text-white/70">{notice.category}</p>
        <h2 className="mt-2 text-2xl font-semibold">{notice.title}</h2>
        <p className="mt-1 text-sm text-white/60">{fmtDate(notice.createdAt.toISOString().slice(0, 10))}</p>

        <div
          className="mt-6 text-sm leading-relaxed text-white/90
            [&_p]:my-2 [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-semibold
            [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-semibold
            [&_h3]:my-3 [&_h3]:text-lg [&_h3]:font-semibold
            [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6
            [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6
            [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:text-white/80
            [&_a]:underline [&_a]:underline-offset-2 [&_a]:text-white/90
            [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-xl"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: notice.body }}
        />
      </div>
    </AppShell>
  );
}


