import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader } from "@/app/_components/ui";
import ConfirmDeleteCourseForm from "@/app/_components/ConfirmDeleteCourseForm";
import CoursePublishedSelect from "@/app/_components/CoursePublishedSelect";

export default async function AdminCoursesPage() {
  const teacher = await requireAdminUser();

  const courses = await prisma.course.findMany({
    where: { ownerId: teacher.id },
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
              <form
                className="grid grid-cols-1 gap-4"
                action="/api/admin/courses/create"
                method="post"
                encType="multipart/form-data"
              >
                <div>
                  <Field label="강좌 제목">
                    <Input
                      name="title"
                      required
                      placeholder="예: [2027] 김OO T 커넥트 수학"
                      className="bg-transparent"
                    />
                  </Field>
                </div>

                <Field label="공개 상태">
                  <select
                    name="isPublished"
                    defaultValue="1"
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#29292a] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  >
                    <option value="1">공개</option>
                    <option value="0">비공개</option>
                  </select>
                </Field>

                <Field label="썸네일(선택)">
                  <input
                    className="block w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border file:border-white/10 file:bg-transparent file:px-3 file:py-2 file:text-sm file:text-white/80 hover:file:bg-transparent"
                    type="file"
                    name="thumbnail"
                    accept="image/*"
                  />
                </Field>

                <div className="flex justify-start">
                  <Button type="submit" variant="ghostSolid">
                    강좌 생성하기
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Right: course list */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="text-sm font-semibold">내 강좌 목록</div>
            <Badge tone={courses.length ? "neutral" : "muted"}>{courses.length}개</Badge>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr className="border-b border-white/10">
                <th className="px-5 py-3 pr-3">제목</th>
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
                return (
                  <tr key={c.id} className="border-b border-white/10">
                    <td className="px-5 py-3 pr-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">{c.title}</div>
                      </div>
                    </td>
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
                  <td className="px-5 py-6 text-sm text-white/60" colSpan={6}>
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


