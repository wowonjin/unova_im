import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Button, Card, CardBody, CardHeader, Field, Input, PageHeader } from "@/app/_components/ui";
import AdminTextbooksBulkClient from "./AdminTextbooksBulkClient";

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
    teacherName?: string | null;
    subjectName?: string | null;
    price?: number | null;
    originalPrice?: number | null;
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
        teacherName: true,
        subjectName: true,
        price: true,
        originalPrice: true,
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
          <AdminTextbooksBulkClient textbooks={textbooksWithDefaults} />
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


