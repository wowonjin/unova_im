import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import MemberEnrollmentsClient from "./MemberEnrollmentsClient";

export default async function MemberEnrollmentsPage({
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
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          course: {
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

  // 아직 등록되지 않은 모든 강좌 조회
  const enrolledCourseIds = member.enrollments.map((e) => e.course.id);
  const availableCourses = await prisma.course.findMany({
    where: {
      id: { notIn: enrolledCourseIds },
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true, enrollmentDays: true },
  });

  const enrollmentsData = member.enrollments.map((e) => ({
    id: e.id,
    courseId: e.course.id,
    courseTitle: e.course.title,
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
              <span>강좌 관리</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-white">
              {member.name || member.email}님의 강좌
            </h1>
          </div>
          <Link
            href="/admin/members"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            ← 돌아가기
          </Link>
        </div>

        <MemberEnrollmentsClient
          memberId={member.id}
          enrollments={enrollmentsData}
          availableCourses={availableCourses}
        />
      </div>
    </AppShell>
  );
}

