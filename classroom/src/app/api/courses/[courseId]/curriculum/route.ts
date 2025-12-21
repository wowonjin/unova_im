import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { fetchVimeoDurationSeconds } from "@/lib/vimeo-oembed";

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
  const url = new URL(req.url);
  const allowAll = url.searchParams.get("all") === "1";
  const now = new Date();

  // 관리자(교사)는 항상 접근 가능
  if (!user.isAdmin) {
    // 테스트 모드(/dashboard?all=1)에서만 수강권 체크를 우회(운영 안전장치)
    const bypassEnrollment = allowAll && process.env.NODE_ENV !== "production";
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

  // Vimeo에서 duration을 가져와서 비어있는 강의 시간 채우기(캐시: DB)
  const missing = lessons.filter((l) => !l.durationSeconds && l.vimeoVideoId);
  if (missing.length) {
    await mapLimit(missing, 4, async (l) => {
      const d = await fetchVimeoDurationSeconds(l.vimeoVideoId);
      if (!d) return;
      try {
        await prisma.lesson.update({
          where: { id: l.id },
          data: { durationSeconds: d },
        });
      } catch {
        // ignore (race/locking/etc)
      }
    });
  }

  // durationSeconds는 최신 DB 값을 우선 사용
  const durationByLessonId = new Map<string, number | null>();
  if (missing.length) {
    const refreshed = await prisma.lesson.findMany({
      where: { id: { in: missing.map((l) => l.id) } },
      select: { id: true, durationSeconds: true },
    });
    for (const r of refreshed) durationByLessonId.set(r.id, r.durationSeconds);
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
        title: l.title,
        position: l.position,
        vimeoVideoId: l.vimeoVideoId,
        durationSeconds: durationByLessonId.get(l.id) ?? l.durationSeconds,
        percent: pct,
        completed: Boolean(p?.completedAt) || pct >= 99,
      };
    }),
  });
}


