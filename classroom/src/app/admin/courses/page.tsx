import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, PageHeader } from "@/app/_components/ui";
import ConfirmDeleteCourseForm from "@/app/_components/ConfirmDeleteCourseForm";
import CoursePublishedSelect from "@/app/_components/CoursePublishedSelect";
import CreateCourseFormClient from "@/app/_components/CreateCourseFormClient";

function inferTeacherFromTitle(title: string) {
  // e.g. "[2027] 홍길동T 커넥트 수학" -> "홍길동"
  const m = title.match(/\]\s*([^\s]+?)T\b/);
  if (!m?.[1]) return "";
  return m[1].trim();
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; published?: string }>;
}) {
  const teacher = await requireAdminUser();
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const publishedRaw = sp.published ?? "all";
  const publishedFilter =
    publishedRaw === "1" ? true : publishedRaw === "0" ? false : null;

  const courses = await prisma.course.findMany({
    where: {
      ownerId: teacher.id,
      ...(publishedFilter == null ? {} : { isPublished: publishedFilter }),
      ...(q.length
        ? {
            OR: [
              { title: { contains: q } },
              { teacherName: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      lessons: { select: { id: true, isPublished: true } },
    },
  });

  const courseIds = courses.map((c) => c.id);
  const enrollmentCountsRaw = courseIds.length
    ? await prisma.enrollment.groupBy({
        by: ["courseId"],
        where: { courseId: { in: courseIds }, status: "ACTIVE" },
        _count: { _all: true },
      })
    : [];
  const enrollmentCountByCourseId = new Map(enrollmentCountsRaw.map((r) => [r.courseId, r._count._all]));

  return (
    <AppShell>
      <PageHeader
        title="강좌 관리하기"
        right={
          <div className="flex items-center gap-2">
            <Button href="/admin/textbooks" variant="secondary">
              교재 관리하기
            </Button>
            <Button href="/admin/events" variant="secondary">
              웹훅/이벤트 로그
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr] lg:items-start">
        {/* Left: create new course */}
        <div className="lg:sticky lg:top-6">
          <Card className="bg-transparent">
            <CardHeader title="강좌 관리하기" />
            <CardBody>
              <CreateCourseFormClient />
            </CardBody>
          </Card>
        </div>

        {/* Right: course list */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">내 강좌 목록</div>
              <Badge tone={courses.length ? "neutral" : "muted"}>{courses.length}개</Badge>
            </div>
            {/* Filters */}
            <form method="get" action="/admin/courses" className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                name="q"
                defaultValue={q}
                placeholder="제목/선생님 검색"
                className="h-9 w-full rounded-xl border border-white/10 bg-[#1d1d1f] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-white/10 sm:w-72"
              />
              <select
                name="published"
                defaultValue={publishedRaw}
                className="h-9 w-full rounded-xl border border-white/10 bg-[#29292a] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10 sm:w-40"
                aria-label="공개 상태 필터"
              >
                <option value="all">전체</option>
                <option value="1">공개만</option>
                <option value="0">비공개만</option>
              </select>
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="secondary">
                  필터
                </Button>
                <Button href="/admin/courses" size="sm" variant="ghost">
                  초기화
                </Button>
              </div>
            </form>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr className="border-b border-white/10">
                <th className="px-5 py-3 pr-3">제목</th>
                <th className="py-3 pr-3">선생님</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3">수강 인원</th>
                <th className="py-3 pr-3">차시(공개/전체)</th>
                <th className="py-3 pr-3">주소</th>
                <th className="px-5 py-3 text-right" aria-label="액션" />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const publishedLessons = c.lessons.filter((l) => l.isPublished).length;
                const teacherLabel = c.teacherName?.trim() || inferTeacherFromTitle(c.title) || "-";
                return (
                  <tr key={c.id} className="border-b border-white/10">
                    <td className="px-5 py-3 pr-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">{c.title}</div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-white/70">{teacherLabel}</td>
                    <td className="py-3 pr-3">
                      <CoursePublishedSelect courseId={c.id} isPublished={c.isPublished} />
                    </td>
                    <td className="py-3 pr-3 text-white/70">{enrollmentCountByCourseId.get(c.id) ?? 0}명</td>
                    <td className="py-3 pr-3 text-white/70">
                      {publishedLessons}/{c.lessons.length}
                    </td>
                    <td className="py-3 pr-3 text-white/60">{c.slug}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button href={`/admin/course/${c.id}`} size="sm" variant="ghost">
                          관리
                        </Button>
                        <ConfirmDeleteCourseForm courseId={c.id} size="sm" />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {courses.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-white/60" colSpan={7}>
                    아직 생성된 강좌가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}


