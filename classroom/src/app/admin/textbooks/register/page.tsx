import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminTextbookRegisterFormClient from "./AdminTextbookRegisterFormClient";
import AdminTextbookRegisterLogClient from "./AdminTextbookRegisterLogClient";

export default async function AdminTextbookRegisterPage() {
  const teacher = await requireAdminUser();

  // "교재 등록" 플로우로 등록된 교재(= storedPath가 GCS URL인 것) 전체 목록을 노출합니다.
  // 기존의 sessionStorage 기반 "등록 기록" 대신 DB 기준으로 표시합니다.
  const registeredTextbooks = await prisma.textbook
    .findMany({
      where: {
        ownerId: teacher.id,
        OR: [
          { storedPath: { contains: "storage.googleapis.com" } },
          { storedPath: { contains: "storage.cloud.google.com" } },
        ],
        // "교재 판매하기"로 판매 설정(가격/원가)이 들어간 항목은 등록 기록에서 제외
        price: null,
        originalPrice: null,
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
    })
    .catch(async () => {
      return await prisma.textbook.findMany({
        where: {
          ownerId: teacher.id,
          OR: [
            { storedPath: { contains: "storage.googleapis.com" } },
            { storedPath: { contains: "storage.cloud.google.com" } },
          ],
          price: null,
          originalPrice: null,
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
    });

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b border-white/[0.06] bg-[#0d0d0f]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="py-8">
              <Link 
                href="/admin/textbooks"
                className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors mb-4"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
                판매 물품으로 돌아가기
              </Link>
              <h1 className="text-2xl font-semibold tracking-tight text-white">교재 업로드</h1>
              <p className="mt-1 text-sm text-white/50">
                구글 스토리지 URL을 입력하여 교재를 등록하세요
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
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
