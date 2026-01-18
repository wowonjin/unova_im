import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const BodySchema = z.object({
  reviewId: z.string().min(1),
  reason: z.string().min(1).max(50),
  detail: z.string().max(500).optional(),
  visitorId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  if (!json) return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
  }

  const { reviewId, reason, detail, visitorId } = parsed.data;
  const user = await getCurrentUser();
  const userId = user?.id || null;
  if (!userId && !visitorId) {
    return NextResponse.json({ ok: false, error: "MISSING_VIEWER" }, { status: 400 });
  }

  const exists = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!exists) return NextResponse.json({ ok: false, error: "REVIEW_NOT_FOUND" }, { status: 404 });

  await prisma.reviewReport.create({
    data: {
      reviewId,
      reason,
      detail: detail?.trim() || null,
      userId,
      visitorId: visitorId || null,
    },
  });

  return NextResponse.json({ ok: true });
}

