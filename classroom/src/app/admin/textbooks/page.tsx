import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Button, Card, CardBody, CardHeader, Field, Input, PageHeader } from "@/app/_components/ui";
import Link from "next/link";
import TextbookAutoThumbnail from "@/app/_components/TextbookAutoThumbnail";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export default async function AdminTextbooksPage() {
  const teacher = await requireAdminUser();

  const textbooksRaw = await prisma.textbook.findMany({
    where: { ownerId: teacher.id },
    orderBy: [{ createdAt: "desc" }],
  });

  // entitlementDays 안전 처리 (마이그레이션 미적용 시 기본값)
  const textbooks = textbooksRaw.map((t) => ({
    ...t,
    entitlementDays: (t as { entitlementDays?: number }).entitlementDays ?? 30,
  }));

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
              <div className="md:col-span-3">
                <Field label="교재 제목(선택)">
                  <Input name="title" placeholder="예: 2027 수학 교재 PDF" className="bg-transparent" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="과목">
                  <Input name="subjectName" placeholder="예: 수학" className="bg-transparent" />
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field label="구글 업로드 URL">
                  <Input
                    name="url"
                    required
                    placeholder="예: https://storage.googleapis.com/버킷/파일.pdf"
                    className="bg-transparent"
                  />
                </Field>
              </div>
              <div className="md:col-span-1">
                <Field label="이용 기간(일)">
                  <Input
                    name="entitlementDays"
                    type="number"
                    min={1}
                    max={3650}
                    defaultValue={30}
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
              <Link
                key={t.id}
                href={`/admin/textbook/${t.id}`}
                className="group block rounded-xl border border-white/10 bg-[#1a1a1c] p-4 transition-colors hover:bg-white/[0.04] hover:border-white/20"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* 왼쪽: 교재 정보 */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* PDF 썸네일 (자동 생성) */}
                    <TextbookAutoThumbnail
                      textbookId={t.id}
                      existingThumbnailUrl={t.thumbnailUrl}
                      sizeBytes={t.sizeBytes}
                    />

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

                      {/* 상품 코드 표시 */}
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {t.imwebProdCode ? (
                          <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/70">코드: {t.imwebProdCode}</span>
                        ) : (
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-white/40">전체 공개</span>
                        )}
                        <span className="text-white/40">{t.entitlementDays}일</span>
                      </div>
                    </div>
                  </div>

                  {/* 오른쪽: 상태 */}
                  <div className="flex items-center gap-3 lg:shrink-0">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      t.isPublished ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                    }`}>
                      {t.isPublished ? "공개" : "비공개"}
                    </span>
                    <span className="text-white/40 text-sm">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#1a1a1c] p-8 text-center">
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


