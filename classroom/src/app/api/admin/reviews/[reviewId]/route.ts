import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { z } from "zod";

export const runtime = "nodejs";

const ParamsSchema = z.object({ reviewId: z.string().min(1) });

async function recalcProductReviewStats(args: {
  productType: "COURSE" | "TEXTBOOK";
  courseId: string | null;
  textbookId: string | null;
}) {
  const { productType, courseId, textbookId } = args;
  const productId = productType === "COURSE" ? courseId : textbookId;
  if (!productId) return;

  const where = {
    productType,
    ...(productType === "COURSE" ? { courseId: productId } : { textbookId: productId }),
    isApproved: true,
  } as const;

  const reviewCount = await prisma.review.count({ where });
  const avgResult = await prisma.review.aggregate({ where, _avg: { rating: true } });
  const avgRating = avgResult._avg.rating || 0;

  if (productType === "COURSE") {
    await prisma.course.update({
      where: { id: productId },
      data: { reviewCount, rating: avgRating },
    });
  } else {
    await prisma.textbook.update({
      where: { id: productId },
      data: { reviewCount, rating: avgRating },
    });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ reviewId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { reviewId } = ParamsSchema.parse(await ctx.params);

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productType: true, courseId: true, textbookId: true },
  });
  if (!review) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  await prisma.review.delete({ where: { id: reviewId } });
  await recalcProductReviewStats({
    productType: review.productType,
    courseId: review.courseId,
    textbookId: review.textbookId,
  });

  return NextResponse.json({ ok: true });
}


