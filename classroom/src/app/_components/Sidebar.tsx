import { prisma } from "@/lib/prisma";
import { getCurrentUserOrGuest } from "@/lib/current-user";
import { getImwebProfile } from "@/lib/imweb-profile";
import SidebarClient from "@/app/_components/SidebarClient";
import { isAllCoursesTestModeFromAllParam } from "@/lib/test-mode";

export default async function Sidebar() {
  const user = await getCurrentUserOrGuest();
  const isLoggedIn = user.isLoggedIn;
  const email = user.email || "guest";
  const showAllCourses = isAllCoursesTestModeFromAllParam(null);

  // 선생님(계정) 여부: Teacher.accountUserId == user.id
  // (Teacher 테이블/컬럼은 배포 환경에서 마이그레이션 누락이 있을 수 있어 raw로 보강)
  let isTeacher = false;
  if (user.id) {
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "accountUserId" TEXT;');
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT "id" FROM "Teacher" WHERE "accountUserId" = $1 LIMIT 1',
        user.id
      )) as any[];
      isTeacher = Array.isArray(rows) && rows.length > 0;
    } catch {
      isTeacher = false;
    }
  }

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

  const courseTitleById = new Map(courseList.map((c) => [c.id, c.title] as const));

  // "최근 수강 목록": 강의(lesson) 단위로 쌓이도록 구성
  // (같은 강좌의 다른 강의도 각각 최근 항목으로 노출)
  const recentEnrolledCourses = showAllCourses
    ? []
    : progresses
        .filter((p) => p && p.lesson && typeof p.lessonId === "string")
        .slice(0, 6)
        .map((p) => {
          const courseId = p.lesson.courseId;
          return {
            courseId,
            title: courseTitleById.get(courseId) ?? "강좌",
            lastLessonId: p.lessonId,
            lastLessonTitle: p.lesson.title ?? null,
            lastWatchedAtISO: p.updatedAt.toISOString(),
            lastSeconds: p.lastSeconds ?? null,
            percent: Math.max(0, Math.min(100, Math.round(p.percent))),
          };
        });

  return (
    <SidebarClient
      email={email}
      userId={user.id}
      displayName={displayName}
      avatarUrl={avatarUrl}
      isAdmin={user.isAdmin}
      isTeacher={isTeacher}
      isLoggedIn={isLoggedIn}
      showAllCourses={showAllCourses}
      enrolledCourses={recentEnrolledCourses}
    />
  );
}


