import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, Field, HelpTip, Input, PageHeader, Tabs } from "@/app/_components/ui";
import ConfirmDeleteCourseForm from "@/app/_components/ConfirmDeleteCourseForm";
import CourseThumbnailUploadClient from "@/app/_components/CourseThumbnailUploadClient";
import CourseSettingsAutoSaveClient from "@/app/_components/CourseSettingsAutoSaveClient";
import PublishToggleClient from "@/app/_components/PublishToggleClient";
import { ConfirmDeleteIconButton } from "@/app/_components/ConfirmDeleteButton";
import LessonListClient from "@/app/_components/LessonListClient";
import CourseDetailPageClient from "@/app/_components/CourseDetailPageClient";
import CourseAddonsClient from "@/app/_components/CourseAddonsClient";
import { ensureSoldOutColumnsOnce } from "@/lib/ensure-columns";

export default async function AdminCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ tab?: string; imweb?: string; thumb?: string; enroll?: string }>;
}) {
  const teacher = await requireAdminUser();
  await ensureSoldOutColumnsOnce();
  const { courseId } = await params;
  const sp = (await searchParams) ?? {};
  const tabRaw = sp.tab || "curriculum";
  const tab = (
    tabRaw === "integrations"
      ? "settings"
      : tabRaw === "materials"
        ? "curriculum"
        : tabRaw === "detail"
          ? "settings"
          : tabRaw
  ) as
    | "curriculum"
    | "students"
    | "settings"
    | "addons";
  const imwebMsg = sp.imweb || null;
  const thumbMsg = sp.thumb || null;
  const enrollMsg = sp.enroll || null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: { orderBy: { position: "asc" }, include: { attachments: { select: { id: true } } } },
      imwebProdCodes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!course) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">강좌를 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  // NOTE: Prisma Client가 아직 relatedTextbookIds/relatedCourseIds를 모르는 상태에서도
  // 관리자 UI에 저장된 선택값을 다시 보여주기 위해 raw로 읽어옵니다.
  let savedAddons: { relatedTextbookIds: string[]; relatedCourseIds: string[] } = {
    relatedTextbookIds: [],
    relatedCourseIds: [],
  };
  try {
    // Ensure columns exist on DB (safe on existing DBs). Prevents 42703 "column does not exist".
    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedTextbookIds" JSONB;'
      );
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedCourseIds" JSONB;'
      );
    } catch (e) {
      console.error("[AdminCoursePage] failed to ensure addons columns:", e);
    }

    const rows = (await prisma.$queryRawUnsafe(
      'SELECT "relatedTextbookIds", "relatedCourseIds" FROM "Course" WHERE "id" = $1',
      course.id
    )) as any[];
    const r = rows?.[0] ?? {};
    const tb = r.relatedTextbookIds;
    const cs = r.relatedCourseIds;
    savedAddons = {
      relatedTextbookIds: Array.isArray(tb) ? tb : [],
      relatedCourseIds: Array.isArray(cs) ? cs : [],
    };
  } catch (e) {
    console.error("[AdminCoursePage] failed to load saved addons columns:", e);
  }

  // "교재 함께 구매"에 표시할 교재 선택을 위해, 동일 소유자의 "판매 물품(상품 등록된 교재)"만 불러옵니다.
  // 스토어(/store) 및 /admin/textbooks(교재 판매하기) 기준과 동일:
  // - 공개(isPublished)
  // - 판매가/정가 중 하나라도 설정된 항목만
  const otherTextbooks = await prisma.textbook.findMany({
    where: {
      ownerId: teacher.id,
      isPublished: true,
      OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
    },
    select: {
      id: true,
      title: true,
      subjectName: true,
      teacherName: true,
      price: true,
      originalPrice: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // "추가 상품(강의)" 선택을 위해, 동일 소유자의 공개 강좌 목록을 불러옵니다(현재 강좌 제외).
  const otherCourses = await prisma.course.findMany({
    where: { ownerId: teacher.id, isPublished: true, id: { not: course.id } },
    select: { id: true, title: true, subjectName: true, teacherName: true, price: true },
    orderBy: { createdAt: "desc" },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: course.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { id: true, email: true } } },
  });

  const lessonIds = course.lessons.map((l) => l.id);
  const userIds = enrollments.map((e) => e.userId);
  const progressByUserId =
    lessonIds.length && userIds.length
      ? await prisma.progress.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, lessonId: { in: lessonIds } },
          _avg: { percent: true },
          _max: { updatedAt: true },
        })
      : [];
  const progressSummaryMap = new Map(
    progressByUserId.map((r) => [
      r.userId,
      {
        avgPercent: r._avg.percent ?? 0,
        lastAt: r._max.updatedAt ?? null,
      },
    ])
  );

  const fmtShortDate = (d: Date) => d.toISOString().slice(2, 10).replace(/-/g, ".");

  return (
    <AppShell>
      <PageHeader
        title="강좌 관리"
        description={`${course.title} · 주소: ${course.slug}`}
        right={
          <>
            <ConfirmDeleteCourseForm courseId={course.id} />
          </>
        }
      />

      <Tabs
        activeKey={tab}
        items={[
          { key: "settings", label: "설정", href: `/admin/course/${course.id}?tab=settings` },
          { key: "addons", label: "추가 상품", href: `/admin/course/${course.id}?tab=addons` },
          { key: "curriculum", label: "강의목록", href: `/admin/course/${course.id}?tab=curriculum` },
          { key: "students", label: "수강학생", href: `/admin/course/${course.id}?tab=students` },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tab === "settings" ? (
          <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader
                title="강좌 설정"
                right={
                  <PublishToggleClient
                    courseId={course.id}
                    initialValue={course.isPublished}
                    initialSoldOut={(course as any).isSoldOut ?? false}
                  />
                }
              />
              <CardBody>
                <CourseSettingsAutoSaveClient
                  courseId={course.id}
                  initial={{
                    title: course.title,
                    slug: course.slug,
                    teacherName: course.teacherName,
                    subjectName: course.subjectName,
                    enrollmentDays: course.enrollmentDays,
                  }}
                />

                {thumbMsg === "saved" ? (
                  <p className="mt-2 text-sm text-white/70">썸네일이 저장되었습니다.</p>
                ) : thumbMsg === "error" ? (
                  <p className="mt-2 text-sm text-red-600">업로드에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
                ) : null}

                <CourseThumbnailUploadClient
                  courseId={course.id}
                  hasThumbnail={Boolean(course.thumbnailStoredPath || course.thumbnailUrl)}
                  initialPreviewVimeoId={course.previewVimeoId}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="상세 페이지 설정"
                description="스토어에 표시되는 강좌 상세 페이지의 내용을 설정합니다."
              />
              <CardBody>
                <CourseDetailPageClient
                  courseId={course.id}
                  initial={{
                    price: course.price ?? null,
                    originalPrice: course.originalPrice ?? null,
                    teacherTitle: course.teacherTitle ?? null,
                    teacherDescription: course.teacherDescription ?? null,
                    tags: (course.tags as string[] | null) ?? [],
                    benefits: (course.benefits as string[] | null) ?? [],
                  }}
                />
              </CardBody>
            </Card>
          </div>
        ) : tab === "addons" ? (
          <Card className="lg:col-span-3">
            <CardHeader
              title="추가 상품"
              description="강의 상세 우측 메뉴에 표시될 추가 상품(강의/교재)을 선택합니다."
            />
            <CardBody>
              <CourseAddonsClient
                courseId={course.id}
                initial={{
                  relatedTextbookIds: savedAddons.relatedTextbookIds,
                  relatedCourseIds: savedAddons.relatedCourseIds,
                }}
                textbooks={otherTextbooks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  meta: `${t.subjectName || "교재"} · ${t.teacherName || "선생님"}`,
                  price: t.price ?? 0,
                }))}
                courses={otherCourses.map((c) => ({
                  id: c.id,
                  title: c.title,
                  meta: `${c.subjectName || "강좌"} · ${c.teacherName || "선생님"}`,
                  price: c.price ?? 0,
                }))}
              />
            </CardBody>
          </Card>
        ) : tab === "students" ? (
          <Card className="lg:col-span-3">
            <CardHeader
              title="수강학생"
              description="이 강좌를 수강 중/수강했던 학생 목록입니다."
              right={<Badge tone={enrollments.length ? "neutral" : "muted"}>{enrollments.length}명</Badge>}
            />
            <CardBody>
              {/* 등록 결과 메시지 */}
              {enrollMsg === "success" && (
                <p className="mb-3 text-sm text-emerald-400">수강생이 등록되었습니다.</p>
              )}
              {enrollMsg === "removed" && (
                <p className="mb-3 text-sm text-white/70">수강생이 삭제되었습니다.</p>
              )}
              {enrollMsg === "invalid" && (
                <p className="mb-3 text-sm text-red-400">올바른 이메일 주소를 입력해주세요.</p>
              )}
              {enrollMsg === "error" && (
                <p className="mb-3 text-sm text-red-400">오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
              )}

              {/* 수강생 추가 폼 */}
              <form action="/api/admin/enrollments/add" method="post" className="mb-5">
                <input type="hidden" name="courseId" value={course.id} />
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-md">
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="이메일 주소 입력 후 Enter"
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 pr-20 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/15"
                    >
                      추가
                    </button>
                  </div>
                  <HelpTip text={`수강 기간: ${course.enrollmentDays}일`} />
                </div>
              </form>

              {enrollments.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-white/60">
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-3">이메일</th>
                        <th className="py-3 pr-3">상태</th>
                        <th className="py-3 pr-3">수강기간</th>
                        <th className="py-3 pr-3">등록일</th>
                        <th className="py-3 pr-3">최근 학습</th>
                        <th className="py-3 pr-3 text-right">평균 진도</th>
                        <th className="py-3 pr-3 text-right" aria-label="액션"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((e) => {
                        const s = progressSummaryMap.get(e.userId) ?? { avgPercent: 0, lastAt: null };
                        const avg = Math.round(Math.max(0, Math.min(100, s.avgPercent)));
                        return (
                          <tr key={e.id} className="border-b border-white/10">
                            <td className="py-3 pr-3">
                              <div className="truncate font-medium text-white">{e.user.email}</div>
                            </td>
                            <td className="py-3 pr-3">
                              <Badge tone={e.status === "ACTIVE" ? "success" : "muted"}>{e.status}</Badge>
                            </td>
                            <td className="py-3 pr-3 text-white/70">
                              {fmtShortDate(e.startAt)}~{fmtShortDate(e.endAt)}
                            </td>
                            <td className="py-3 pr-3 text-white/60">{fmtShortDate(e.createdAt)}</td>
                            <td className="py-3 pr-3 text-white/60">{s.lastAt ? fmtShortDate(s.lastAt) : "-"}</td>
                            <td className="py-3 pr-3 text-right text-white/80">{avg}%</td>
                            <td className="py-3 pr-3">
                              <ConfirmDeleteIconButton
                                action="/api/admin/enrollments/remove"
                                hiddenInputs={[{ name: "enrollmentId", value: e.id }]}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-white/60">수강학생이 없습니다.</p>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader
                title="강의목록"
                right={<Badge tone={course.lessons.length ? "neutral" : "muted"}>{course.lessons.length}개</Badge>}
              />
              <CardBody>
              <form action="/api/admin/lessons/create" method="post">
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="isPublished" value="1" />
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 group">
                    <input
                      id="lessonVimeoId"
                      name="vimeoVideoId"
                      required
                      placeholder="Vimeo URL 또는 ID 입력 후 Enter"
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 pr-24 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/15"
                    >
                      추가
                    </button>
                  </div>
                  <div className="relative group shrink-0">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                      aria-label="도움말"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <div className="pointer-events-none absolute right-0 top-0 z-50 hidden w-[280px] -translate-y-[calc(100%+8px)] rounded-lg border border-white/10 bg-[#1d1d1f] px-3 py-2 text-xs text-white/70 shadow-xl group-hover:block">
                      Vimeo URL 또는 ID를 입력하면 제목이 자동으로 설정됩니다.
                      <br /><span className="text-white/50">예: https://vimeo.com/123456789</span>
                    </div>
                  </div>
                </div>
              </form>

              <div className="mt-5">
                <LessonListClient
                  courseId={course.id}
                  initialLessons={course.lessons.map((l) => ({
                    id: l.id,
                    position: l.position,
                    title: l.title,
                    vimeoVideoId: l.vimeoVideoId,
                    isPublished: l.isPublished,
                    attachmentCount: l.attachments.length,
                  }))}
                />
              </div>
            </CardBody>
            </Card>
          </div>
        )}

      </div>
    </AppShell>
  );
}


