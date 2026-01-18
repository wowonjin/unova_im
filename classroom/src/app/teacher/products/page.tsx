import AppShell from "@/app/_components/AppShell";
import { PageHeader, Card, CardBody, Button } from "@/app/_components/ui";
import { requireTeacherAccountUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function storeLink(type: "course" | "textbook", id: string) {
  // 스토어 상세는 id/slug 모두 받지만, 교재는 id 기반이 확실하므로 id로 고정
  return `/store/${encodeURIComponent(id)}`;
}

export default async function TeacherProductsPage() {
  const { user } = await requireTeacherAccountUser();

  const [courses, textbooks] = await Promise.all([
    prisma.course.findMany({
      where: { ownerId: user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, slug: true, isPublished: true, isSoldOut: true, reviewCount: true, rating: true },
      take: 100,
    }),
    prisma.textbook.findMany({
      where: { ownerId: user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, isPublished: true, isSoldOut: true, reviewCount: true, rating: true },
      take: 100,
    }),
  ]);

  return (
    <AppShell>
      <PageHeader title="내 상품" description="스토어 링크와 기본 지표를 확인하세요." />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">강좌</p>
              <p className="text-sm text-white/60">{courses.length.toLocaleString("ko-KR")}개</p>
            </div>
            <div className="mt-4 space-y-2">
              {courses.length === 0 ? (
                <p className="text-sm text-white/50">아직 내 강좌가 없습니다. 관리자에게 상품 할당을 요청하세요.</p>
              ) : (
                courses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white/90">{c.title}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {c.isPublished ? "공개" : "비공개"} · {c.isSoldOut ? "준비중" : "판매중"} · 평점 {(c.rating ?? 0).toFixed(1)} · 후기 {(c.reviewCount ?? 0).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <Button variant="secondary" href={storeLink("course", c.id)}>
                        링크
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">교재</p>
              <p className="text-sm text-white/60">{textbooks.length.toLocaleString("ko-KR")}개</p>
            </div>
            <div className="mt-4 space-y-2">
              {textbooks.length === 0 ? (
                <p className="text-sm text-white/50">아직 내 교재가 없습니다. 관리자에게 상품 할당을 요청하세요.</p>
              ) : (
                textbooks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white/90">{t.title}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {t.isPublished ? "공개" : "비공개"} · {t.isSoldOut ? "준비중" : "판매중"} · 평점 {(t.rating ?? 0).toFixed(1)} · 후기 {(t.reviewCount ?? 0).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Button variant="secondary" href={storeLink("textbook", t.id)}>
                        링크
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

