import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, Field, HelpTip, Input, PageHeader } from "@/app/_components/ui";
import TextbookPublishedSelect from "@/app/_components/TextbookPublishedSelect";
import TextbookThumbnailGenerator from "@/app/_components/TextbookThumbnailGenerator";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export default async function AdminTextbooksPage() {
  const teacher = await requireAdminUser();

  const textbooks = await prisma.textbook.findMany({
    where: { ownerId: teacher.id },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      isPublished: true,
      originalName: true,
      sizeBytes: true,
      createdAt: true,
      imwebProdCode: true,
      thumbnailUrl: true,
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="교재 관리하기"
        right={
          <div className="flex items-center gap-2">
            <Button href="/admin/courses" variant="secondary">
              강좌 관리하기
            </Button>
            <Button href="/admin/events" variant="secondary">
              웹훅/이벤트 로그
            </Button>
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader title="교재 추가" />
          <CardBody>
            <form
              className="grid grid-cols-1 gap-4 md:grid-cols-12"
              action="/api/admin/textbooks/create"
              method="post"
            >
              <div className="md:col-span-5">
                <Field label="교재 제목(선택)">
                  <Input name="title" placeholder="예: 2027 수학 교재 PDF" className="bg-transparent" />
                </Field>
              </div>
              <div className="md:col-span-5">
                <Field label="구글 업로드 URL">
                  <Input
                    name="url"
                    required
                    placeholder="예: https://storage.googleapis.com/버킷/파일.pdf"
                    className="bg-transparent"
                  />
                </Field>
              </div>
              <div className="md:col-span-2 flex items-end">
                <input type="hidden" name="isPublished" value="1" />
                <Button type="submit" variant="secondary" className="w-full">
                  추가
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {textbooks.length ? (
          <div className="grid grid-cols-1 gap-3">
            {textbooks.map((t) => (
              <div
                key={t.id}
                className="group rounded-xl border border-white/10 bg-[#212123] p-4 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* 왼쪽: 교재 정보 */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* PDF 아이콘 */}
                    <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20">
                      <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1.25v3.75H8.5V13zm2.5 0h1.25v3.75H11V13zm2.5 0h1.25v1.5c0 .414.336.75.75.75h.75v1.5h-.75A2.252 2.252 0 0 1 13.5 14.5V13z"/>
                      </svg>
                    </div>

                    {/* 제목 및 메타 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{t.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
                        <span className="truncate max-w-[200px]" title={t.originalName}>{t.originalName}</span>
                        <span>•</span>
                        <span>{formatBytes(t.sizeBytes)}</span>
                        <span>•</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* 상품 코드 입력 */}
                      <form className="mt-3" action="/api/admin/textbooks/update-imweb" method="post">
                        <input type="hidden" name="textbookId" value={t.id} />
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-[280px]">
                            <input
                              name="imwebProdCode"
                              defaultValue={t.imwebProdCode ?? ""}
                              placeholder="아임웹 상품 코드"
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
                            />
                          </div>
                          <button
                            type="submit"
                            className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            저장
                          </button>
                          <HelpTip text="상품 코드를 설정하면 구매자만 다운로드할 수 있습니다." />
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* 오른쪽: 상태 및 액션 */}
                  <div className="flex items-center gap-3 lg:shrink-0">
                    <TextbookThumbnailGenerator textbookId={t.id} hasThumbnail={!!t.thumbnailUrl} />
                    <TextbookPublishedSelect textbookId={t.id} isPublished={t.isPublished} />
                    
                    <div className="flex items-center gap-1">
                      <a
                        href={`/api/admin/textbooks/${t.id}/download`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                        title="다운로드"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                      <form action={`/api/admin/textbooks/${t.id}/delete`} method="post">
                        <button
                          type="submit"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#212123] p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-white/50">업로드된 교재가 없습니다.</p>
            <p className="mt-1 text-xs text-white/30">위에서 교재를 추가해보세요.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}


