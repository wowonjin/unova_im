import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const CreateSchema = z.object({
  productType: z.enum(["COURSE", "TEXTBOOK"]),
  productId: z.string().min(1),
  authorName: z.string().min(1).max(50),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1).max(2000),
  imageUrls: z.array(z.string()).optional(),
});

// POST: 후기 작성 (로그인 불필요)
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR", details: parsed.error.errors }, { status: 400 });
  }

  const { productType, productId, authorName, rating, content, imageUrls } = parsed.data;

  // 상품 존재 확인
  if (productType === "COURSE") {
    const course = await prisma.course.findUnique({ where: { id: productId }, select: { id: true } });
    if (!course) {
      return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }
  } else {
    const textbook = await prisma.textbook.findUnique({ where: { id: productId }, select: { id: true } });
    if (!textbook) {
      return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }
  }

  // 현재 로그인한 사용자가 있으면 userId 연결
  const user = await getCurrentUser();
  const userId = user?.id || null;

  const review = await prisma.review.create({
    data: {
      productType,
      courseId: productType === "COURSE" ? productId : null,
      textbookId: productType === "TEXTBOOK" ? productId : null,
      userId,
      authorName,
      rating,
      content,
      imageUrls: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
      isApproved: true, // 기본적으로 바로 노출 (필요시 false로 변경하여 관리자 승인 필요)
    },
  });

  // 해당 상품의 reviewCount 업데이트
  const reviewCount = await prisma.review.count({
    where: {
      productType,
      ...(productType === "COURSE" ? { courseId: productId } : { textbookId: productId }),
      isApproved: true,
    },
  });

  // 평균 평점 계산
  const avgResult = await prisma.review.aggregate({
    where: {
      productType,
      ...(productType === "COURSE" ? { courseId: productId } : { textbookId: productId }),
      isApproved: true,
    },
    _avg: { rating: true },
  });
  const avgRating = avgResult._avg.rating || 0;

  // 상품 업데이트
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

  return NextResponse.json({ ok: true, review: { id: review.id } });
}

