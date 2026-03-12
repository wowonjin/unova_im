import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).optional(),
});

function maskAuthorName(name: string | null | undefined): string {
  const chars = Array.from(String(name ?? "").trim());
  if (chars.length <= 1) return chars[0] ?? "유";
  return `${chars[0]}${"*".repeat(chars.length - 1)}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
    });
    const limit = parsed.success ? parsed.data.limit ?? 8 : 8;

    const reviews = await prisma.review.findMany({
      where: {
        isApproved: true,
        OR: [{ courseId: { not: null } }, { textbookId: { not: null } }],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        authorName: true,
        rating: true,
        content: true,
        createdAt: true,
        productType: true,
        courseId: true,
        textbookId: true,
        course: {
          select: {
            title: true,
            teacherName: true,
            rating: true,
          },
        },
        textbook: {
          select: {
            title: true,
            teacherName: true,
            rating: true,
          },
        },
      },
    });

    const payload = reviews
      .filter((review) =>
        review.productType === "COURSE"
          ? typeof review.courseId === "string" && review.courseId.length > 0
          : typeof review.textbookId === "string" && review.textbookId.length > 0
      )
      .map((review) => ({
        id: review.id,
        authorName: maskAuthorName(review.authorName),
        rating: review.rating,
        content: review.content,
        createdAtISO: review.createdAt.toISOString(),
        productType: review.productType,
        productId: review.productType === "COURSE" ? review.courseId : review.textbookId,
        productTitle:
          review.productType === "COURSE"
            ? review.course?.title || "강의"
            : review.textbook?.title || "교재",
        teacherName:
          review.productType === "COURSE"
            ? review.course?.teacherName || "선생님"
            : review.textbook?.teacherName || "선생님",
        productRating:
          review.productType === "COURSE"
            ? review.course?.rating ?? review.rating
            : review.textbook?.rating ?? review.rating,
      }));

    return NextResponse.json(
      { ok: true, reviews: payload },
      {
        headers: {
          "cache-control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[recent-course-reviews] failed to load:", error);
    return NextResponse.json(
      { ok: true, reviews: [] },
      {
        headers: {
          "cache-control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
