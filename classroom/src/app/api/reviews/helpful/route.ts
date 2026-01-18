import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const BodySchema = z.object({
  reviewId: z.string().min(1),
  visitorId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
  }

  const { reviewId, visitorId } = parsed.data;
  const user = await getCurrentUser();
  const userId = user?.id || null;
  if (!userId && !visitorId) {
    return NextResponse.json({ ok: false, error: "MISSING_VIEWER" }, { status: 400 });
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });
  if (!review) {
    return NextResponse.json({ ok: false, error: "REVIEW_NOT_FOUND" }, { status: 404 });
  }

  const lookup = userId ? { reviewId, userId } : { reviewId, visitorId };
  const existing = await prisma.reviewHelpful.findFirst({
    where: lookup,
    select: { id: true },
  });

  if (existing) {
    await prisma.reviewHelpful.delete({ where: { id: existing.id } });
    const helpfulCount = await prisma.reviewHelpful.count({ where: { reviewId } });
    return NextResponse.json({ ok: true, isHelpful: false, helpfulCount });
  }

  await prisma.reviewHelpful.create({
    data: {
      reviewId,
      userId,
      visitorId: visitorId || null,
    },
  });

  const helpfulCount = await prisma.reviewHelpful.count({ where: { reviewId } });
  return NextResponse.json({ ok: true, isHelpful: true, helpfulCount });
}
