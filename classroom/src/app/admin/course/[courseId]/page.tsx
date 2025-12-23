import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, Field, HelpTip, Input, PageHeader, Tabs } from "@/app/_components/ui";
import ConfirmDeleteCourseForm from "@/app/_components/ConfirmDeleteCourseForm";
import ImwebProdCodeFormClient from "@/app/_components/ImwebProdCodeFormClient";
import CourseThumbnailUploadClient from "@/app/_components/CourseThumbnailUploadClient";
import CourseSettingsAutoSaveClient from "@/app/_components/CourseSettingsAutoSaveClient";
import PublishToggleClient from "@/app/_components/PublishToggleClient";

export default async function AdminCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ tab?: string; imweb?: string; thumb?: string }>;
}) {
  const teacher = await requireAdminUser();
  const { courseId } = await params;
  const sp = (await searchParams) ?? {};
  const tabRaw = sp.tab || "curriculum";
  const tab = (tabRaw === "integrations" ? "settings" : tabRaw === "materials" ? "curriculum" : tabRaw) as
    | "curriculum"
    | "students"
    | "settings";
  const imwebMsg = sp.imweb || null;
  const thumbMsg = sp.thumb || null;

  const course = await prisma.course.findUnique({
    where: { id: courseId, ownerId: teacher.id },
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
          { key: "settings", label: "설정/연동", href: `/admin/course/${course.id}?tab=settings` },
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
                right={<PublishToggleClient courseId={course.id} initialValue={course.isPublished} />}
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

                <CourseThumbnailUploadClient courseId={course.id} hasThumbnail={Boolean(course.thumbnailStoredPath || course.thumbnailUrl)} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="아임웹 연동(상품 코드)"
                description="아임웹에서 결제 완료가 되면, 여기의 '상품 코드'와 같은 주문을 찾아 수강권을 자동 발급합니다."
              />
              <CardBody>
                {imwebMsg === "duplicate" ? (
                  <p className="mb-3 text-sm text-red-600">이미 다른 강좌에 등록된 상품 코드입니다.</p>
                ) : imwebMsg === "saved" ? (
                  <p className="mb-3 text-sm text-white/70">상품 코드가 저장되었습니다.</p>
                ) : imwebMsg === "cleared" ? (
                  <p className="mb-3 text-sm text-white/70">아임웹 연동이 해제되었습니다.</p>
                ) : imwebMsg === "error" ? (
                  <p className="mb-3 text-sm text-red-600">저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
                ) : null}
                <ImwebProdCodeFormClient courseId={course.id} codes={course.imwebProdCodes.map(c => ({ id: c.id, code: c.code }))} />
              </CardBody>
            </Card>

          </div>
        ) : tab === "students" ? (
          <Card className="lg:col-span-3">
            <CardHeader
              title="수강학생"
              description="이 강좌를 수강 중/수강했던 학생 목록입니다."
              right={<Badge tone={enrollments.length ? "neutral" : "muted"}>{enrollments.length}명</Badge>}
            />
            <CardBody>
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

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-white/60">
                    <tr className="border-b border-white/10">
                      <th className="py-3 pr-3">순서</th>
                      <th className="py-3 pr-3">제목</th>
                      <th className="py-3 pr-3">상태</th>
                      <th className="py-3 pr-3">자료</th>
                      <th className="py-3 pr-3 text-right" aria-label="액션" />
                    </tr>
                  </thead>
                  <tbody>
                    {course.lessons.map((l) => (
                      <tr key={l.id} className="border-b border-white/10">
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge>{l.position}강</Badge>
                            <form action="/api/admin/lessons/move" method="post">
                              <input type="hidden" name="lessonId" value={l.id} />
                              <input type="hidden" name="dir" value="up" />
                              <Button type="submit" variant="ghost" size="sm">
                                ↑
                              </Button>
                            </form>
                            <form action="/api/admin/lessons/move" method="post">
                              <input type="hidden" name="lessonId" value={l.id} />
                              <input type="hidden" name="dir" value="down" />
                              <Button type="submit" variant="ghost" size="sm">
                                ↓
                              </Button>
                            </form>
                          </div>
                        </td>
                        <td className="py-3 pr-3 min-w-[280px]">
                          <div className="font-medium text-white">{l.title}</div>
                          <div className="mt-1 text-xs text-white/50">Vimeo: {l.vimeoVideoId}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge tone={l.isPublished ? "neutral" : "muted"}>{l.isPublished ? "공개" : "비공개"}</Badge>
                        </td>
                        <td className="py-3 pr-3 text-white/60">{l.attachments.length}개</td>
                        <td className="py-3 pr-3">
                          <div className="flex justify-end gap-2">
                            <Button href={`/admin/lesson/${l.id}`} size="sm">
                              편집
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
            </Card>
          </div>
        )}

      </div>
    </AppShell>
  );
}


