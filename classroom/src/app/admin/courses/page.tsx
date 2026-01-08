import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Button, Card, CardBody, CardHeader, PageHeader } from "@/app/_components/ui";
import CreateCourseFormClient from "@/app/_components/CreateCourseFormClient";
import CourseListClient from "@/app/_components/CourseListClient";

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
              { subjectName: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ position: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      teacherName: true,
      subjectName: true,
      isPublished: true,
      thumbnailStoredPath: true,
      thumbnailUrl: true,
      price: true,
      originalPrice: true,
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

  // Transform courses for client component
  const coursesForClient = courses.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    teacherName: c.teacherName,
    subjectName: c.subjectName,
    isPublished: c.isPublished,
    thumbnailStoredPath: c.thumbnailStoredPath,
    thumbnailUrl: c.thumbnailUrl,
    price: c.price ?? null,
    originalPrice: c.originalPrice ?? null,
    lessonCount: c.lessons.length,
    publishedLessonCount: c.lessons.filter((l) => l.isPublished).length,
    enrollmentCount: enrollmentCountByCourseId.get(c.id) ?? 0,
  }));

  return (
    <AppShell>
      <PageHeader
        title="강좌 관리하기"
        right={
          <div className="flex items-center gap-2">
            <Button href="/admin/textbooks" variant="secondary">
              교재 관리하기
            </Button>
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        <Card className="bg-[#1a1a1c]">
          <CardHeader title="강좌 관리하기" description="강좌를 생성하고 기본 정보를 설정합니다." />
          <CardBody>
            <CreateCourseFormClient />
          </CardBody>
        </Card>

        <CourseListClient courses={coursesForClient} q={q} publishedRaw={publishedRaw} />
      </div>
    </AppShell>
  );
}
