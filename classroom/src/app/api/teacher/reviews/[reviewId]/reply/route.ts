import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getTeacherAccountByUserId } from "@/lib/current-user";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  reviewId: z.string().min(1),
});

const BodySchema = z.object({
  reply: z.string(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ reviewId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const teacher = await getTeacherAccountByUserId(user.id);
    if (!teacher) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { reviewId } = ParamsSchema.parse(await ctx.params);
    const json = await req.json().catch(() => null);
    const { reply } = BodySchema.parse(json ?? {});
    const replyTrim = reply.trim();

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        course: { select: { ownerId: true } },
        textbook: { select: { ownerId: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const isOwner = review.course?.ownerId === user.id || review.textbook?.ownerId === user.id;
    if (!isOwner) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        teacherReply: replyTrim.length > 0 ? replyTrim : null,
        teacherReplyAt: replyTrim.length > 0 ? new Date() : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update teacher reply:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

