import AppShell from "@/app/_components/AppShell";
import { PageHeader, Card, CardBody } from "@/app/_components/ui";
import { requireTeacherAccountUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatWon(v: number) {
  return `${Math.max(0, Math.round(v)).toLocaleString("ko-KR")}원`;
}

function kstRangeUtc(kind: "week" | "month") {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  if (kind === "month") {
    const startUtcMs = Date.UTC(y, m, 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
    return { startUtc: new Date(startUtcMs), endUtc: now };
  }
  // week: KST 기준 월요일 00:00
  const weekday = kst.getUTCDay(); // 0=Sun..6=Sat (but here it's KST-day because we shifted)
  const diff = (weekday + 6) % 7; // Monday=0
  const startUtcMs = Date.UTC(y, m, d - diff, 0, 0, 0) - 9 * 60 * 60 * 1000;
  return { startUtc: new Date(startUtcMs), endUtc: now };
}

export default async function TeacherDashboardPage() {
  const { user, teacher } = await requireTeacherAccountUser();

  const [coursesCount, textbooksCount] = await Promise.all([
    prisma.course.count({ where: { ownerId: user.id } }),
    prisma.textbook.count({ where: { ownerId: user.id } }),
  ]);

  const week = kstRangeUtc("week");
  const month = kstRangeUtc("month");

  const [weekOrders, monthOrders, reviewCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
        createdAt: { gte: week.startUtc, lte: week.endUtc },
        OR: [{ course: { ownerId: user.id } }, { textbook: { ownerId: user.id } }],
      },
      select: { amount: true, refundedAmount: true },
      take: 5000,
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
        createdAt: { gte: month.startUtc, lte: month.endUtc },
        OR: [{ course: { ownerId: user.id } }, { textbook: { ownerId: user.id } }],
      },
      select: { amount: true, refundedAmount: true },
      take: 20000,
    }),
    prisma.review.count({
      where: {
        isApproved: true,
        OR: [{ course: { ownerId: user.id } }, { textbook: { ownerId: user.id } }],
      },
    }),
  ]);

  const weekSales = weekOrders.reduce((acc, o) => acc + (o.amount - (o.refundedAmount || 0)), 0);
  const monthSales = monthOrders.reduce((acc, o) => acc + (o.amount - (o.refundedAmount || 0)), 0);

  return (
    <AppShell>
      <PageHeader title="선생님 대시보드" description={`${teacher.teacherName} 선생님 · ${teacher.teacherSlug}`} />

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-white/60">이번주 판매액 (KST)</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatWon(weekSales)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-white/60">이번달 판매액 (KST)</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatWon(monthSales)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-white/60">내 상품 / 리뷰</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {coursesCount + textbooksCount}개 <span className="text-white/40 text-base font-medium">상품</span>
            </p>
            <p className="mt-1 text-sm text-white/50">
              강좌 {coursesCount} · 교재 {textbooksCount} · 리뷰 {reviewCount}
            </p>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

