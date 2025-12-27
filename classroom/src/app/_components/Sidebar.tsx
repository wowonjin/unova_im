import { prisma } from "@/lib/prisma";
import { getCurrentUserOrGuest } from "@/lib/current-user";
import { getImwebProfile } from "@/lib/imweb-profile";
import SidebarClient from "@/app/_components/SidebarClient";
import { Suspense } from "react";
import { isAllCoursesTestModeFromAllParam } from "@/lib/test-mode";

export default async function Sidebar() {
  const user = await getCurrentUserOrGuest();
  const isLoggedIn = user.isLoggedIn;
  const email = user.email || "guest";
  const showAllCourses = isAllCoursesTestModeFromAllParam(null);

  // DB에서 추가 정보 조회 (name, profileImageUrl, imwebMemberCode)
  const dbUser = user.id
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { imwebMemberCode: true, name: true, profileImageUrl: true },
      })
    : null;
  const memberCode = dbUser?.imwebMemberCode ?? process.env.IMWEB_DEFAULT_MEMBER_CODE ?? null;

  // 아임웹 프로필 조회 (DB에 이름이 없는 경우)
  const imweb = memberCode && !dbUser?.name ? await getImwebProfile(memberCode) : null;
  
  // 우선순위: DB 이름 > 아임웹 이름 > 이메일 앞부분
  const displayName = dbUser?.name || imweb?.displayName || (email !== "guest" ? email.split("@")[0] : "게스트");
  // 우선순위: DB 프로필 이미지 > 아임웹 프로필 이미지
  const avatarUrl = dbUser?.profileImageUrl || imweb?.avatarUrl || null;

  const enrollments = user.id
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
        where: { isPublished: true },
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
  const progresses = user.id
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
    const coursePercent = Math.max(0, Math.min(100, Math.round(sum / total)));
    const latest = latestByCourse.get(c.id) ?? null;
    // 마지막으로 시청한 강의의 진도율 (해당 강의를 얼마나 봤는지)
    const lastLessonPercent = latest ? Math.max(0, Math.min(100, Math.round(latest.percent))) : 0;
    return {
      courseId: c.id,
      title: c.title,
      lastLessonId: latest?.lesson?.id ?? null,
      lastLessonTitle: latest?.lesson?.title ?? null,
      lastWatchedAtISO: latest ? latest.updatedAt.toISOString() : null,
      lastSeconds: latest ? latest.lastSeconds : null,
      percent: lastLessonPercent, // 마지막 강의 진도율
      coursePercent, // 전체 강좌 진도율 (필요시 사용)
    };
  });

  // "최근 수강 목록"은 실제 시청 기록(Progress)이 있는 강좌만 노출
  // (테스트 모드 showAllCourses에서는 "강좌 목록(테스트)"로서 미수강도 보여줌)
  const recentEnrolledCourses = showAllCourses
    ? enrolledCourses
    : enrolledCourses
        .filter((c) => Boolean(c.lastWatchedAtISO))
        .sort((a, b) => (b.lastWatchedAtISO ?? "").localeCompare(a.lastWatchedAtISO ?? ""))
        .slice(0, 8);

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
        avatarUrl={avatarUrl}
        isAdmin={user.isAdmin}
        isLoggedIn={isLoggedIn}
        showAllCourses={showAllCourses}
        enrolledCourses={recentEnrolledCourses}
      />
    </Suspense>
  );
}


