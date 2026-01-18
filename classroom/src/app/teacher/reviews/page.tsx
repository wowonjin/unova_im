import AppShell from "@/app/_components/AppShell";
import { PageHeader, Card, CardBody } from "@/app/_components/ui";
import { getCurrentUser, getTeacherAccountByUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TeacherReviewsClient, { type TeacherReviewItem } from "./TeacherReviewsClient";

export const dynamic = "force-dynamic";

export default async function TeacherReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fteacher%2Freviews");
  const teacher = await getTeacherAccountByUserId(user.id);
  if (!teacher) {
    return (
      <AppShell>
        <PageHeader title="선생님 콘솔" description="이 계정은 아직 선생님 계정으로 연결되지 않았습니다." />
        <div className="mt-6">
          <Card>
            <CardBody>
              <p className="text-sm text-white/70">관리자에게 선생님 계정 연결을 요청해주세요.</p>
              <p className="mt-3 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/85">{user.email}</p>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    );
  }

  // NOTE:
  // 스토어 후기(Review)는 Course/Textbook의 ownerId(판매 등록 계정)와 무관하게
  // teacherName 기반으로 선생님에게 귀속되는 경우가 많습니다.
  // 따라서 선생님 콘솔(/teacher/reviews)은 "내 계정이 owner"가 아니라
  // Teacher.accountUserId로 연결된 Teacher.name과 상품의 teacherName 매칭으로 리뷰를 조회합니다.
  const teacherNameKey = (teacher.teacherName || "").replace(/선생님/g, "").trim();
  const teacherNameCandidates = Array.from(
    new Set(
      [teacherNameKey, `${teacherNameKey} 선생님`, `${teacherNameKey}선생님`]
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );

  const whereBase = { isApproved: true } as const;
  const whereExact = teacherNameCandidates.length
    ? {
        ...whereBase,
        OR: [
          { course: { OR: teacherNameCandidates.map((t) => ({ teacherName: { equals: t, mode: "insensitive" as const } })) } },
          {
            textbook: { OR: teacherNameCandidates.map((t) => ({ teacherName: { equals: t, mode: "insensitive" as const } })) },
          },
        ],
      }
    : { ...whereBase };

  let reviews = await prisma.review.findMany({
    where: whereExact as any,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      authorName: true,
      rating: true,
      content: true,
      createdAt: true,
      teacherReply: true,
      teacherReplyAt: true,
      course: { select: { id: true, title: true, teacherName: true, ownerId: true } },
      textbook: { select: { id: true, title: true, teacherName: true, ownerId: true } },
    },
    take: 100,
  });

  // 폴백: exact 매칭이 하나도 없으면 contains로 한번 더(레거시 표기/공백 차이 대비)
  if (reviews.length === 0 && teacherNameKey) {
    reviews = await prisma.review.findMany({
      where: {
        ...whereBase,
        OR: [
          { course: { teacherName: { contains: teacherNameKey, mode: "insensitive" } } },
          { textbook: { teacherName: { contains: teacherNameKey, mode: "insensitive" } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        authorName: true,
        rating: true,
        content: true,
        createdAt: true,
        teacherReply: true,
        teacherReplyAt: true,
        course: { select: { id: true, title: true, teacherName: true, ownerId: true } },
        textbook: { select: { id: true, title: true, teacherName: true, ownerId: true } },
      },
      take: 100,
    });
  }

  const items: TeacherReviewItem[] = reviews.map((r) => {
    const productTitle = r.course?.title ?? r.textbook?.title ?? "상품";
    const productType = r.course ? "강좌" : "교재";
    return {
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      content: r.content,
      createdAtISO: r.createdAt.toISOString(),
      productType,
      productTitle,
      teacherReply: r.teacherReply ?? null,
      teacherReplyAtISO: r.teacherReplyAt ? r.teacherReplyAt.toISOString() : null,
    };
  });

  return (
    <AppShell>
      <PageHeader title="내 리뷰" description="내 상품에 달린 최신 리뷰를 확인하세요." />

      <div className="mt-6">
        <Card className="bg-transparent">
          <CardBody>
            <TeacherReviewsClient reviews={items} />
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

