import AppShell from "@/app/_components/AppShell";
import { PageHeader, Card, CardBody } from "@/app/_components/ui";
import { requireTeacherAccountUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatWon(v: number) {
  return `${Math.max(0, Math.round(v)).toLocaleString("ko-KR")}원`;
}

function kstBoundaryUtc(kind: "week" | "month") {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  if (kind === "month") {
    return new Date(Date.UTC(y, m, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);
  }
  const weekday = kst.getUTCDay();
  const diff = (weekday + 6) % 7;
  return new Date(Date.UTC(y, m, d - diff, 0, 0, 0) - 9 * 60 * 60 * 1000);
}

export default async function TeacherSalesPage() {
  const { user } = await requireTeacherAccountUser();

  const now = new Date();
  const weekStart = kstBoundaryUtc("week");
  const monthStart = kstBoundaryUtc("month");

  const [weekOrders, monthOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
        createdAt: { gte: weekStart, lte: now },
        OR: [{ course: { ownerId: user.id } }, { textbook: { ownerId: user.id } }],
      },
      select: { amount: true, refundedAmount: true, createdAt: true, productName: true, orderNo: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
        createdAt: { gte: monthStart, lte: now },
        OR: [{ course: { ownerId: user.id } }, { textbook: { ownerId: user.id } }],
      },
      select: { amount: true, refundedAmount: true },
      take: 20000,
    }),
  ]);

  const weekSales = weekOrders.reduce((acc, o) => acc + (o.amount - (o.refundedAmount || 0)), 0);
  const monthSales = monthOrders.reduce((acc, o) => acc + (o.amount - (o.refundedAmount || 0)), 0);

  return (
    <AppShell>
      <PageHeader title="매출" description="주/월 기준(한국시간) 판매액을 확인합니다." />

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
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
      </div>

      <div className="mt-6">
        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-white">이번주 주문 (최근 200건)</p>
            {weekOrders.length === 0 ? (
              <p className="mt-3 text-sm text-white/50">이번주 주문이 없습니다.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {weekOrders.map((o) => {
                  const net = o.amount - (o.refundedAmount || 0);
                  return (
                    <div key={o.orderNo} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white/90">{o.productName}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {o.createdAt.toISOString().slice(0, 10).replace(/-/g, ".")} · {o.orderNo}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-white">{formatWon(net)}</p>
                        {o.refundedAmount ? (
                          <p className="mt-1 text-xs text-white/40">환불 {formatWon(o.refundedAmount)}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

