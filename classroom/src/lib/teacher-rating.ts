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

export async function getTeacherRatingSummaryByName(teacherNameRaw: string): Promise<TeacherRatingSummary> {
  const teacherName = (teacherNameRaw || "").trim();
  if (!teacherName) {
    return { reviewCount: 0, avgRating: 0, recentReviews: [] };
  }

  // 1) 선생님 이름 기반으로 강의/교재 id 수집 (teacherName 필드 또는 owner(User).name 기준)
  const [courses, textbooks] = await Promise.all([
    prisma.course.findMany({
      where: {
        OR: [{ teacherName: { contains: teacherName } }, { owner: { name: { contains: teacherName } } }],
      },
      select: { id: true },
    }),
    prisma.textbook.findMany({
      where: {
        OR: [{ teacherName: { contains: teacherName } }, { owner: { name: { contains: teacherName } } }],
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


