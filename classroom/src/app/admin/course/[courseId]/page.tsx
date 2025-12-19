import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Tabs, Textarea } from "@/app/_components/ui";

export default async function AdminCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const teacher = await requireAdminUser();
  const { courseId } = await params;
  const sp = (await searchParams) ?? {};
  const tab = (sp.tab || "curriculum") as "curriculum" | "materials" | "settings" | "integrations";

  const course = await prisma.course.findUnique({
    where: { id: courseId, ownerId: teacher.id },
    include: {
      lessons: { orderBy: { position: "asc" }, include: { attachments: { select: { id: true } } } },
      attachments: { where: { lessonId: null }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!course) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">강좌를 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="강좌 관리"
        description={`${course.title} · slug: ${course.slug}`}
        right={
          <>
            <Button href={`/course/${course.id}`} variant="secondary">
              강좌 미리보기
            </Button>
            <form action="/api/admin/courses/delete" method="post">
              <input type="hidden" name="courseId" value={course.id} />
              <Button type="submit" variant="danger">
                강좌 삭제
              </Button>
            </form>
          </>
        }
      />

      <Tabs
        activeKey={tab}
        items={[
          { key: "curriculum", label: "커리큘럼", href: `/admin/course/${course.id}?tab=curriculum` },
          { key: "materials", label: "자료", href: `/admin/course/${course.id}?tab=materials` },
          { key: "settings", label: "설정", href: `/admin/course/${course.id}?tab=settings` },
          { key: "integrations", label: "연동/운영", href: `/admin/course/${course.id}?tab=integrations` },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tab === "settings" ? (
          <Card className="lg:col-span-2">
            <CardHeader title="강좌 설정" description="기본 정보 + 공개 상태" />
            <CardBody>
              <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/courses/update" method="post">
                <input type="hidden" name="courseId" value={course.id} />
                <div className="md:col-span-7">
                  <Field label="제목">
                    <Input name="title" defaultValue={course.title} required />
                  </Field>
                </div>
                <div className="md:col-span-5">
                  <Field label="slug">
                    <Input name="slug" defaultValue={course.slug} required />
                  </Field>
                </div>
                <div className="md:col-span-12">
                  <Field label="강좌 소개(선택)">
                    <Textarea name="description" defaultValue={course.description ?? ""} rows={4} />
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
        ) : tab === "materials" ? (
          <Card className="lg:col-span-2">
            <CardHeader title="강좌 공통 자료" description="강좌 전체에 공통으로 제공되는 자료입니다." right={<Badge tone={course.attachments.length ? "neutral" : "muted"}>{course.attachments.length}개</Badge>} />
            <CardBody>
              <form className="space-y-2" action="/api/admin/attachments/upload" method="post" encType="multipart/form-data">
                <input type="hidden" name="courseId" value={course.id} />
                <Field label="파일">
                  <input className="block w-full text-sm" type="file" name="file" required />
                </Field>
                <Field label="자료 제목(선택)">
                  <Input name="title" placeholder="예: 강좌 공통 안내문" />
                </Field>
                <Button type="submit" variant="secondary">
                  업로드
                </Button>
              </form>

              {course.attachments.length ? (
                <ul className="mt-4 space-y-2">
                  {course.attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{a.title}</div>
                        <div className="truncate text-xs text-white/60">{a.originalName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button href={`/api/attachments/${a.id}/download`} variant="ghost" size="sm">
                          다운로드
                        </Button>
                        <form action={`/api/admin/attachments/${a.id}/delete`} method="post">
                          <Button type="submit" variant="danger" size="sm">
                            삭제
                          </Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-white/60">등록된 자료가 없습니다.</p>
              )}
            </CardBody>
          </Card>
        ) : tab === "integrations" ? (
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader title="아임웹 상품 매핑" description="prod_no 또는 prod_custom_code로 자동 매칭합니다." />
              <CardBody>
                <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/courses/update-imweb" method="post">
                  <input type="hidden" name="courseId" value={course.id} />
                  <div className="md:col-span-4">
                    <Field label="prod_no (숫자)">
                      <Input name="imwebProdNo" type="number" defaultValue={course.imwebProdNo ?? ""} />
                    </Field>
                  </div>
                  <div className="md:col-span-8">
                    <Field label="prod_custom_code (문자)">
                      <Input name="imwebProdCode" defaultValue={course.imwebProdCode ?? ""} placeholder="예: COURSE_2025_01" />
                    </Field>
                  </div>
                  <div className="md:col-span-12 flex justify-end">
                    <Button type="submit">저장</Button>
                  </div>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="수강권 발급" description="특정 회원에게 수강권을 수동으로 발급합니다." />
              <CardBody>
                <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/enrollments/grant" method="post">
                  <input type="hidden" name="courseId" value={course.id} />
                  <div className="md:col-span-8">
                    <Field label="회원 이메일">
                      <Input name="email" type="email" required />
                    </Field>
                  </div>
                  <div className="md:col-span-4">
                    <Field label="기간(일)">
                      <Input name="days" type="number" defaultValue={365} min={1} max={3650} />
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
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader
              title="커리큘럼(차시)"
              description="차시는 목록에서 관리하고, 상세 편집은 ‘편집’ 페이지에서 합니다."
              right={<Badge tone={course.lessons.length ? "neutral" : "muted"}>{course.lessons.length}개</Badge>}
            />
            <CardBody>
              <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/lessons/create" method="post">
                <input type="hidden" name="courseId" value={course.id} />
                <div className="md:col-span-6">
                  <Field label="차시 제목">
                    <Input name="title" required placeholder="예: 5강. 함수의 극한" />
                  </Field>
                </div>
                <div className="md:col-span-4">
                  <Field label="Vimeo ID">
                    <Input name="vimeoVideoId" required placeholder="76979871" />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="길이(초)">
                    <Input name="durationSeconds" type="number" min={0} placeholder="930" />
                  </Field>
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
                      <th className="py-3 pr-3 text-right">액션</th>
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
                            <Button href={`/lesson/${l.id}`} variant="secondary" size="sm">
                              미리보기
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
              <div className="flex items-center justify-between">
                <span>공통 자료</span>
                <span>{course.attachments.length}개</span>
              </div>
              <div className="pt-2">
                <Button href="/admin" variant="ghost">
                  강의 관리 플랫폼으로
                </Button>
              </div>
            </CardBody>
          </Card>

          {tab === "curriculum" ? (
            <Card>
              <CardHeader title="안내" description="차시 상세 편집(설명/목표/목차/자료)은 ‘편집’ 버튼에서 합니다." />
              <CardBody>
                <p className="text-sm text-white/60">
                  한 화면에서 혼잡하지 않도록 목록(커리큘럼)과 상세 편집 화면을 분리했습니다.
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}


