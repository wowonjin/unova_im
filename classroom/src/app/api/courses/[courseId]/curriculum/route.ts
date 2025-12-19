import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ParamsSchema = z.object({ courseId: z.string().min(1) });

export async function GET(_req: Request, ctx: { params: Promise<{ courseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { courseId } = ParamsSchema.parse(await ctx.params);
  const now = new Date();

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId, status: "ACTIVE", endAt: { gt: now } },
    select: { id: true },
  });
  if (!enrollment) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const lessons = await prisma.lesson.findMany({
    where: { courseId, isPublished: true },
    orderBy: { position: "asc" },
    select: { id: true, title: true, position: true, vimeoVideoId: true, durationSeconds: true },
  });

  const progresses = lessons.length
    ? await prisma.progress.findMany({
        where: { userId: user.id, lessonId: { in: lessons.map((l) => l.id) } },
        select: { lessonId: true, percent: true, completedAt: true },
      })
    : [];

  const byLesson = new Map(progresses.map((p) => [p.lessonId, p]));

  return NextResponse.json({
    ok: true,
    courseId,
    lessons: lessons.map((l) => {
      const p = byLesson.get(l.id);
      const pct = p ? Math.max(0, Math.min(100, Math.round(p.percent))) : 0;
      return {
        id: l.id,
        title: l.title,
        position: l.position,
        vimeoVideoId: l.vimeoVideoId,
        durationSeconds: l.durationSeconds,
        percent: pct,
        completed: Boolean(p?.completedAt) || pct >= 99,
      };
    }),
  });
}


