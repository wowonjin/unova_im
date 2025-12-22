import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getImwebProfile } from "@/lib/imweb-profile";
import SidebarClient from "@/app/_components/SidebarClient";
import { Suspense } from "react";
import { isAllCoursesTestModeFromAllParam } from "@/lib/test-mode";

export default async function Sidebar() {
  const user = await getCurrentUser();
  const email = user?.email ?? "guest";
  const showAllCourses = isAllCoursesTestModeFromAllParam(null);

  // DB에 저장된 member_code가 있으면 우선 사용, 없으면 env fallback(데모/공개모드 편의)
  const dbUser = user?.id
    ? await prisma.user.findUnique({ where: { id: user.id }, select: { imwebMemberCode: true } })
    : null;
  const memberCode = dbUser?.imwebMemberCode ?? process.env.IMWEB_DEFAULT_MEMBER_CODE ?? null;

  const imweb = memberCode ? await getImwebProfile(memberCode) : null;
  const displayName = imweb?.displayName ?? email.split("@")[0] ?? "회원";

  const enrollments = user?.id
    ? await prisma.enrollment.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              lessons: { where: { isPublished: true }, select: { id: true } },
            },
          },
        },
      })
    : [];

  const allCourses = showAllCourses
    ? await prisma.course.findMany({
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          lessons: { where: { isPublished: true }, select: { id: true } },
        },
      })
    : null;

  const courseList = showAllCourses ? (allCourses ?? []) : enrollments.map((e) => e.course);
  const enrolledLessonIds = courseList.flatMap((c) => c.lessons.map((l) => l.id));
  const progresses = user?.id
    ? await prisma.progress.findMany({
        where: { userId: user.id, lessonId: { in: enrolledLessonIds } },
        orderBy: { updatedAt: "desc" },
        include: { lesson: { select: { id: true, courseId: true, title: true } } },
      })
    : [];

  const latestByCourse = new Map<string, (typeof progresses)[number]>();
  const percentByLesson = new Map<string, number>();
  for (const p of progresses) {
    percentByLesson.set(p.lessonId, p.percent);
    const courseId = p.lesson.courseId;
    if (!latestByCourse.has(courseId)) latestByCourse.set(courseId, p);
  }

  const enrolledCourses = courseList.map((c) => {
    const total = c.lessons.length || 1;
    let sum = 0;
    for (const l of c.lessons) sum += percentByLesson.get(l.id) ?? 0;
    const percent = Math.max(0, Math.min(100, Math.round(sum / total)));
    const latest = latestByCourse.get(c.id) ?? null;
    return {
      courseId: c.id,
      title: c.title,
      lastLessonId: latest?.lesson?.id ?? null,
      lastLessonTitle: latest?.lesson?.title ?? null,
      lastWatchedAtISO: latest ? latest.updatedAt.toISOString() : null,
      lastSeconds: latest ? latest.lastSeconds : null,
      percent,
    };
  });

  return (
    <Suspense
      fallback={
        <div className="hidden w-64 shrink-0 border-r border-white/10 bg-[#1d1d1f] p-5 md:block">
          <div className="text-sm text-white/60">로딩중…</div>
        </div>
      }
    >
      <SidebarClient
        email={email}
        displayName={displayName}
        avatarUrl={imweb?.avatarUrl ?? null}
        isAdmin={Boolean(user?.isAdmin)}
        showAllCourses={showAllCourses}
        enrolledCourses={enrolledCourses}
      />
    </Suspense>
  );
}


