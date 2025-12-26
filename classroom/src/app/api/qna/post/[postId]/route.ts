import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { readJsonBody } from "@/lib/read-json";
import { isAllCoursesTestModeFromRequest } from "@/lib/test-mode";

export const runtime = "nodejs";

const ParamsSchema = z.object({ postId: z.string().min(1) });
const PatchSchema = z.object({ body: z.string().min(1).max(5000) });

async function canAccessPost(userId: string, postId: string, bypassEnrollment: boolean) {
  const post = await prisma.qnaPost.findUnique({
    where: { id: postId },
    include: { lesson: { select: { id: true, courseId: true } } },
  });
  if (!post) return null;

  if (bypassEnrollment) return post;

  const now = new Date();
  const ok = await prisma.enrollment.findFirst({
    where: { userId, courseId: post.lesson.courseId, status: "ACTIVE", endAt: { gt: now } },
    select: { id: true },
  });
  if (!ok) return null;
  return post;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ postId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { postId } = ParamsSchema.parse(await ctx.params);
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const post = await canAccessPost(user.id, postId, bypassEnrollment);
  if (!post) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  if (post.userId !== user.id) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  if (post.deletedAt) return NextResponse.json({ ok: false, error: "DELETED" }, { status: 400 });

  const json = await readJsonBody(req);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const updated = await prisma.qnaPost.update({
    where: { id: postId },
    data: { body: parsed.data.body },
    select: { id: true, body: true, updatedAt: true },
  });
  return NextResponse.json({
    ok: true,
    post: { id: updated.id, body: updated.body, updatedAt: updated.updatedAt.toISOString() },
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ postId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { postId } = ParamsSchema.parse(await ctx.params);
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const post = await canAccessPost(user.id, postId, bypassEnrollment);
  if (!post) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // 작성자 또는 관리자만 삭제(soft-delete)
  if (post.userId !== user.id && !user.isAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  await prisma.qnaPost.update({
    where: { id: postId },
    data: { deletedAt: post.deletedAt ? post.deletedAt : new Date() },
  });

  return NextResponse.json({ ok: true });
}


