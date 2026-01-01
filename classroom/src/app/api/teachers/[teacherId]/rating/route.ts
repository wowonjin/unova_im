import { NextResponse } from "next/server";
import { z } from "zod";
import { getTeacherRatingSummaryByName } from "@/lib/teacher-rating";

export const runtime = "nodejs";

const QuerySchema = z.object({
  name: z.string().min(1),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ name: url.searchParams.get("name") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ ok: true, summary: { reviewCount: 0, avgRating: 0, recentReviews: [] } });
  }

  const summary = await getTeacherRatingSummaryByName(parsed.data.name);

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


