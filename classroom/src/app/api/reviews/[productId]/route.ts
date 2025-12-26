import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

    const reviews = await prisma.review.findMany({
      where: {
        productType: type === "TEXTBOOK" ? "TEXTBOOK" : "COURSE",
        ...(type === "TEXTBOOK" ? { textbookId: productId } : { courseId: productId }),
        isApproved: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        authorName: true,
        rating: true,
        content: true,
        imageUrls: true,
        createdAt: true,
      },
      take: 100,
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      name: r.authorName,
      rating: r.rating,
      content: r.content,
      imageUrls: (r.imageUrls as string[] | null) || [],
      date: r.createdAt.toISOString().slice(0, 10).replace(/-/g, "."),
    }));

    return NextResponse.json({ ok: true, reviews: formatted });
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    // 에러가 발생해도 빈 배열 반환
    return NextResponse.json({ ok: true, reviews: [] });
  }
}

