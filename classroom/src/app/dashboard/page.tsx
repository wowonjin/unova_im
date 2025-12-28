import AppShell from "@/app/_components/AppShell";
import DashboardShellClient from "@/app/_components/DashboardShellClient";
import DashboardHeader from "@/app/_components/DashboardHeader";
import DashboardEmptyState from "@/app/_components/DashboardEmptyState";
import { getCurrentUserOrGuest } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAllCoursesTestModeFromAllParam } from "@/lib/test-mode";
import Link from "next/link";

function getStoreOwnerEmail(): string {
  // 스토어(/store)와 동일한 노출 기준(관리자 소유 상품만 노출)을 사용합니다.
  return (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase().trim();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; all?: string }>;
}) {
  const user = await getCurrentUserOrGuest();
  const now = new Date();
  const sp = (await searchParams) ?? {};
  const query = typeof sp.q === "string" ? sp.q : "";
  const showAllFromParam = isAllCoursesTestModeFromAllParam(typeof sp.all === "string" ? sp.all : null);
  // 관리자(admin@gmail.com 등)는 구매/수강권과 무관하게 전체 강의를 "나의 강의실"에서 볼 수 있도록 허용
  const showAll = showAllFromParam || user.isAdmin;
  const storeOwnerEmail = getStoreOwnerEmail();

  // 로그인하지 않은 경우 빈 배열
  const enrollments = user.id
    ? await prisma.enrollment.findMany({
        where: {
          userId: user.id,
          status: "ACTIVE",
          endAt: { gt: now },
          course: { isPublished: true, owner: { email: storeOwnerEmail } },
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
          thumbnailUrl: true,
          lessons: {
            where: { isPublished: true },
            select: { id: true, durationSeconds: true },
          },
        },
      },
    },
        orderBy: { endAt: "asc" },
      })
    : [];

  const allCourses = showAll
    ? await prisma.course.findMany({
        where: { isPublished: true, owner: { email: storeOwnerEmail } },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          thumbnailStoredPath: true,
          thumbnailUrl: true,
          lessons: { where: { isPublished: true }, select: { id: true, durationSeconds: true } },
        },
      })
    : null;

  // 각 강좌별 최근 시청 차시/진행률(전체 러닝타임 기준)
  const courseIds = (showAll ? (allCourses ?? []).map((c) => c.id) : enrollments.map((e) => e.courseId));
  const progress = user.id && courseIds.length > 0
    ? await prisma.progress.findMany({
        where: { userId: user.id, lesson: { courseId: { in: courseIds } } },
        orderBy: { updatedAt: "desc" },
        include: { lesson: { select: { id: true, courseId: true, title: true, durationSeconds: true } } },
      })
    : [];

  const progressListByCourseId = new Map<string, typeof progress>();
  for (const p of progress) {
    const cid = p.lesson.courseId;
    const arr = progressListByCourseId.get(cid) ?? [];
    arr.push(p);
    progressListByCourseId.set(cid, arr);
  }

  // 강좌별 전체 러닝타임 계산
  const courseLessonsMap = new Map<string, { id: string; durationSeconds: number | null }[]>();
  if (showAll && allCourses) {
    for (const c of allCourses) {
      courseLessonsMap.set(c.id, c.lessons);
    }
  } else {
    for (const en of enrollments) {
      courseLessonsMap.set(en.courseId, en.course.lessons);
    }
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
    const completed = p.filter((x) => x.completedAt != null || x.percent >= 99.9).length;

    // 전체 러닝타임 기준 진도율 계산
    const lessons = courseLessonsMap.get(courseId) ?? [];
    const totalDuration = lessons.reduce((sum, l) => sum + (l.durationSeconds ?? 0), 0);
    
    let watchedDuration = 0;
    for (const prog of p) {
      const lessonDuration = prog.lesson.durationSeconds ?? 0;
      watchedDuration += (lessonDuration * prog.percent) / 100;
    }

    const runtimePercent = totalDuration > 0
      ? Math.round((watchedDuration / totalDuration) * 1000) / 10
      : 0;

    progressByCourse.set(courseId, {
      lastLessonId: last?.lessonId || "",
      lastLessonTitle: last?.lesson.title || "",
      avgPercent: runtimePercent,
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
      thumbnail: Boolean(c.thumbnailStoredPath || c.thumbnailUrl),
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
      thumbnail: Boolean(en.course.thumbnailStoredPath || en.course.thumbnailUrl),
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
      <DashboardHeader totalCount={cards.length} />

      {cards.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#1C1C1C] p-8 text-center">
          <DashboardEmptyState isLoggedIn={user.isLoggedIn} />
        </div>
      ) : (
        <DashboardShellClient cards={cards} initialQuery={query} />
      )}
    </AppShell>
  );
}


