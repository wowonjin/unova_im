import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { fetchVimeoOembedMeta } from "@/lib/vimeo-oembed";
import { isAllCoursesTestModeFromRequest } from "@/lib/test-mode";

export const runtime = "nodejs";

const ParamsSchema = z.object({ courseId: z.string().min(1) });

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length) as R[];
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function GET(req: Request, ctx: { params: Promise<{ courseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { courseId } = ParamsSchema.parse(await ctx.params);
  const now = new Date();
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);

  // 관리자(교사)는 항상 접근 가능
  if (!user.isAdmin) {
    if (!bypassEnrollment) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId: user.id, courseId, status: "ACTIVE", endAt: { gt: now } },
        select: { id: true },
      });
      if (!enrollment) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }
  }

  const lessons = await prisma.lesson.findMany({
    where: { courseId, isPublished: true },
    orderBy: { position: "asc" },
    select: { id: true, title: true, position: true, vimeoVideoId: true, durationSeconds: true },
  });

  // Vimeo oEmbed로 제목/시간을 최신으로 동기화 (Vimeo에서 제목 변경 시 우리 웹도 자동 반영)
  const toSync = lessons.filter((l) => l.vimeoVideoId);
  const syncedTitleByLessonId = new Map<string, string>();
  const syncedDurationByLessonId = new Map<string, number | null>();

  if (toSync.length) {
    await mapLimit(toSync, 4, async (l) => {
      const meta = await fetchVimeoOembedMeta(l.vimeoVideoId);
      if (meta.title) syncedTitleByLessonId.set(l.id, meta.title);
      if (meta.durationSeconds != null) syncedDurationByLessonId.set(l.id, meta.durationSeconds);

      // Update DB if changed (best-effort)
      try {
        const nextTitle = meta.title ?? l.title;
        const nextDuration = meta.durationSeconds ?? l.durationSeconds ?? null;
        if (nextTitle !== l.title || nextDuration !== (l.durationSeconds ?? null)) {
          await prisma.lesson.update({
            where: { id: l.id },
            data: { title: nextTitle, durationSeconds: nextDuration },
          });
        }
      } catch {
        // ignore (race/locking/etc)
      }
    });
  }

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
        title: syncedTitleByLessonId.get(l.id) ?? l.title,
        position: l.position,
        vimeoVideoId: l.vimeoVideoId,
        durationSeconds: syncedDurationByLessonId.get(l.id) ?? l.durationSeconds,
        percent: pct,
        completed: Boolean(p?.completedAt) || pct >= 99,
      };
    }),
  });
}


