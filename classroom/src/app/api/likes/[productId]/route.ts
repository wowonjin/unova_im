import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  productId: z.string().min(1),
});

// GET: 좋아요 상태 및 수 조회
export async function GET(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  const { productId } = ParamsSchema.parse(await ctx.params);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "COURSE";
  const visitorId = url.searchParams.get("visitorId") || "";

  const productType = type === "TEXTBOOK" ? "TEXTBOOK" : "COURSE";

  // 좋아요 수
  const likeCount = await prisma.productLike.count({
    where: {
      productType,
      ...(productType === "COURSE" ? { courseId: productId } : { textbookId: productId }),
    },
  });

  // 현재 방문자의 좋아요 여부
  let isLiked = false;
  if (visitorId) {
    const existingLike = await prisma.productLike.findFirst({
      where: {
        productType,
        ...(productType === "COURSE" ? { courseId: productId } : { textbookId: productId }),
        visitorId,
      },
    });
    isLiked = !!existingLike;
  }

  return NextResponse.json({ ok: true, isLiked, likeCount });
}

