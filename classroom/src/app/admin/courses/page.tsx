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

function inferSubjectFromTitle(title: string) {
  // Rough fallback when subjectName isn't stored yet.
  const bracket = title.match(/\[\s*([^\]]+)\]/)?.[1]?.trim() ?? null;
  if (bracket && !/^\d{2,4}$/.test(bracket)) return bracket;
  return title.match(/(수학|국어|영어|과학|사회)/)?.[1] ?? "";
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
              { subjectName: { contains: q } },
            ],
          }
        : {}),
    },
    // Prefer explicit ordering if available; fall back to updatedAt for stability.
    orderBy: [{ position: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      lessons: { select: { id: true, isPublished: true } },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      teacherName: true,
      subjectName: true,
      isPublished: true,
      position: true,
      thumbnailStoredPath: true,
      thumbnailUrl: true,
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

      <div className="mt-6 space-y-4">
        <Card className="bg-[#212123]">
          <CardHeader title="강좌 관리하기" description="강좌를 생성하고 기본 정보를 설정합니다." />
          <CardBody>
            <CreateCourseFormClient />
          </CardBody>
        </Card>

        <div className="rounded-2xl border border-white/10 bg-[#212123]">
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
                placeholder="제목/선생님/과목 검색 후 Enter"
                className="h-9 w-full rounded-xl border border-white/10 bg-[#1d1d1f] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-white/10 sm:w-72"
              />
              <select
                name="published"
                defaultValue={publishedRaw}
                className="h-9 w-full rounded-xl border border-white/10 bg-[#212123] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10 sm:w-40"
                aria-label="공개 상태 필터"
              >
                <option value="all">전체</option>
                <option value="1">공개만</option>
                <option value="0">비공개만</option>
              </select>
            </form>
          </div>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => {
                const publishedLessons = c.lessons.filter((l) => l.isPublished).length;
                const teacherLabel = c.teacherName?.trim() || inferTeacherFromTitle(c.title) || "";
                const subjectLabel = c.subjectName?.trim() || inferSubjectFromTitle(c.title) || "";
                const pos = c.position ?? 0;
                const hasThumbnail = Boolean(c.thumbnailStoredPath || c.thumbnailUrl);
                const thumbSrc = hasThumbnail ? `/api/courses/${c.id}/thumbnail` : "/course-placeholder.svg";

                return (
                  <div
                    key={c.id}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1c] transition-all hover:border-white/20 hover:bg-[#1f1f21]"
                  >
                    {/* 썸네일 */}
                    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbSrc}
                        alt={c.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      {/* 순서 뱃지 */}
                      <div className="absolute left-2 top-2 flex items-center gap-1">
                        <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                          #{pos || "-"}
                        </span>
                      </div>
                      {/* 공개 상태 */}
                      <div className="absolute right-2 top-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${
                          c.isPublished ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                        }`}>
                          {c.isPublished ? "공개" : "비공개"}
                        </span>
                      </div>
                    </div>

                    {/* 정보 */}
                    <div className="p-4">
                      <h3 className="truncate font-medium text-white">{c.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                        {teacherLabel && <span>{teacherLabel}</span>}
                        {teacherLabel && subjectLabel && <span>·</span>}
                        {subjectLabel && <span>{subjectLabel}</span>}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-white/60">
                        <div className="flex items-center gap-3">
                          <span>수강 {enrollmentCountByCourseId.get(c.id) ?? 0}명</span>
                          <span>차시 {publishedLessons}/{c.lessons.length}</span>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <form action="/api/admin/courses/move" method="post">
                            <input type="hidden" name="courseId" value={c.id} />
                            <input type="hidden" name="dir" value="up" />
                            <button type="submit" className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                          </form>
                          <form action="/api/admin/courses/move" method="post">
                            <input type="hidden" name="courseId" value={c.id} />
                            <input type="hidden" name="dir" value="down" />
                            <button type="submit" className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </form>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button href={`/admin/course/${c.id}`} size="sm" variant="ghost">
                            관리
                          </Button>
                          <ConfirmDeleteCourseForm courseId={c.id} size="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-white/60">
              아직 생성된 강좌가 없습니다.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}


