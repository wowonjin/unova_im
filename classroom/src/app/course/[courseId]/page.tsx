import Link from "next/link";
import AppShell from "@/app/_components/AppShell";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import CourseCurriculumClient from "./CourseCurriculumClient";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const user = await requireCurrentUser();
  const { courseId } = await params;
  const now = new Date();

  function fmt(d: Date) {
    return d.toISOString().slice(2, 10).replace(/-/g, ".");
  }

  function parseCourseMeta(title: string) {
    const bracket = title.match(/\[\s*([^\]]+)\]/)?.[1]?.trim() ?? null;
    const subjectFromBracket = bracket && !/^\d{2,4}$/.test(bracket) ? bracket : null;
    const subjectFromText = title.match(/(수학|국어|영어|과학|사회)/)?.[1] ?? null;
    const subject = subjectFromBracket ?? subjectFromText ?? null;
    const teacher = title.match(/\]\s*([^\s]+?)T\b/)?.[1]?.trim() ?? null;
    return { subject, teacher };
  }

  const enrollment = user.isAdmin
    ? null
    : await prisma.enrollment.findFirst({
        where: { userId: user.id, courseId, status: "ACTIVE", endAt: { gt: now } },
        include: { course: true },
      });

  const course = user.isAdmin
    ? await prisma.course.findUnique({ where: { id: courseId } })
    : enrollment?.course ?? null;

  if (!course) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/80">{user.isAdmin ? "강좌를 찾을 수 없습니다." : "수강 권한이 없습니다."}</p>
          <Link href="/dashboard" className="mt-4 inline-block underline text-white/80">
            대시보드로
          </Link>
        </div>
      </AppShell>
    );
  }

  const lessons = await prisma.lesson.findMany({
    where: { courseId, ...(user.isAdmin ? {} : { isPublished: true }) },
    orderBy: { position: "asc" },
    select: { id: true, title: true, position: true, vimeoVideoId: true, durationSeconds: true },
  });

  const progress = await prisma.progress.findMany({
    where: { userId: user.id, lessonId: { in: lessons.map((l) => l.id) } },
    select: { lessonId: true, percent: true, lastSeconds: true, updatedAt: true, completedAt: true },
  });
  const byLesson = new Map(progress.map((p) => [p.lessonId, p]));

  const meta = parseCourseMeta(course.title);

  const curriculum = lessons.map((l) => {
    const p = byLesson.get(l.id);
    const pct = p ? Math.round(p.percent) : 0;
    const completed = Boolean(p?.completedAt) || pct >= 99;
    return {
      id: l.id,
      title: l.title,
      position: l.position,
      durationSeconds: l.durationSeconds,
      percent: pct,
      completed,
    };
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-3">
        <Link href="/dashboard" className="text-sm text-white/70 underline">
          ← 수강중인 강좌
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70">강좌 홈</span>
                <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70">
                  {meta.subject ?? "과목"}
                </span>
                <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70">{meta.teacher ?? "강사"}</span>
                {user.isAdmin ? (
                  <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70">강사 미리보기</span>
                ) : null}
              </div>
              <h1 className="mt-2 text-xl font-semibold md:text-2xl">{course.title}</h1>
              <p className="mt-2 text-sm text-white/70">
                {user.isAdmin && !enrollment ? (
                  <>총 {lessons.length}강</>
                ) : (
                  <>수강 기간: {fmt(enrollment!.startAt)} ~ {fmt(enrollment!.endAt)} · 총 {lessons.length}강</>
                )}
              </p>
            </div>
            {/* 헤더의 "이어서 보기" 버튼 제거 */}
          </div>
        </div>
      </div>

      <CourseCurriculumClient
        courseId={courseId}
        lessons={curriculum}
      />
    </AppShell>
  );
}


