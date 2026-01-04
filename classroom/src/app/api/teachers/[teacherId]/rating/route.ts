import { NextResponse } from "next/server";
import { z } from "zod";
import { getTeacherRatingSummary } from "@/lib/teacher-rating";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const QuerySchema = z.object({
  name: z.string().optional(),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ teacherId: string }> }
) {
  const { teacherId } = await ctx.params;
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ name: url.searchParams.get("name") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ ok: true, summary: { reviewCount: 0, avgRating: 0, recentReviews: [] } });
  }

  // 가능한 경우: teacherId(slug)로 Teacher를 찾아 name을 확보 → slug+name 함께 매칭
  // (레거시로 강의/교재 teacherName 칸에 slug("lsy")를 저장한 케이스도 커버)
  const dbTeacher = await prisma.teacher.findUnique({
    where: { slug: teacherId },
    select: { name: true },
  });
  const teacherName = (dbTeacher?.name || parsed.data.name || "").trim();

  const summary = await getTeacherRatingSummary({
    teacherSlug: teacherId,
    teacherName,
  });

  return NextResponse.json({
    ok: true,
    summary: {
      reviewCount: summary.reviewCount,
      avgRating: summary.avgRating,
      recentReviews: summary.recentReviews.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
        productType: r.productType,
      })),
    },
  });
}


