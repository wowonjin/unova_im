import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import ReviewsAdminClient from "./reviewsAdminClient";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtRating(v: number | null | undefined) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return n.toFixed(1);
}

export default async function AdminReviewsPage() {
  await requireAdminUser();

  // ===== Reviews dashboard (판매중 상품 기준) =====
  const [publishedCourses, publishedTextbooks] = await Promise.all([
    prisma.course.findMany({
      where: { isPublished: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, teacherName: true, subjectName: true, updatedAt: true },
      take: 24,
    }),
    prisma.textbook.findMany({
      where: { isPublished: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, teacherName: true, subjectName: true, updatedAt: true },
      take: 24,
    }),
  ]);

  const courseIds = publishedCourses.map((c) => c.id);
  const textbookIds = publishedTextbooks.map((t) => t.id);

  const [courseReviewAgg, textbookReviewAgg, recentReviews] = await Promise.all([
    courseIds.length
      ? prisma.review.groupBy({
          by: ["courseId"],
          where: { isApproved: true, productType: "COURSE", courseId: { in: courseIds } },
          _count: { _all: true },
          _avg: { rating: true },
        })
      : Promise.resolve([] as any[]),
    textbookIds.length
      ? prisma.review.groupBy({
          by: ["textbookId"],
          where: { isApproved: true, productType: "TEXTBOOK", textbookId: { in: textbookIds } },
          _count: { _all: true },
          _avg: { rating: true },
        })
      : Promise.resolve([] as any[]),
    prisma.review.findMany({
      where: {
        isApproved: true,
        OR: [
          ...(courseIds.length ? [{ productType: "COURSE" as const, courseId: { in: courseIds } }] : []),
          ...(textbookIds.length ? [{ productType: "TEXTBOOK" as const, textbookId: { in: textbookIds } }] : []),
        ],
      },
      orderBy: [{ createdAt: "desc" }],
      take: 40,
      select: {
        id: true,
        productType: true,
        courseId: true,
        textbookId: true,
        authorName: true,
        rating: true,
        content: true,
        createdAt: true,
      },
    }),
  ]);

  const courseAggMap = new Map<string, { count: number; avg: number }>(
    courseReviewAgg
      .filter((r) => typeof r.courseId === "string" && r.courseId)
      .map((r) => [
        r.courseId as string,
        { count: Number(r._count?._all ?? 0), avg: Number(r._avg?.rating ?? 0) },
      ])
  );
  const textbookAggMap = new Map<string, { count: number; avg: number }>(
    textbookReviewAgg
      .filter((r) => typeof r.textbookId === "string" && r.textbookId)
      .map((r) => [
        r.textbookId as string,
        { count: Number(r._count?._all ?? 0), avg: Number(r._avg?.rating ?? 0) },
      ])
  );

  const courseTitleById = new Map(publishedCourses.map((c) => [c.id, c.title] as const));
  const textbookTitleById = new Map(publishedTextbooks.map((t) => [t.id, t.title] as const));

  const totalReviewCount =
    Array.from(courseAggMap.values()).reduce((s, x) => s + x.count, 0) +
    Array.from(textbookAggMap.values()).reduce((s, x) => s + x.count, 0);
  const totalWeightedSum =
    Array.from(courseAggMap.values()).reduce((s, x) => s + x.avg * x.count, 0) +
    Array.from(textbookAggMap.values()).reduce((s, x) => s + x.avg * x.count, 0);
  const totalAvg = totalReviewCount > 0 ? totalWeightedSum / totalReviewCount : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight">후기 관리</h1>
          <p className="mt-2 text-white/50">새로 등록되는 후기가 실시간으로 갱신됩니다.</p>
        </div>

        {/* 요약 (대시보드에서 옮겨옴) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">판매중 상품(공개)</p>
            <p className="text-[28px] font-bold">{publishedCourses.length + publishedTextbooks.length}</p>
            <p className="mt-1 text-[12px] text-white/35">강좌 {publishedCourses.length} · 교재 {publishedTextbooks.length}</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">승인된 후기</p>
            <p className="text-[28px] font-bold">{totalReviewCount}</p>
            <p className="mt-1 text-[12px] text-white/35">판매중 상품 기준</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">평균 평점</p>
            <p className="text-[28px] font-bold">{fmtRating(totalAvg)}</p>
            <p className="mt-1 text-[12px] text-white/35">가중 평균</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">바로가기</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/admin/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-[13px] text-white/85 hover:bg-white/[0.1]"
              >
                강좌 관리
              </Link>
              <Link
                href="/admin/textbooks"
                className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-[13px] text-white/85 hover:bg-white/[0.1]"
              >
                교재 관리
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold">판매중 강좌 · 후기 현황</h2>
              <Link href="/admin/courses" className="text-[13px] text-white/60 hover:text-white/80">
                강좌 관리
              </Link>
            </div>
            <div className="space-y-2">
              {publishedCourses.length === 0 ? (
                <p className="text-sm text-white/50">공개(판매중) 강좌가 없습니다.</p>
              ) : (
                publishedCourses.map((c) => {
                  const agg = courseAggMap.get(c.id) ?? { count: 0, avg: 0 };
                  return (
                    <Link
                      key={c.id}
                      href={`/admin/course/${c.id}?tab=settings`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-white/90 font-medium">{c.title}</p>
                        <p className="mt-1 truncate text-[12px] text-white/40">
                          {(c.subjectName || "강좌")} · {(c.teacherName || "선생님")} · 업데이트 {fmtDate(c.updatedAt)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] text-white/80">{fmtRating(agg.avg)} / 5</p>
                        <p className="text-[12px] text-white/40">후기 {agg.count}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold">판매중 교재 · 후기 현황</h2>
              <Link href="/admin/textbooks" className="text-[13px] text-white/60 hover:text-white/80">
                교재 관리
              </Link>
            </div>
            <div className="space-y-2">
              {publishedTextbooks.length === 0 ? (
                <p className="text-sm text-white/50">공개(판매중) 교재가 없습니다.</p>
              ) : (
                publishedTextbooks.map((t) => {
                  const agg = textbookAggMap.get(t.id) ?? { count: 0, avg: 0 };
                  return (
                    <Link
                      key={t.id}
                      href={`/admin/textbook/${t.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-white/90 font-medium">{t.title}</p>
                        <p className="mt-1 truncate text-[12px] text-white/40">
                          {(t.subjectName || "교재")} · {(t.teacherName || "선생님")} · 업데이트 {fmtDate(t.updatedAt)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] text-white/80">{fmtRating(agg.avg)} / 5</p>
                        <p className="text-[12px] text-white/40">후기 {agg.count}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold">최근 작성된 후기 (판매중 상품)</h2>
            <Link href="/admin/reviews" className="text-[13px] text-white/60 hover:text-white/80">
              전체 보기
            </Link>
          </div>
          {recentReviews.length === 0 ? (
            <p className="text-sm text-white/50">표시할 후기가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentReviews.map((r) => {
                const isCourse = r.productType === "COURSE";
                const productId = isCourse ? r.courseId : r.textbookId;
                const title = isCourse
                  ? (productId ? courseTitleById.get(productId) : null)
                  : (productId ? textbookTitleById.get(productId) : null);
                const href = isCourse
                  ? (productId ? `/admin/course/${productId}?tab=settings` : "/admin/courses")
                  : (productId ? `/admin/textbook/${productId}` : "/admin/textbooks");
                return (
                  <Link
                    key={r.id}
                    href={href}
                    className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] text-white/50">
                          {isCourse ? "강좌" : "교재"} · {fmtDate(r.createdAt)}
                        </p>
                        <p className="mt-1 truncate text-[14px] font-semibold text-white/90">
                          {title || "상품"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] text-white/80">★ {r.rating}</p>
                        <p className="text-[12px] text-white/40">{r.authorName}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] text-white/75 leading-relaxed line-clamp-3">
                      {r.content}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <ReviewsAdminClient />
      </div>
    </AppShell>
  );
}


