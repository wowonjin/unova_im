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
    // NOTE: 운영 DB가 스키마 누락(예: ReviewHelpful/ReviewReport 테이블 없음) 상태여도
    // 후기 목록 자체는 보여줄 수 있어야 합니다. viewer 조회도 실패할 수 있어 안전하게 처리합니다.
    let viewerUserId: string | null = null;
    try {
      const viewer = await getCurrentUser();
      viewerUserId = viewer?.id || null;
    } catch {
      viewerUserId = null;
    }

    const reviews = await prisma.review.findMany({
      where: {
        productType: type === "TEXTBOOK" ? "TEXTBOOK" : "COURSE",
        ...(type === "TEXTBOOK" ? { textbookId: productId } : { courseId: productId }),
        isApproved: true,
      },
      // Stable ordering: ensure newest reviews appear first even when multiple reviews share the same date.
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        authorName: true,
        rating: true,
        content: true,
        imageUrls: true,
        createdAt: true,
        userId: true,
        teacherReply: true,
        teacherReplyAt: true,
        teacherReplyIsSecret: true,
        teacherReplyReadAt: true,
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

    const reviewIds = reviews.map((r) => r.id);
    const userIds = Array.from(new Set(reviews.map((r) => r.userId).filter(Boolean))) as string[];

    // helpfulCount: ReviewHelpful 테이블이 없을 수 있으므로 best-effort로만 계산
    const helpfulCountByReviewId = new Map<string, number>();
    if (reviewIds.length > 0) {
      try {
        const rows = await prisma.reviewHelpful.groupBy({
          by: ["reviewId"],
          where: { reviewId: { in: reviewIds } },
          _count: { _all: true },
        });
        for (const row of rows) {
          helpfulCountByReviewId.set(row.reviewId, row._count._all ?? 0);
        }
      } catch {
        // ignore (missing table or restricted DB)
      }
    }

    const normalized = reviews.map((r) => {
      const isSecret = Boolean((r as any).teacherReplyIsSecret);
      const canViewTeacherReply = Boolean(viewerUserId) && Boolean(r.userId) && r.userId === viewerUserId;
      const shouldMask = isSecret && !canViewTeacherReply;
      return {
      id: r.id,
      name: r.authorName,
      rating: r.rating,
      content: r.content,
      imageUrls: (r.imageUrls as string[] | null) || [],
      date: r.createdAt.toISOString().slice(0, 10).replace(/-/g, "."),
      createdAtISO: r.createdAt.toISOString(),
      userId: r.userId,
      helpfulCount: helpfulCountByReviewId.get(r.id) ?? 0,
      teacherReplyIsSecret: isSecret,
      canViewTeacherReply,
      teacherReply: shouldMask ? null : (r.teacherReply ?? null),
      teacherReplyAtISO: shouldMask ? null : (r.teacherReplyAt ? r.teacherReplyAt.toISOString() : null),
      teacherReplyReadAtISO: r.teacherReplyReadAt ? r.teacherReplyReadAt.toISOString() : null,
      };
    });

    let filtered = normalized;
    if (photoOnly) {
      filtered = filtered.filter((r) => r.imageUrls.length > 0);
    }

    if (sort === "rating") {
      filtered = [...filtered].sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.createdAtISO.localeCompare(a.createdAtISO);
      });
    } else if (sort === "helpful") {
      filtered = [...filtered].sort((a, b) => {
        if ((b.helpfulCount ?? 0) !== (a.helpfulCount ?? 0)) {
          return (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0);
        }
        return b.createdAtISO.localeCompare(a.createdAtISO);
      });
    } else {
      filtered = [...filtered].sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
    }

    filtered = filtered.slice(0, 100);

    let verifiedBuyerIds = new Set<string>();
    if (userIds.length > 0) {
      try {
        const orders = await prisma.order.findMany({
          where: {
            userId: { in: userIds },
            status: "COMPLETED",
            ...(type === "TEXTBOOK" ? { textbookId: productId } : { courseId: productId }),
          },
          select: { userId: true },
        });
        verifiedBuyerIds = new Set(orders.map((o) => o.userId));
      } catch {
        verifiedBuyerIds = new Set<string>();
      }
    }
    const verifiedCount = normalized.reduce((acc, r) => (r.userId && verifiedBuyerIds.has(r.userId) ? acc + 1 : acc), 0);

    let helpfulByViewer = new Set<string>();
    if (reviewIds.length > 0 && (viewerUserId || visitorId)) {
      try {
        const helpfulRows = await prisma.reviewHelpful.findMany({
          where: {
            reviewId: { in: reviewIds },
            ...(viewerUserId ? { userId: viewerUserId } : { visitorId }),
          },
          select: { reviewId: true },
        });
        helpfulByViewer = new Set(helpfulRows.map((r) => r.reviewId));
      } catch {
        helpfulByViewer = new Set<string>();
      }
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
      teacherReply: r.teacherReply,
      teacherReplyAtISO: r.teacherReplyAtISO,
      teacherReplyIsSecret: r.teacherReplyIsSecret,
      canViewTeacherReply: r.canViewTeacherReply,
      teacherReplyReadAtISO: r.teacherReplyReadAtISO,
    }));

    if (verifiedOnly) {
      const verifiedIds = new Set(formatted.filter((r) => r.isVerifiedBuyer).map((r) => r.id));
      const next = formatted.filter((r) => verifiedIds.has(r.id));
      // 답글을 실제로 확인할 수 있는(=작성자) 경우에만 "읽음 처리"
      if (viewerUserId) {
        const toMark = next
          .filter((r) => r.canViewTeacherReply && r.teacherReplyAtISO && !r.teacherReplyReadAtISO)
          .map((r) => r.id);
        if (toMark.length > 0) {
          try {
            await prisma.review.updateMany({
              where: { id: { in: toMark }, userId: viewerUserId },
              data: { teacherReplyReadAt: new Date() },
            });
          } catch {
            // ignore
          }
        }
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
        reviews: next,
      });
    }

    // 답글을 실제로 확인할 수 있는(=작성자) 경우에만 "읽음 처리"
    if (viewerUserId) {
      const toMark = formatted
        .filter((r) => r.canViewTeacherReply && r.teacherReplyAtISO && !r.teacherReplyReadAtISO)
        .map((r) => r.id);
      if (toMark.length > 0) {
        try {
          await prisma.review.updateMany({
            where: { id: { in: toMark }, userId: viewerUserId },
            data: { teacherReplyReadAt: new Date() },
          });
        } catch {
          // ignore
        }
      }
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

