import AppShell from "@/app/_components/AppShell";
import { PageHeader, Card, CardBody, Badge } from "@/app/_components/ui";
import { requireTeacherAccountUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherReviewsPage() {
  const { user } = await requireTeacherAccountUser();

  const reviews = await prisma.review.findMany({
    where: {
      isApproved: true,
      OR: [{ course: { ownerId: user.id } }, { textbook: { ownerId: user.id } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      authorName: true,
      rating: true,
      content: true,
      createdAt: true,
      course: { select: { id: true, title: true } },
      textbook: { select: { id: true, title: true } },
    },
    take: 100,
  });

  return (
    <AppShell>
      <PageHeader title="내 리뷰" description="내 상품에 달린 최신 리뷰를 확인하세요." />

      <div className="mt-6">
        <Card>
          <CardBody>
            {reviews.length === 0 ? (
              <p className="text-sm text-white/50">아직 리뷰가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => {
                  const productTitle = r.course?.title ?? r.textbook?.title ?? "상품";
                  const productType = r.course ? "강좌" : "교재";
                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="muted">{productType}</Badge>
                            <p className="truncate text-sm font-semibold text-white/90">{productTitle}</p>
                          </div>
                          <p className="mt-1 text-xs text-white/45">
                            {r.createdAt.toISOString().slice(0, 10).replace(/-/g, ".")} · {r.authorName} · {r.rating}점
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-white/70 leading-relaxed">{r.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

