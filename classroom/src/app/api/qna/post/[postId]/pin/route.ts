import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ParamsSchema = z.object({ postId: z.string().min(1) });

async function canAccessPost(userId: string, postId: string) {
  const post = await prisma.qnaPost.findUnique({
    where: { id: postId },
    include: { lesson: { select: { id: true, courseId: true } } },
  });
  if (!post) return null;

  const now = new Date();
  const ok = await prisma.enrollment.findFirst({
    where: { userId, courseId: post.lesson.courseId, status: "ACTIVE", endAt: { gt: now } },
    select: { id: true },
  });
  if (!ok) return null;
  return post;
}

export async function POST(_req: Request, ctx: { params: Promise<{ postId: string }> }) {
  const user = await requireCurrentUser();
  if (!user.isAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { postId } = ParamsSchema.parse(await ctx.params);
  const post = await canAccessPost(user.id, postId);
  if (!post) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  // 답변(댓글)은 고정 불가(질문만)
  if (post.parentId) return NextResponse.json({ ok: false, error: "INVALID_TARGET" }, { status: 400 });

  const nextPinnedAt = post.pinnedAt ? null : new Date();
  const updated = await prisma.qnaPost.update({
    where: { id: postId },
    data: { pinnedAt: nextPinnedAt, pinnedById: nextPinnedAt ? user.id : null },
    select: { id: true, pinnedAt: true, pinnedById: true },
  });

  return NextResponse.json({
    ok: true,
    pinnedAt: updated.pinnedAt ? updated.pinnedAt.toISOString() : null,
    pinnedById: updated.pinnedById,
  });
}


