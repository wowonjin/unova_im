import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import MemberTextbooksClient from "./MemberTextbooksClient";

export default async function MemberTextbooksPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  await requireAdminUser();
  const { memberId } = await params;

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      name: true,
      textbookEntitlements: {
        orderBy: { createdAt: "desc" },
        include: {
          textbook: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  if (!member) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          회원을 찾을 수 없습니다.
        </div>
      </AppShell>
    );
  }

  // 아직 등록되지 않은 모든 교재 조회
  const entitledTextbookIds = member.textbookEntitlements.map((e) => e.textbook.id);
  const availableTextbooks = await prisma.textbook.findMany({
    where: {
      id: { notIn: entitledTextbookIds },
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true, entitlementDays: true },
  });

  const entitlementsData = member.textbookEntitlements.map((e) => ({
    id: e.id,
    textbookId: e.textbook.id,
    textbookTitle: e.textbook.title,
    status: e.status,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
  }));

  return (
    <AppShell>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Link href="/admin/members" className="hover:text-white/70">
                모든 회원
              </Link>
              <span>→</span>
              <span>교재 관리</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-white">
              {member.name || member.email}님의 교재
            </h1>
          </div>
          <Link
            href="/admin/members"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            ← 돌아가기
          </Link>
        </div>

        <MemberTextbooksClient
          memberId={member.id}
          entitlements={entitlementsData}
          availableTextbooks={availableTextbooks}
        />
      </div>
    </AppShell>
  );
}

