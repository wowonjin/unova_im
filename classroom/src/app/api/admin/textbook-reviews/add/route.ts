import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  authorName: z.string().min(1),
  rating: z.number().min(1).max(5),
  content: z.string().min(1),
  createdAt: z.string().optional(),
  imageUrls: z.array(z.string().min(1)).optional(),
});

export async function POST(req: Request) {
  const teacher = await requireAdminUser();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }

  const { textbookId, authorName, rating, content, createdAt, imageUrls } = parsed.data;

  // 교재 소유권 확인
  const textbook = await prisma.textbook.findFirst({
    where: { id: textbookId, ownerId: teacher.id },
    select: { id: true },
  });
  if (!textbook) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // 후기 생성
  const review = await prisma.review.create({
    data: {
      productType: "TEXTBOOK",
      textbookId,
      authorName,
      rating,
      content,
      imageUrls: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
      isApproved: true,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    },
    select: { id: true },
  });

  // 교재 평점/리뷰 수 업데이트
  const reviewCount = await prisma.review.count({
    where: { productType: "TEXTBOOK", textbookId, isApproved: true },
  });
  const avgResult = await prisma.review.aggregate({
    where: { productType: "TEXTBOOK", textbookId, isApproved: true },
    _avg: { rating: true },
  });
  const avgRating = avgResult._avg.rating || 0;
  await prisma.textbook.update({
    where: { id: textbookId },
    data: { reviewCount, rating: avgRating },
  });

  return NextResponse.json({ ok: true, reviewId: review.id });
}
