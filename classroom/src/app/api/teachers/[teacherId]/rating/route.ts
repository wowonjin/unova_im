import { NextResponse } from "next/server";
import { z } from "zod";
import { getTeacherRatingSummary } from "@/lib/teacher-rating";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const QuerySchema = z.object({
  name: z.string().optional(),
});

type RatingSummaryPayload = {
  ok: true;
  summary: {
    reviewCount: number;
    avgRating: number;
    recentReviews: Array<{
      id: string;
      authorName: string;
      rating: number;
      content: string;
      createdAt: string;
      productType: "COURSE" | "TEXTBOOK";
    }>;
  };
};

const CACHE_TTL_MS = 60_000;
let cache = new Map<string, { payload: RatingSummaryPayload; expiresAt: number }>();

export async function GET(
  req: Request,
  ctx: { params: Promise<{ teacherId: string }> }
) {
  const { teacherId } = await ctx.params;

  const nowMs = Date.now();
  const cached = cache.get(teacherId);
  if (cached && cached.expiresAt > nowMs) {
    const res = NextResponse.json(cached.payload);
    res.headers.set("cache-control", "public, max-age=60, stale-while-revalidate=300");
    return res;
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ name: url.searchParams.get("name") ?? undefined });
  if (!parsed.success) {
    const payload: RatingSummaryPayload = {
      ok: true,
      summary: { reviewCount: 0, avgRating: 0, recentReviews: [] },
    };
    const res = NextResponse.json(payload);
    res.headers.set("cache-control", "public, max-age=60, stale-while-revalidate=300");
    cache.set(teacherId, { payload, expiresAt: nowMs + CACHE_TTL_MS });
    return res;
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

  const payload: RatingSummaryPayload = {
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
  };

  cache.set(teacherId, { payload, expiresAt: nowMs + CACHE_TTL_MS });
  const res = NextResponse.json(payload);
  res.headers.set("cache-control", "public, max-age=60, stale-while-revalidate=300");
  return res;
}


