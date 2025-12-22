import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import { readJsonBody } from "@/lib/read-json";
import { isAllCoursesTestModeFromRequest } from "@/lib/test-mode";

export const runtime = "nodejs";

const ParamsSchema = z.object({ lessonId: z.string().min(1) });
const CreateSchema = z.object({
  body: z.string().min(1).max(5000),
  attachmentIds: z.array(z.string().min(1)).max(5).optional().default([]),
  parentId: z.string().min(1).optional(),
});

async function assertCanAccessLesson(userId: string, lessonId: string, bypassEnrollment: boolean) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  });
  if (!lesson) return null;

  if (bypassEnrollment) return lesson;

  const now = new Date();
  const ok = await prisma.enrollment.findFirst({
    where: { userId, courseId: lesson.courseId, status: "ACTIVE", endAt: { gt: now } },
    select: { id: true },
  });
  if (!ok) return null;
  return lesson;
}

export async function GET(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  const user = await requireCurrentUser();
  const { lessonId } = ParamsSchema.parse(await ctx.params);
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const lesson = await assertCanAccessLesson(user.id, lessonId, bypassEnrollment);
  if (!lesson) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const posts = await prisma.qnaPost.findMany({
    where: { lessonId },
    orderBy: [{ pinnedAt: "desc" }, { parentId: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { id: true, email: true } },
      pinnedBy: { select: { id: true, email: true } },
      images: { include: { attachment: { select: { id: true, mimeType: true, originalName: true, title: true } } } },
    },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    posts: posts.map((p) => ({
      id: p.id,
      lessonId: p.lessonId,
      parentId: p.parentId ?? null,
      authorRole: p.authorRole,
      user: { id: p.user.id, email: p.user.email },
      body: p.body,
      deletedAt: p.deletedAt?.toISOString() ?? null,
      pinnedAt: p.pinnedAt?.toISOString() ?? null,
      pinnedBy: p.pinnedBy ? { id: p.pinnedBy.id, email: p.pinnedBy.email } : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      images: p.images.map((x) => ({
        id: x.id,
        attachmentId: x.attachmentId,
        mimeType: x.attachment.mimeType,
        title: x.attachment.title,
      })),
    })),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  const user = await requireCurrentUser();
  const { lessonId } = ParamsSchema.parse(await ctx.params);
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const lesson = await assertCanAccessLesson(user.id, lessonId, bypassEnrollment);
  if (!lesson) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const json = await readJsonBody(req);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  // 답변(댓글)인 경우: parentId가 같은 강의의 '질문(parentId=null)'이어야 함
  const parentId = parsed.data.parentId ?? null;
  if (parentId) {
    const parent = await prisma.qnaPost.findUnique({
      where: { id: parentId },
      select: { id: true, lessonId: true, parentId: true },
    });
    if (!parent || parent.lessonId !== lessonId || parent.parentId !== null) {
      return NextResponse.json({ ok: false, error: "INVALID_PARENT" }, { status: 400 });
    }
    // 현재 단계: 답변 작성은 선생님(관리자)만
    if (!user.isAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  // attachmentIds는 현재 레슨에 귀속된 파일만 허용
  const ids = [...new Set(parsed.data.attachmentIds)];
  if (ids.length) {
    const count = await prisma.attachment.count({
      where: { id: { in: ids }, lessonId },
    });
    if (count !== ids.length) {
      return NextResponse.json({ ok: false, error: "INVALID_ATTACHMENTS" }, { status: 400 });
    }
  }

  const created = await prisma.qnaPost.create({
    data: {
      lessonId,
      userId: user.id,
      body: parsed.data.body,
      authorRole: user.isAdmin ? "TEACHER" : "STUDENT",
      parentId,
      images: ids.length ? { create: ids.map((attachmentId) => ({ attachmentId })) } : undefined,
    },
    include: {
      user: { select: { id: true, email: true } },
      pinnedBy: { select: { id: true, email: true } },
      images: { include: { attachment: { select: { id: true, mimeType: true, originalName: true, title: true } } } },
    },
  });

  return NextResponse.json({
    ok: true,
    post: {
      id: created.id,
      lessonId: created.lessonId,
      parentId: created.parentId ?? null,
      authorRole: created.authorRole,
      user: { id: created.user.id, email: created.user.email },
      body: created.body,
      deletedAt: created.deletedAt?.toISOString() ?? null,
      pinnedAt: created.pinnedAt?.toISOString() ?? null,
      pinnedBy: created.pinnedBy ? { id: created.pinnedBy.id, email: created.pinnedBy.email } : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      images: created.images.map((x) => ({
        id: x.id,
        attachmentId: x.attachmentId,
        mimeType: x.attachment.mimeType,
        title: x.attachment.title,
      })),
    },
  });
}


