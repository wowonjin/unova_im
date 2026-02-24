import Link from "next/link";
import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Textarea } from "@/app/_components/ui";
import { fetchVimeoOembedMeta } from "@/lib/vimeo-oembed";

function joinLines(v: unknown) {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string").join("\n") : "";
}

export default async function AdminLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const teacher = await requireAdminUser();
  const { lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      course: { select: { id: true, title: true, slug: true, ownerId: true } },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lesson || lesson.course.ownerId !== teacher.id) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">강의를 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  // Best-effort: keep title in sync with Vimeo on admin view too (single video, cheap).
  let syncedTitle = lesson.title;
  try {
    const meta = await fetchVimeoOembedMeta(lesson.vimeoVideoId);
    if (meta.title && meta.title !== lesson.title) {
      syncedTitle = meta.title;
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { title: meta.title, durationSeconds: meta.durationSeconds ?? lesson.durationSeconds },
      });
    }
  } catch {
    // ignore
  }

  return (
    <AppShell>
      <PageHeader
        title={`차시 편집 · ${lesson.position}강`}
        description={syncedTitle}
        right={
          <>
            <Button href={`/admin/course/${lesson.courseId}?tab=curriculum`} variant="ghost">
              강좌로
            </Button>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="기본 정보" description="제목/영상/공개 상태를 관리합니다." />
            <CardBody>
              <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/lessons/update" method="post">
                <input type="hidden" name="lessonId" value={lesson.id} />
                {/* durationSeconds 입력 UI는 제거하지만, 값은 유지되도록 hidden으로 전송 */}
                <input type="hidden" name="durationSeconds" value={lesson.durationSeconds ?? ""} />
                {/* Vimeo 제목 동기화(저장 시) */}
                <input type="hidden" name="refreshVimeoTitle" value="1" />

                <div className="md:col-span-7">
                  <Field label="차시 제목(자동)" hint="Vimeo 제목이 자동으로 적용되며, Vimeo에서 바꾸면 우리 사이트도 자동으로 갱신됩니다.">
                    <Input value={syncedTitle} readOnly disabled className="bg-transparent opacity-90" />
                  </Field>
                </div>
                <div className="md:col-span-5">
                  <Field label="Vimeo 영상(URL 또는 ID)">
                    <Input name="vimeoVideoId" defaultValue={lesson.vimeoVideoId} required className="bg-transparent" />
                  </Field>
                </div>

                <div className="md:col-span-12 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-white/70">
                    <input type="checkbox" name="isPublished" defaultChecked={lesson.isPublished} />
                    공개
                  </label>
                  <div className="flex items-center gap-2">
                    <Button type="submit">저장</Button>
                    <Button type="submit" variant="danger" formAction="/api/admin/lessons/delete">
                      삭제
                    </Button>
                  </div>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="강의 설명" description="수강생 화면의 ‘설명’ 탭에 표시됩니다." />
            <CardBody>
              <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/lessons/update" method="post">
                <input type="hidden" name="lessonId" value={lesson.id} />
                <input type="hidden" name="vimeoVideoId" value={lesson.vimeoVideoId} />
                <input type="hidden" name="durationSeconds" value={lesson.durationSeconds ?? ""} />
                <input type="hidden" name="isPublished" value={lesson.isPublished ? "on" : ""} />

                <div className="md:col-span-12">
                  <Field label="설명" hint="줄바꿈은 그대로 표시됩니다.">
                    <Textarea name="description" rows={6} defaultValue={lesson.description ?? ""} />
                  </Field>
                </div>
                <div className="md:col-span-6">
                  <Field label="학습 목표(한 줄 1개)">
                    <Textarea name="goalsText" rows={6} defaultValue={joinLines(lesson.goals)} />
                  </Field>
                </div>
                <div className="md:col-span-6">
                  <Field label="목차(한 줄 1개)">
                    <Textarea name="outlineText" rows={6} defaultValue={joinLines(lesson.outline)} />
                  </Field>
                </div>
                <div className="md:col-span-12 flex justify-end">
                  <Button type="submit">설명 저장</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-auto lg:pr-1">
          <Card>
            <CardHeader title="강좌" description="현재 차시가 속한 강좌입니다." />
            <CardBody className="space-y-2">
              <div className="text-sm font-medium">{lesson.course.title}</div>
              <div className="text-xs text-white/60">주소: {lesson.course.slug}</div>
              <div className="pt-2">
                <Button href={`/admin/course/${lesson.courseId}?tab=curriculum`} variant="secondary">
                  강좌 커리큘럼
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="차시 자료" description="버킷 공개 URL 등록/다운로드/삭제" right={<Badge tone={lesson.attachments.length ? "neutral" : "muted"}>{lesson.attachments.length}개</Badge>} />
            <CardBody>
              <form className="space-y-2" action="/api/admin/attachments/upload" method="post">
                <input type="hidden" name="lessonId" value={lesson.id} />
                <Field label="파일 URL">
                  <Input
                    name="fileUrl"
                    type="url"
                    required
                    placeholder="https://storage.googleapis.com/your-bucket/path/to/file.pdf"
                  />
                </Field>
                <Button type="submit" variant="secondary">
                  URL 등록
                </Button>
              </form>

              {lesson.attachments.length ? (
                <ul className="mt-4 space-y-2">
                  {lesson.attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {/^https?:\/\//i.test(a.storedPath) ? a.storedPath : a.title}
                        </div>
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

          <Card>
            <CardHeader title="바로가기" />
            <CardBody className="space-y-2">
              <Link className="text-sm text-white/70 underline" href={`/admin`}>
                관리 플랫폼
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}


