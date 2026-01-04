import { prisma } from "@/lib/prisma";

export type TeacherRecentReview = {
  id: string;
  authorName: string;
  rating: number;
  content: string;
  createdAt: Date;
  productType: "COURSE" | "TEXTBOOK";
};

export type TeacherRatingSummary = {
  reviewCount: number;
  avgRating: number;
  recentReviews: TeacherRecentReview[];
};

export async function getTeacherRatingSummary(params: {
  teacherName?: string;
  teacherSlug?: string;
}): Promise<TeacherRatingSummary> {
  const teacherName = (params.teacherName || "").trim();
  const teacherSlug = (params.teacherSlug || "").trim();
  const tokens = Array.from(new Set([teacherName, teacherSlug].map((s) => s.trim()).filter(Boolean)));

  if (tokens.length === 0) {
    return { reviewCount: 0, avgRating: 0, recentReviews: [] };
  }

  // 1) 선생님 식별자 기반으로 강의/교재 id 수집
  // - teacherName: 일반적으로 "이상엽" 같은 표시 이름
  // - teacherSlug: 운영/레거시에서 teacherName 칸에 slug("lsy")를 넣어둔 케이스도 커버
  const [courses, textbooks] = await Promise.all([
    prisma.course.findMany({
      where: {
        OR: [
          ...tokens.map((t) => ({ teacherName: { contains: t, mode: "insensitive" as const } })),
          ...(teacherName ? [{ owner: { name: { contains: teacherName, mode: "insensitive" as const } } }] : []),
        ],
      },
      select: { id: true },
    }),
    prisma.textbook.findMany({
      where: {
        OR: [
          ...tokens.map((t) => ({ teacherName: { contains: t, mode: "insensitive" as const } })),
          ...(teacherName ? [{ owner: { name: { contains: teacherName, mode: "insensitive" as const } } }] : []),
        ],
      },
      select: { id: true },
    }),
  ]);

  const courseIds = courses.map((c) => c.id);
  const textbookIds = textbooks.map((t) => t.id);

  if (courseIds.length === 0 && textbookIds.length === 0) {
    return { reviewCount: 0, avgRating: 0, recentReviews: [] };
  }

  const where = {
    isApproved: true,
    // NOTE: 운영 중 테스트 리뷰(스크린샷의 "교재 리뷰 테스트 1~3")가 집계/표시에 섞이지 않도록 제외
    // (해당 리뷰는 실제 DB에 존재할 수 있으므로, 여기서 명시적으로 필터링)
    AND: [
      // authorName 기반(테스터, test 등)
      { NOT: { authorName: { startsWith: "테스터" } } },
      { NOT: { authorName: { contains: "test", mode: "insensitive" as const } } },
      // content 기반(리뷰 테스트, test 등)
      { NOT: { content: { contains: "리뷰 테스트" } } },
      { NOT: { content: { contains: "test", mode: "insensitive" as const } } },
    ],
    OR: [
      ...(courseIds.length ? [{ productType: "COURSE" as const, courseId: { in: courseIds } }] : []),
      ...(textbookIds.length ? [{ productType: "TEXTBOOK" as const, textbookId: { in: textbookIds } }] : []),
    ],
  };

  // 2) 총 카운트/평균
  const [count, avgAgg, recent] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, authorName: true, rating: true, content: true, createdAt: true, productType: true },
    }),
  ]);

  return {
    reviewCount: count,
    avgRating: avgAgg._avg.rating || 0,
    recentReviews: recent,
  };
}

export async function getTeacherRatingSummaryByName(teacherNameRaw: string): Promise<TeacherRatingSummary> {
  return getTeacherRatingSummary({ teacherName: teacherNameRaw });
}


