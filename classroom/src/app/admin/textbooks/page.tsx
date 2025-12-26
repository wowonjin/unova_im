import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Button, Card, CardBody, CardHeader, Field, Input, PageHeader } from "@/app/_components/ui";
import Link from "next/link";
import TextbookAutoThumbnail from "@/app/_components/TextbookAutoThumbnail";
import ConfirmDeleteButton from "@/app/_components/ConfirmDeleteButton";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export default async function AdminTextbooksPage() {
  const teacher = await requireAdminUser();

  // NOTE: Render 등 운영 환경에서 마이그레이션 미적용(컬럼 누락) 상태면
  // Prisma가 기본적으로 모든 컬럼을 조회하다가 크래시가 날 수 있어 방어적으로 조회합니다.
  let textbooks: Array<{
    id: string;
    title: string;
    originalName: string;
    sizeBytes: number;
    createdAt: Date;
    isPublished: boolean;
    imwebProdCode: string | null;
    thumbnailUrl: string | null;
    // Optional (DB에 없을 수도 있음)
    entitlementDays?: number | null;
  }> = [];

  try {
    textbooks = await prisma.textbook.findMany({
      where: { ownerId: teacher.id },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        originalName: true,
        sizeBytes: true,
        createdAt: true,
        isPublished: true,
        imwebProdCode: true,
        thumbnailUrl: true,
        // 있으면 쓰고, 없으면 아래에서 기본값 처리
        entitlementDays: true,
      },
    });
  } catch (e) {
    console.error("[AdminTextbooksPage] textbook.findMany failed (likely migration mismatch):", e);
    // 최소 컬럼만으로 재시도 (누락 컬럼이 있어도 페이지는 뜨게)
    textbooks = await prisma.textbook.findMany({
      where: { ownerId: teacher.id },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        originalName: true,
        sizeBytes: true,
        createdAt: true,
        isPublished: true,
        imwebProdCode: true,
        thumbnailUrl: true,
      },
    });
  }

  const textbooksWithDefaults = textbooks.map((t) => ({
    ...t,
    entitlementDays: (t as { entitlementDays?: number | null }).entitlementDays ?? 30,
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
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader title="교재 추가" />
          <CardBody>
            <form className="space-y-4" action="/api/admin/textbooks/create" method="post">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Field label="교재 제목(선택)">
                    <Input name="title" placeholder="예: 2027 수학 교재 PDF" className="bg-transparent" />
                  </Field>
                </div>
                <div className="md:col-span-4">
                  <Field label="출판한 선생님 이름(선택)">
                    <Input name="teacherName" placeholder="예: 홍길동" className="bg-transparent" />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="과목">
                    <Input name="subjectName" placeholder="예: 수학" className="bg-transparent" />
                  </Field>
                </div>
                <div className="md:col-span-2">
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

                <div className="md:col-span-2">
                  <Field label="할인 가격(원)">
                    <Input
                      name="price"
                      type="number"
                      min={0}
                      step={100}
                      placeholder="예: 49000"
                      className="bg-transparent"
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="원래 가격(원)">
                    <Input
                      name="originalPrice"
                      type="number"
                      min={0}
                      step={100}
                      placeholder="예: 99000"
                      className="bg-transparent"
                    />
                  </Field>
                </div>

                <div className="md:col-span-12">
                  <Field label="구글 업로드 URL">
                    <Input
                      name="url"
                      required
                      placeholder="예: https://storage.googleapis.com/버킷/파일.pdf"
                      className="bg-transparent"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/40">제목/선생님 이름/과목은 스토어 노출용 정보입니다. URL은 필수입니다.</p>
                <div className="shrink-0">
                  <input type="hidden" name="isPublished" value="1" />
                  <Button type="submit" variant="secondary">
                    추가
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>

        {textbooksWithDefaults.length ? (
          <div className="grid grid-cols-1 gap-3">
            {textbooksWithDefaults.map((t) => (
              <div
                key={t.id}
                className="group rounded-xl border border-white/10 bg-[#1a1a1c] p-4 transition-colors hover:bg-white/[0.04] hover:border-white/20"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* 왼쪽: 교재 정보 (클릭 시 상세로 이동) */}
                  <Link href={`/admin/textbook/${t.id}`} className="flex items-start gap-4 flex-1 min-w-0">
                    {/* PDF 썸네일 (자동 생성) */}
                    <TextbookAutoThumbnail textbookId={t.id} existingThumbnailUrl={t.thumbnailUrl} sizeBytes={t.sizeBytes} />

                    {/* 제목 및 메타 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{t.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
                        <span className="truncate max-w-[200px]" title={t.originalName}>
                          {t.originalName}
                        </span>
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
                  </Link>

                  {/* 오른쪽: 상태 + 액션 */}
                  <div className="flex items-center gap-3 lg:shrink-0">
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        t.isPublished ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                      }`}
                    >
                      {t.isPublished ? "공개" : "비공개"}
                    </span>
                    <span className="text-white/40 text-sm">→</span>
                    <ConfirmDeleteButton
                      action={`/api/admin/textbooks/${t.id}/delete`}
                      message="정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                      label="삭제"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#1a1a1c] p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
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


