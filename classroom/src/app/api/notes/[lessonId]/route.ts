import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { readJsonBody } from "@/lib/read-json";
import { isAllCoursesTestModeFromRequest } from "@/lib/test-mode";

export const runtime = "nodejs";

const ParamsSchema = z.object({ lessonId: z.string().min(1) });
const BodySchema = z.object({ body: z.string().max(20000) });

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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { lessonId } = ParamsSchema.parse(await ctx.params);
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const lesson = await assertCanAccessLesson(user.id, lessonId, bypassEnrollment);
  if (!lesson) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const note = await prisma.note.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    select: { body: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, note: note ?? { body: "", updatedAt: null } });
}

export async function POST(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { lessonId } = ParamsSchema.parse(await ctx.params);
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const lesson = await assertCanAccessLesson(user.id, lessonId, bypassEnrollment);
  if (!lesson) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const json = await readJsonBody(req);
  const body = BodySchema.safeParse(json);
  if (!body.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const saved = await prisma.note.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { body: body.data.body },
    create: { userId: user.id, lessonId, body: body.data.body },
    select: { body: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, note: saved });
}


