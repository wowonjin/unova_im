import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import { readJsonBody } from "@/lib/read-json";
import { isAllCoursesTestModeFromRequest } from "@/lib/test-mode";

export const runtime = "nodejs";

const ParamsSchema = z.object({ lessonId: z.string().min(1) });

const UpsertSchema = z.object({
  lastSeconds: z.number().min(0),
  durationSeconds: z.number().min(1).optional(),
});

async function assertCanAccessLesson(user: { id: string; isAdmin: boolean }, lessonId: string, bypassEnrollment: boolean) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, durationSeconds: true },
  });
  if (!lesson) return null;

  // 관리자(교사)는 수강권 없이도 접근 가능(lesson 페이지/커리큘럼 API와 정책 일치)
  if (user.isAdmin) return lesson;
  if (bypassEnrollment) return lesson;

  const now = new Date();
  const ok = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId: lesson.courseId, status: "ACTIVE", endAt: { gt: now } },
    select: { id: true },
  });
  if (!ok) return null;

  return lesson;
}

export async function GET(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  const user = await requireCurrentUser();
  const params = ParamsSchema.parse(await ctx.params);
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);

  const lesson = await assertCanAccessLesson(user, params.lessonId, bypassEnrollment);
  if (!lesson) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const p = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: params.lessonId } },
    select: { lastSeconds: true, percent: true, completedAt: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, progress: p ?? { lastSeconds: 0, percent: 0, completedAt: null } });
}

export async function POST(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  const user = await requireCurrentUser();
  const params = ParamsSchema.parse(await ctx.params);
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const json = await readJsonBody(req);
  const body = UpsertSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const lesson = await assertCanAccessLesson(user, params.lessonId, bypassEnrollment);
  if (!lesson) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const lastSeconds = body.data.lastSeconds;
  const durationSeconds = body.data.durationSeconds ?? lesson.durationSeconds ?? null;
  const percent =
    durationSeconds && durationSeconds > 0 ? Math.min(100, Math.max(0, (lastSeconds / durationSeconds) * 100)) : 0;
  const completedAt = percent >= 90 ? new Date() : null;

  // durationSeconds가 비어 있으면 최초 1회 채워두기(편의)
  if (lesson.durationSeconds == null && body.data.durationSeconds) {
    await prisma.lesson.update({
      where: { id: params.lessonId },
      data: { durationSeconds: Math.round(body.data.durationSeconds) },
    });
  }

  const saved = await prisma.progress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: params.lessonId } },
    update: {
      lastSeconds,
      percent,
      completedAt: completedAt ?? undefined,
    },
    create: {
      userId: user.id,
      lessonId: params.lessonId,
      lastSeconds,
      percent,
      completedAt,
    },
    select: { lastSeconds: true, percent: true, completedAt: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, progress: saved });
}


