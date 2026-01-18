import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  productId: z.string().min(1),
});

// GET: 상품 후기 목록 조회
export async function GET(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = ParamsSchema.parse(await ctx.params);
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "COURSE";
    const sort = url.searchParams.get("sort") || "latest";
    const photoOnly = url.searchParams.get("photoOnly") === "1";
    const verifiedOnly = url.searchParams.get("verifiedOnly") === "1";
    const visitorId = url.searchParams.get("visitorId") || null;
    const viewer = await getCurrentUser();
    const viewerUserId = viewer?.id || null;

    const reviews = await prisma.review.findMany({
      where: {
        productType: type === "TEXTBOOK" ? "TEXTBOOK" : "COURSE",
        ...(type === "TEXTBOOK" ? { textbookId: productId } : { courseId: productId }),
        isApproved: true,
      },
      select: {
        id: true,
        authorName: true,
        rating: true,
        content: true,
        imageUrls: true,
        createdAt: true,
        userId: true,
        _count: { select: { helpfuls: true } },
      },
    });

    const totalCount = reviews.length;
    const ratingCounts = [0, 0, 0, 0, 0];
    let photoCount = 0;
    for (const r of reviews) {
      const score = Math.max(1, Math.min(5, Math.round(r.rating)));
      ratingCounts[score - 1] += 1;
      const imgs = (r.imageUrls as string[] | null) || [];
      if (imgs.length > 0) photoCount += 1;
    }
    const averageRating =
      totalCount > 0 ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount) * 10) / 10 : 0;

    const normalized = reviews.map((r) => ({
      id: r.id,
      name: r.authorName,
      rating: r.rating,
      content: r.content,
      imageUrls: (r.imageUrls as string[] | null) || [],
      date: r.createdAt.toISOString().slice(0, 10).replace(/-/g, "."),
      userId: r.userId,
      helpfulCount: r._count.helpfuls ?? 0,
    }));

    let filtered = normalized;
    if (photoOnly) {
      filtered = filtered.filter((r) => r.imageUrls.length > 0);
    }

    if (sort === "rating") {
      filtered = [...filtered].sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.date.localeCompare(a.date);
      });
    } else if (sort === "helpful") {
      filtered = [...filtered].sort((a, b) => {
        if ((b.helpfulCount ?? 0) !== (a.helpfulCount ?? 0)) {
          return (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0);
        }
        return b.date.localeCompare(a.date);
      });
    } else {
      filtered = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    }

    filtered = filtered.slice(0, 100);

    const reviewIds = filtered.map((r) => r.id);
    const userIds = Array.from(new Set(filtered.map((r) => r.userId).filter(Boolean))) as string[];
    let verifiedBuyerIds = new Set<string>();
    if (userIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: {
          userId: { in: userIds },
          status: "COMPLETED",
          ...(type === "TEXTBOOK" ? { textbookId: productId } : { courseId: productId }),
        },
        select: { userId: true },
      });
      verifiedBuyerIds = new Set(orders.map((o) => o.userId));
    }
    const verifiedCount = normalized.reduce((acc, r) => (r.userId && verifiedBuyerIds.has(r.userId) ? acc + 1 : acc), 0);

    let helpfulByViewer = new Set<string>();
    if (reviewIds.length > 0 && (viewerUserId || visitorId)) {
      const helpfulRows = await prisma.reviewHelpful.findMany({
        where: {
          reviewId: { in: reviewIds },
          ...(viewerUserId ? { userId: viewerUserId } : { visitorId }),
        },
        select: { reviewId: true },
      });
      helpfulByViewer = new Set(helpfulRows.map((r) => r.reviewId));
    }

    const formatted = filtered.map((r) => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      content: r.content,
      imageUrls: r.imageUrls,
      date: r.date,
      helpfulCount: r.helpfulCount,
      isHelpful: helpfulByViewer.has(r.id),
      isVerifiedBuyer: r.userId ? verifiedBuyerIds.has(r.userId) : false,
    }));

    if (verifiedOnly) {
      const verifiedIds = new Set(formatted.filter((r) => r.isVerifiedBuyer).map((r) => r.id));
      const next = formatted.filter((r) => verifiedIds.has(r.id));
      return NextResponse.json({
        ok: true,
        summary: {
          totalCount,
          averageRating,
          ratingCounts,
          photoCount,
          verifiedCount,
        },
        reviews: next,
      });
    }

    return NextResponse.json({
      ok: true,
      summary: {
        totalCount,
        averageRating,
        ratingCounts,
        photoCount,
        verifiedCount,
      },
      reviews: formatted,
    });
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    // 에러가 발생해도 빈 배열 반환
    return NextResponse.json({
      ok: true,
      reviews: [],
      summary: { totalCount: 0, averageRating: 0, ratingCounts: [0, 0, 0, 0, 0], photoCount: 0, verifiedCount: 0 },
    });
  }
}

