import AppShell from "@/app/_components/AppShell";
import { PageHeader, Card, CardBody } from "@/app/_components/ui";
import { getCurrentUser, getTeacherAccountByUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatWon(v: number) {
  return `${Math.max(0, Math.round(v)).toLocaleString("ko-KR")}원`;
}

const CARD_FEE_RATE = 0.034; // 3.4%
const VAT_RATE = 0.1; // 부가세 10%
// NOTE: RATE는 "선생님 정산률"입니다.
const TEXTBOOK_PLATFORM_FEE_RATE = 0.25; // 교재 정산률 25%
const COURSE_PLATFORM_FEE_RATE = 0.5; // 강의 정산률 50%
const PDF_TEXTBOOK_PLATFORM_FEE_RATE = 0.5; // 전자책(PDF) 교재 정산률 50%
const SALES_STATUSES: OrderStatus[] = ["COMPLETED", "PARTIALLY_REFUNDED"];

function settleNetPayout(netSales: number, platformFeeRate: number) {
  const base = Math.max(0, netSales);
  const payoutBeforeFees = base * platformFeeRate;
  const cardFeeWithVat = base * CARD_FEE_RATE * (1 + VAT_RATE);
  return Math.max(0, payoutBeforeFees - cardFeeWithVat);
}

function normalizeTextbookType(v: unknown): string {
  return String(v ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isPdfTextbook(tb: { textbookType?: string | null } | null | undefined) {
  // 요구사항: "PDF로 써져있는(=입력된) 것만" 전자책으로 집계
  return normalizeTextbookType(tb?.textbookType) === "PDF";
}

function payoutRateOfOrder(o: {
  productType: "COURSE" | "TEXTBOOK";
  textbook?: { composition?: string | null; textbookType?: string | null } | null;
}) {
  if (o.productType === "COURSE") return COURSE_PLATFORM_FEE_RATE;
  // TEXTBOOK: PDF 전자책은 50%, 그 외는 25%
  return isPdfTextbook(o.textbook) ? PDF_TEXTBOOK_PLATFORM_FEE_RATE : TEXTBOOK_PLATFORM_FEE_RATE;
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
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fteacher%2Fsales");
  const teacher = await getTeacherAccountByUserId(user.id);
  if (!teacher) {
    return (
      <AppShell>
        <PageHeader title="선생님 콘솔" description="이 계정은 아직 선생님 계정으로 연결되지 않았습니다." />
        <div className="mt-6">
          <Card className="bg-transparent">
            <CardBody>
              <p className="text-sm text-white/70">관리자에게 선생님 계정 연결을 요청해주세요.</p>
              <p className="mt-3 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/85">{user.email}</p>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    );
  }

  const now = new Date();
  const weekStart = kstBoundaryUtc("week");
  const monthStart = kstBoundaryUtc("month");

  const teacherName = (teacher.teacherName || "").trim();
  const [courseIds, textbookIds] = await Promise.all([
    teacherName.length
      ? prisma.course.findMany({ where: { teacherName }, select: { id: true }, take: 1000 }).then((xs) => xs.map((x) => x.id))
      : Promise.resolve([] as string[]),
    teacherName.length
      ? prisma.textbook.findMany({ where: { teacherName }, select: { id: true }, take: 1000 }).then((xs) => xs.map((x) => x.id))
      : Promise.resolve([] as string[]),
  ]);

  const scopeOr: any[] = [];
  if (courseIds.length) scopeOr.push({ courseId: { in: courseIds } });
  if (textbookIds.length) scopeOr.push({ textbookId: { in: textbookIds } });
  const scopeWhere = scopeOr.length ? ({ OR: scopeOr } as const) : ({ id: "__NO_MATCH__" } as const);

  const [weekOrders, monthOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: SALES_STATUSES },
        createdAt: { gte: weekStart, lte: now },
        ...(scopeWhere as any),
      },
      select: {
        productType: true,
        amount: true,
        refundedAmount: true,
        createdAt: true,
        productName: true,
        orderNo: true,
        textbook: { select: { composition: true, textbookType: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.order.findMany({
      where: {
        status: { in: SALES_STATUSES },
        createdAt: { gte: monthStart, lte: now },
        ...(scopeWhere as any),
      },
      select: {
        productType: true,
        amount: true,
        refundedAmount: true,
        textbook: { select: { composition: true, textbookType: true } },
      },
      take: 20000,
    }),
  ]);

  const weekSales = weekOrders.reduce((acc, o) => acc + (o.amount - (o.refundedAmount || 0)), 0);
  const monthSales = monthOrders.reduce((acc, o) => acc + (o.amount - (o.refundedAmount || 0)), 0);

  // NOTE: 교재는 PDF 여부에 따라 정산비가 달라서(25% vs 50%)
  // 정산액은 "주문 단위"로 계산합니다.
  const weekPayoutTotal = weekOrders.reduce((acc, o) => {
    const net = (o.amount ?? 0) - (o.refundedAmount ?? 0);
    const rate = payoutRateOfOrder({ productType: o.productType, textbook: o.textbook });
    return acc + settleNetPayout(net, rate);
  }, 0);
  const monthPayoutTotal = monthOrders.reduce((acc, o) => {
    const net = (o.amount ?? 0) - (o.refundedAmount ?? 0);
    const rate = payoutRateOfOrder({ productType: o.productType, textbook: o.textbook });
    return acc + settleNetPayout(net, rate);
  }, 0);

  return (
    <AppShell>
      <PageHeader title="매출" description="주/월 기준(한국시간) 판매액을 확인합니다." />

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <Card className="bg-transparent">
          <CardBody>
            <p className="text-sm text-white/60">이번주 판매액 (KST)</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatWon(weekSales)}</p>
          </CardBody>
        </Card>
        <Card className="bg-transparent">
          <CardBody>
            <p className="text-sm text-white/60">이번달 판매액 (KST)</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatWon(monthSales)}</p>
          </CardBody>
        </Card>
        <Card className="bg-transparent">
          <CardBody>
            <p className="text-sm text-white/60">이번주 정산액 (KST)</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatWon(weekPayoutTotal)}</p>
          </CardBody>
        </Card>
        <Card className="bg-transparent">
          <CardBody>
            <p className="text-sm text-white/60">이번달 정산액 (KST)</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatWon(monthPayoutTotal)}</p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="bg-transparent">
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

