import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ToggleSchema = z.object({
  productType: z.enum(["COURSE", "TEXTBOOK"]),
  productId: z.string().min(1),
  visitorId: z.string().min(1), // 브라우저에서 생성한 고유 ID
});

// POST: 좋아요 토글
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = ToggleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { productType, productId, visitorId } = parsed.data;

  // 현재 로그인한 사용자가 있으면 userId 연결
  const user = await getCurrentUser();
  const userId = user?.id || null;

  // 기존 좋아요 확인
  const existingLike = await prisma.productLike.findFirst({
    where: {
      productType,
      ...(productType === "COURSE" ? { courseId: productId } : { textbookId: productId }),
      visitorId,
    },
  });

  let isLiked: boolean;
  let likeCount: number;

  if (existingLike) {
    // 좋아요 취소
    await prisma.productLike.delete({
      where: { id: existingLike.id },
    });
    isLiked = false;
  } else {
    // 좋아요 추가
    await prisma.productLike.create({
      data: {
        productType,
        courseId: productType === "COURSE" ? productId : null,
        textbookId: productType === "TEXTBOOK" ? productId : null,
        visitorId,
        userId,
      },
    });
    isLiked = true;
  }

  // 좋아요 수 계산
  likeCount = await prisma.productLike.count({
    where: {
      productType,
      ...(productType === "COURSE" ? { courseId: productId } : { textbookId: productId }),
    },
  });

  // 상품 likeCount 업데이트
  if (productType === "COURSE") {
    await prisma.course.update({
      where: { id: productId },
      data: { likeCount },
    });
  } else {
    await prisma.textbook.update({
      where: { id: productId },
      data: { likeCount },
    });
  }

  return NextResponse.json({ ok: true, isLiked, likeCount });
}

