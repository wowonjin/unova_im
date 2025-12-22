import Link from "next/link";
import AppShell from "@/app/_components/AppShell";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import VimeoPlayer from "./VimeoPlayer";
import LessonResourcesTabs from "./LessonResourcesTabs";
import LessonCurriculumSidebar from "./LessonCurriculumSidebar";
import LessonPlayerLayoutClient from "./LessonPlayerLayoutClient";
import { isAllCoursesTestModeFromAllParam } from "@/lib/test-mode";
import { fetchVimeoOembedMeta } from "@/lib/vimeo-oembed";

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

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams?: Promise<{ all?: string }>;
}) {
  const user = await requireCurrentUser();
  const { lessonId } = await params;
  const sp = (await searchParams) ?? {};
  const allowAll = isAllCoursesTestModeFromAllParam(typeof sp.all === "string" ? sp.all : null);
  const now = new Date();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });
  if (!lesson || (!lesson.isPublished && !user.isAdmin)) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/80">강의를 찾을 수 없습니다.</p>
          <Link href="/dashboard" className="mt-4 inline-block underline text-white/80">
            대시보드로
          </Link>
        </div>
      </AppShell>
    );
  }

  // Keep current lesson title in sync with Vimeo (best-effort, single fetch).
  let syncedLessonTitle = lesson.title;
  try {
    const meta = await fetchVimeoOembedMeta(lesson.vimeoVideoId);
    if (meta.title && meta.title !== lesson.title) {
      syncedLessonTitle = meta.title;
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { title: meta.title, durationSeconds: meta.durationSeconds ?? lesson.durationSeconds },
      });
    }
  } catch {
    // ignore
  }

  if (!user.isAdmin && !allowAll) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId: lesson.courseId, status: "ACTIVE", endAt: { gt: now } },
      select: { id: true },
    });
    if (!enrollment) {
      return (
        <AppShell>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-white/80">수강 권한이 없습니다.</p>
            <Link href="/dashboard" className="mt-4 inline-block underline text-white/80">
              대시보드로
            </Link>
          </div>
        </AppShell>
      );
    }
  }

  const publishedFilter = user.isAdmin ? {} : { isPublished: true };

  const prev = await prisma.lesson.findFirst({
    where: { courseId: lesson.courseId, ...publishedFilter, position: { lt: lesson.position } },
    orderBy: { position: "desc" },
    select: { id: true, title: true, position: true },
  });

  const next = await prisma.lesson.findFirst({
    where: { courseId: lesson.courseId, ...publishedFilter, position: { gt: lesson.position } },
    orderBy: { position: "asc" },
    select: { id: true, title: true, position: true },
  });

  const lessons = await prisma.lesson.findMany({
    where: { courseId: lesson.courseId, ...publishedFilter },
    orderBy: { position: "asc" },
    select: { id: true, title: true, position: true, vimeoVideoId: true, durationSeconds: true },
  });

  // Sync titles for sidebar curriculum too (so changes reflect across the lesson page).
  const syncedTitleByLessonId = new Map<string, string>();
  const syncedDurationByLessonId = new Map<string, number | null>();
  const toSync = lessons.filter((l) => l.vimeoVideoId);
  if (toSync.length) {
    await mapLimit(toSync, 4, async (l) => {
      const meta = await fetchVimeoOembedMeta(l.vimeoVideoId);
      if (meta.title) syncedTitleByLessonId.set(l.id, meta.title);
      if (meta.durationSeconds != null) syncedDurationByLessonId.set(l.id, meta.durationSeconds);
      try {
        const nextTitle = meta.title ?? l.title;
        const nextDuration = meta.durationSeconds ?? l.durationSeconds ?? null;
        if (nextTitle !== l.title || nextDuration !== (l.durationSeconds ?? null)) {
          await prisma.lesson.update({ where: { id: l.id }, data: { title: nextTitle, durationSeconds: nextDuration } });
        }
      } catch {
        // ignore
      }
    });
  }

  const progress = await prisma.progress.findMany({
    where: { userId: user.id, lessonId: { in: lessons.map((l) => l.id) } },
    select: { lessonId: true, percent: true, updatedAt: true, completedAt: true },
  });
  const byLesson = new Map(progress.map((p) => [p.lessonId, p]));

  const courseAttachments = await prisma.attachment.findMany({
    where: { courseId: lesson.courseId, lessonId: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, originalName: true, sizeBytes: true },
  });

  const lessonAttachments = await prisma.attachment.findMany({
    where: { lessonId: lesson.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, originalName: true, sizeBytes: true },
  });

  const curriculum = lessons.map((l) => {
    const p = byLesson.get(l.id);
    const pct = p ? Math.round(p.percent) : 0;
    const completed = Boolean(p?.completedAt) || pct >= 99;
    return {
      id: l.id,
      title: syncedTitleByLessonId.get(l.id) ?? l.title,
      position: l.position,
      vimeoVideoId: l.vimeoVideoId,
      durationSeconds: syncedDurationByLessonId.get(l.id) ?? l.durationSeconds,
      percent: pct,
      completed,
    };
  });

  const lessonGoals = Array.isArray(lesson.goals) ? lesson.goals.filter((x) => typeof x === "string") : [];
  const lessonOutline = Array.isArray(lesson.outline) ? lesson.outline.filter((x) => typeof x === "string") : [];

  return (
    <AppShell>
      {/* Airclass형: 좌(플레이어 + 탭), 우(커리큘럼 패널) */}
      <LessonPlayerLayoutClient
        left={
          <>
            {/* VimeoPlayer 내부에 이미 surface가 있어서 추가 래퍼를 얹지 않음(덜 덕지덕지) */}
            <VimeoPlayer lessonId={lesson.id} vimeoVideoId={lesson.vimeoVideoId} />

            <LessonResourcesTabs
              lessonId={lesson.id}
              lessonPosition={lesson.position}
              lessonTitle={syncedLessonTitle}
              lessonDescription={lesson.description ?? null}
              lessonGoals={lessonGoals}
              lessonOutline={lessonOutline}
              prevLessonId={prev?.id ?? null}
              nextLessonId={next?.id ?? null}
              isTeacher={user.isAdmin}
              currentUserEmail={user.email}
              courseAttachments={courseAttachments}
              lessonAttachments={lessonAttachments}
            />
          </>
        }
        right={
          <LessonCurriculumSidebar
            courseId={lesson.courseId}
            courseTitle={lesson.course.title}
            currentLessonId={lesson.id}
            curriculum={curriculum}
          />
        }
      />
    </AppShell>
  );
}


