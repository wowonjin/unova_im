import AppShell from "@/app/_components/AppShell";
import DashboardShellClient from "@/app/_components/DashboardShellClient";
import DashboardSortControls from "@/app/_components/DashboardSortControls";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAllCoursesTestModeFromAllParam } from "@/lib/test-mode";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; all?: string }>;
}) {
  const user = await requireCurrentUser();
  const now = new Date();
  const sp = (await searchParams) ?? {};
  const query = typeof sp.q === "string" ? sp.q : "";
  const showAll = isAllCoursesTestModeFromAllParam(typeof sp.all === "string" ? sp.all : null);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      endAt: { gt: now },
    },
    select: {
      id: true,
      courseId: true,
      startAt: true,
      endAt: true,
      course: {
        select: {
          id: true,
          title: true,
          thumbnailStoredPath: true,
          lessons: {
            where: { isPublished: true },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { endAt: "asc" },
  });

  const allCourses = showAll
    ? await prisma.course.findMany({
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          thumbnailStoredPath: true,
          lessons: { where: { isPublished: true }, select: { id: true } },
        },
      })
    : null;

  // 각 강좌별 최근 시청 차시/진행률(단순 평균)
  const courseIds = (showAll ? (allCourses ?? []).map((c) => c.id) : enrollments.map((e) => e.courseId));
  const progress = await prisma.progress.findMany({
    where: { userId: user.id, lesson: { courseId: { in: courseIds } } },
    orderBy: { updatedAt: "desc" },
    include: { lesson: { select: { id: true, courseId: true, title: true } } },
  });

  const progressListByCourseId = new Map<string, typeof progress>();
  for (const p of progress) {
    const cid = p.lesson.courseId;
    const arr = progressListByCourseId.get(cid) ?? [];
    arr.push(p);
    progressListByCourseId.set(cid, arr);
  }

  const progressByCourse = new Map<
    string,
    {
      lastLessonId: string;
      lastLessonTitle: string;
      avgPercent: number;
      completedLessons: number;
      lastProgressAt: Date | null;
    }
  >();

  for (const courseId of courseIds) {
    const p = progressListByCourseId.get(courseId) ?? [];
    const last = p[0];
    const avg = p.length === 0 ? 0 : Math.round((p.reduce((sum, x) => sum + x.percent, 0) / p.length) * 10) / 10;
    const completed = p.filter((x) => x.completedAt != null || x.percent >= 99.9).length;
    progressByCourse.set(courseId, {
      lastLessonId: last?.lessonId || "",
      lastLessonTitle: last?.lesson.title || "",
      avgPercent: avg,
      completedLessons: completed,
      lastProgressAt: last?.updatedAt ?? null,
    });
  }

  const enrollmentByCourseId = new Map(enrollments.map((e) => [e.courseId, e]));

  const cards = (showAll ? (allCourses ?? []).map((c) => {
    const en = enrollmentByCourseId.get(c.id) ?? null;
    const summary = progressByCourse.get(c.id);
    const startAt = en?.startAt ?? now;
    const endAt = en?.endAt ?? now;
    return {
      enrollmentId: en?.id ?? `course-${c.id}`,
      courseId: c.id,
      title: c.title,
      thumbnail: Boolean(c.thumbnailStoredPath),
      isEnrolled: Boolean(en),
      startAtISO: startAt.toISOString(),
      endAtISO: endAt.toISOString(),
      totalLessons: c.lessons.length,
      avgPercent: summary?.avgPercent ?? 0,
      completedLessons: summary?.completedLessons ?? 0,
      lastLessonId: summary?.lastLessonId ? summary.lastLessonId : null,
      lastLessonTitle: summary?.lastLessonTitle ? summary.lastLessonTitle : null,
      lastProgressAtISO: summary?.lastProgressAt ? summary.lastProgressAt.toISOString() : null,
    };
  }) : enrollments.map((en) => {
    const summary = progressByCourse.get(en.courseId);
    return {
      enrollmentId: en.id,
      courseId: en.courseId,
      title: en.course.title,
      thumbnail: Boolean(en.course.thumbnailStoredPath),
      isEnrolled: true,
      startAtISO: en.startAt.toISOString(),
      endAtISO: en.endAt.toISOString(),
      totalLessons: en.course.lessons.length,
      avgPercent: summary?.avgPercent ?? 0,
      completedLessons: summary?.completedLessons ?? 0,
      lastLessonId: summary?.lastLessonId ? summary.lastLessonId : null,
      lastLessonTitle: summary?.lastLessonTitle ? summary.lastLessonTitle : null,
      lastProgressAtISO: summary?.lastProgressAt ? summary.lastProgressAt.toISOString() : null,
    };
  }));

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">수강중인 강좌</h1>
            <span className="text-sm text-white/70">총 {cards.length}개</span>
          </div>
        </div>
        <div className="shrink-0">
          <DashboardSortControls />
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/80">현재 수강 가능한 강좌가 없습니다.</p>
        </div>
      ) : (
        <DashboardShellClient cards={cards} initialQuery={query} />
      )}
    </AppShell>
  );
}


