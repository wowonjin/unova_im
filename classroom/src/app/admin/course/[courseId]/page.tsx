import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, Field, HelpTip, Input, PageHeader, Tabs } from "@/app/_components/ui";
import ConfirmDeleteCourseForm from "@/app/_components/ConfirmDeleteCourseForm";
import ImwebProdCodeFormClient from "@/app/_components/ImwebProdCodeFormClient";

export default async function AdminCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ tab?: string; imweb?: string }>;
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
          { key: "curriculum", label: "커리큘럼", href: `/admin/course/${course.id}?tab=curriculum` },
          { key: "students", label: "수강학생", href: `/admin/course/${course.id}?tab=students` },
          { key: "settings", label: "설정/연동", href: `/admin/course/${course.id}?tab=settings` },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tab === "settings" ? (
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader title="강좌 설정" description="기본 정보 + 공개 상태" />
              <CardBody>
                <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/courses/update" method="post">
                  <input type="hidden" name="courseId" value={course.id} />
                  <div className="md:col-span-7">
                    <Field label="강좌 제목" hint="학생에게 보이는 강좌 이름입니다.">
                      <Input name="title" defaultValue={course.title} required className="bg-transparent" />
                    </Field>
                  </div>
                  <div className="md:col-span-5">
                    <Field
                      label={
                        <span className="inline-flex items-center">
                          주소 이름(링크용)
                          <HelpTip text="강좌 링크 주소에 들어가는 짧은 이름입니다. 보통 영어/숫자/하이픈(-)을 사용합니다. 예: connect-math-2027" />
                        </span>
                      }
                      hint="예: connect-math-2027"
                    >
                      <Input name="slug" defaultValue={course.slug} required className="bg-transparent" />
                    </Field>
                  </div>

                  <div className="md:col-span-12 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-white/70">
                      <input type="checkbox" name="isPublished" defaultChecked={course.isPublished} />
                      공개
                    </label>
                    <Button type="submit">저장</Button>
                  </div>
                </form>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <div className="text-sm font-medium text-white">썸네일</div>
                  <p className="mt-1 text-xs text-white/50">이미지 파일로 업로드합니다.</p>

                  {course.thumbnailStoredPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/courses/${course.id}/thumbnail`}
                      alt="강좌 썸네일"
                      className="mt-3 h-28 w-52 rounded-xl object-cover border border-white/10 bg-white/5"
                    />
                  ) : null}

                  <form className="mt-3 flex flex-col gap-2 md:flex-row md:items-end" action="/api/admin/courses/thumbnail" method="post" encType="multipart/form-data">
                    <input type="hidden" name="courseId" value={course.id} />
                    <div className="flex-1">
                      <Field label="이미지 파일">
                        <input className="block w-full text-sm" type="file" name="thumbnail" accept="image/*" required />
                      </Field>
                    </div>
                    <Button type="submit" variant="secondary">
                      업로드
                    </Button>
                  </form>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="아임웹 연동(상품 코드)"
                description="아임웹에서 결제 완료가 되면, 여기의 ‘상품 코드’와 같은 주문을 찾아 수강권을 자동 발급합니다."
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
                <ImwebProdCodeFormClient courseId={course.id} initialCode={course.imwebProdCodes[0]?.code ?? ""} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="수강권 발급(수동)" description="특정 회원에게 수강권을 수동으로 발급합니다." />
              <CardBody>
                <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/enrollments/grant" method="post">
                  <input type="hidden" name="courseId" value={course.id} />
                  <div className="md:col-span-8">
                    <Field
                      label={
                        <span className="inline-flex items-center">
                          회원 이메일
                          <HelpTip text="아임웹 주문(결제)에서 사용한 이메일과 동일해야 합니다. 자동 발급이 어려울 때 임시로 수동 발급에 사용합니다." />
                        </span>
                      }
                      hint="아임웹 결제 이메일과 동일해야 합니다."
                    >
                      <Input name="email" type="email" required className="bg-transparent" />
                    </Field>
                  </div>
                  <div className="md:col-span-4">
                    <Field label="기간(일)">
                      <Input name="days" type="number" defaultValue={365} min={1} max={3650} className="bg-transparent" />
                    </Field>
                  </div>
                  <div className="md:col-span-12 flex justify-end">
                    <Button type="submit" variant="secondary">
                      발급
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        ) : tab === "students" ? (
          <Card className="lg:col-span-2">
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
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader
                title="커리큘럼(차시)"
                right={<Badge tone={course.lessons.length ? "neutral" : "muted"}>{course.lessons.length}개</Badge>}
              />
              <CardBody>
              <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/lessons/create" method="post">
                <input type="hidden" name="courseId" value={course.id} />
                <div className="md:col-span-7">
                  <div>
                    <div className="flex h-5 items-center gap-2 mt-0.5">
                      <label htmlFor="lessonTitle" className="block text-xs font-medium text-white/80">
                        차시 제목
                      </label>
                      {/* Vimeo ID 라벨과 높이 정렬용(동일한 버튼 자리) */}
                      <span className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="mt-1">
                      <Input id="lessonTitle" name="title" required placeholder="예: 5강. 함수의 극한" className="bg-transparent" />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="lessonVimeoId" className="block text-xs font-medium text-white/80">
                        Vimeo ID
                      </label>
                      <div className="relative group">
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] font-bold leading-none text-white/80 hover:bg-white/10"
                          aria-label="Vimeo ID 안내"
                        >
                          !
                        </button>
                        <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden w-[360px] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border border-white/10 bg-[#1d1d1f] px-3 py-2 text-xs text-white/80 shadow-lg group-hover:block">
                          https://vimeo.com/123456789라면, 여기서 123456789만 복사해서 넣으면 됩니다.
                        </div>
                      </div>
                    </div>
                    <div className="mt-1">
                      <Input id="lessonVimeoId" name="vimeoVideoId" required placeholder="76979871" className="bg-transparent" />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-12 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-white/70">
                    <input type="checkbox" name="isPublished" defaultChecked />
                    공개
                  </label>
                  <Button type="submit" variant="secondary">
                    차시 추가
                  </Button>
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

        <div className="space-y-4">
          <Card>
            <CardHeader title="요약" />
            <CardBody className="space-y-2 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>강좌 상태</span>
                <Badge tone={course.isPublished ? "neutral" : "muted"}>{course.isPublished ? "공개" : "비공개"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>차시</span>
                <span>{course.lessons.length}개</span>
              </div>
            </CardBody>
          </Card>

          {/* (removed) curriculum 안내 카드 */}
        </div>
      </div>
    </AppShell>
  );
}


