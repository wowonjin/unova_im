import AppShell from "@/app/_components/AppShell";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function MaterialsPage() {
  const user = await requireCurrentUser();
  const now = new Date();

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
    select: { courseId: true, course: { select: { id: true, title: true } } },
    orderBy: { endAt: "asc" },
  });

  const courseIds = enrollments.map((e) => e.courseId);

  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { courseId: { in: courseIds } },
        { lesson: { courseId: { in: courseIds } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { lesson: { select: { id: true, title: true, position: true, courseId: true } } },
  });

  const courseTitleById = new Map(enrollments.map((e) => [e.course.id, e.course.title]));

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">교재 다운로드</h1>

      {attachments.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/80">다운로드 가능한 자료가 없습니다.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {attachments.map((a) => {
            const courseId = a.courseId ?? a.lesson?.courseId ?? "";
            const courseTitle = courseTitleById.get(courseId) ?? "강좌";
            const lessonLabel = a.lesson ? `${a.lesson.position}강 · ${a.lesson.title}` : "공통 자료";
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.title}</p>
                  <p className="mt-1 truncate text-xs text-white/70">
                    {courseTitle} · {lessonLabel}
                  </p>
                </div>
                <a
                  className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                  href={`/api/attachments/${a.id}/download`}
                >
                  다운로드
                </a>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}


