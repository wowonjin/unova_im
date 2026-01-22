import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import AdminTextbookRegisterFormClient from "./AdminTextbookRegisterFormClient";
import AdminTextbookRegisterLogClient from "./AdminTextbookRegisterLogClient";

type RegisteredTextbookRow = {
  id: string;
  title: string;
  originalName: string;
  createdAt: Date;
  sizeBytes: number;
  pageCount: number | null;
  thumbnailUrl: string | null;
  files?: unknown;
};

function hasRegisterFiles(row: RegisteredTextbookRow) {
  const files = Array.isArray((row as any).files) ? ((row as any).files as any[]) : null;
  return Boolean(files && files.length > 0);
}

export default async function AdminTextbookRegisterPage() {
  const teacher = await requireAdminUser();

  // "교재 등록" 플로우로 등록된 교재(= storedPath가 GCS URL인 것) 전체 목록을 노출합니다.
  // 기존의 sessionStorage 기반 "등록 기록" 대신 DB 기준으로 표시합니다.
  let registeredTextbooks: Omit<RegisteredTextbookRow, "files">[] = [];
  try {
    const rows = (await prisma.textbook.findMany({
      where: {
        ownerId: teacher.id,
        OR: [
          { storedPath: { contains: "storage.googleapis.com" } },
          { storedPath: { contains: "storage.cloud.google.com" } },
        ],
        // "교재 판매하기"로 판매 설정(가격/원가) 또는 공개된 항목은 등록 기록에서 제외
        price: null,
        originalPrice: null,
        isPublished: false,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        originalName: true,
        createdAt: true,
        sizeBytes: true,
        pageCount: true,
        thumbnailUrl: true,
        files: true,
      },
    })) as RegisteredTextbookRow[];
    registeredTextbooks = rows.filter(hasRegisterFiles).map(({ files: _files, ...rest }) => rest);
  } catch {
    registeredTextbooks = await prisma.textbook.findMany({
      where: {
        ownerId: teacher.id,
        OR: [
          { storedPath: { contains: "storage.googleapis.com" } },
          { storedPath: { contains: "storage.cloud.google.com" } },
        ],
        price: null,
        originalPrice: null,
        isPublished: false,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        originalName: true,
        createdAt: true,
        sizeBytes: true,
        pageCount: true,
        thumbnailUrl: true,
      },
    });
  }

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-transparent">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="py-5">
              <h1 className="text-2xl font-semibold tracking-tight text-white">교재 업로드</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            {/* Left: Form */}
            <div className="lg:col-span-3">
              <AdminTextbookRegisterFormClient />
            </div>

            {/* Right: Recent Uploads */}
            <div className="lg:col-span-2">
              <AdminTextbookRegisterLogClient items={registeredTextbooks as any} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
