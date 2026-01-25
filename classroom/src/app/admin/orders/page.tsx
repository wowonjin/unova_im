import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import BuyerCell from "./BuyerCell";

const statusLabels: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: "결제완료", color: "bg-emerald-500/20 text-emerald-400" },
  CANCELLED: { label: "취소", color: "bg-rose-500/20 text-rose-400" },
  REFUNDED: { label: "환불", color: "bg-slate-500/20 text-slate-400" },
  PARTIALLY_REFUNDED: { label: "부분환불", color: "bg-slate-500/20 text-slate-300" },
};

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function formatDate(date: Date): string {
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kstDateKey(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function kstStartOfDay(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0) - 9 * 60 * 60 * 1000);
}

function addDaysKst(dateKey: string, days: number): string {
  const base = kstStartOfDay(dateKey);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return kstDateKey(next);
}

function kstDayOfWeek(dateKey: string): number {
  const start = kstStartOfDay(dateKey);
  // start 는 "KST 00:00"에 해당하는 UTC Date 입니다. KST로 되돌려 요일을 계산합니다.
  const kst = new Date(start.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCDay(); // 0=Sun .. 6=Sat
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstString(v: string | string[] | undefined): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : null;
  return null;
}

function isPromiseLike<T>(v: unknown): v is Promise<T> {
  return Boolean(v) && typeof v === "object" && typeof (v as any).then === "function";
}

type OrdersStats = { totalOrders: number; completedOrders: number; refundedOrders: number; totalSales: number };

export default async function AdminOrdersPage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
  const teacher = await requireAdminUser();

  const sp: SearchParams = isPromiseLike<SearchParams>(searchParams) ? await searchParams : (searchParams ?? {});
  const pageSize = 20;
  const pageRaw = parseInt(firstString(sp.page) || "1", 10);
  const requestedPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  // Get orders for products owned by this teacher
  let orders: Array<{
    id: string;
    orderNo: string;
    userId: string;
    productName: string;
    amount: number;
    refundedAmount?: number | null;
    paymentMethod?: string | null;
    provider?: string | null;
    status: string;
    createdAt: Date;
    user: { id: string; email: string; name: string | null };
  }> = [];
  let totalOrdersAll = 0;
  let currentPage = requestedPage;
  let totalPages = 1;
  let stats: { today: OrdersStats; week: OrdersStats; month: OrdersStats } = {
    today: { totalOrders: 0, completedOrders: 0, refundedOrders: 0, totalSales: 0 },
    week: { totalOrders: 0, completedOrders: 0, refundedOrders: 0, totalSales: 0 },
    month: { totalOrders: 0, completedOrders: 0, refundedOrders: 0, totalSales: 0 },
  };
  let dbError = false;

  try {
    const baseWhere = {
      OR: [
        { course: { ownerId: teacher.id } },
        { textbook: { ownerId: teacher.id } },
      ],
      amount: { gt: 0 },
      // 미결제/미확정 주문(PENDING)은 더미처럼 쌓이기 쉬워 주문관리 화면에서는 제외합니다.
      // (결제 완료/환불/취소 등 처리된 주문만 노출)
      NOT: { status: "PENDING" },
    } as const;

    const refundedStatuses = ["REFUNDED", "PARTIALLY_REFUNDED"] as const;

    const todayKey = kstDateKey(new Date());
    const todayStart = kstStartOfDay(todayKey);
    const tomorrowStart = kstStartOfDay(addDaysKst(todayKey, 1));

    const dow = kstDayOfWeek(todayKey);
    const weekDiff = (dow + 6) % 7; // Monday=0 ... Sunday=6
    const weekStartKey = addDaysKst(todayKey, -weekDiff);
    const weekStart = kstStartOfDay(weekStartKey);
    const nextWeekStart = kstStartOfDay(addDaysKst(weekStartKey, 7));

    const monthStartKey = `${todayKey.slice(0, 7)}-01`;
    const monthStart = kstStartOfDay(monthStartKey);
    const year = parseInt(todayKey.slice(0, 4), 10);
    const month = parseInt(todayKey.slice(5, 7), 10);
    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthStartKey = `${String(nextMonthYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
    const nextMonthStart = kstStartOfDay(nextMonthStartKey);

    const getRangeStats = async (start: Date, end: Date): Promise<OrdersStats> => {
      const rangeWhere = { ...baseWhere, createdAt: { gte: start, lt: end } } as const;
      const [totalOrders, completedOrders, refundedOrders, sumRes] = await Promise.all([
        prisma.order.count({ where: rangeWhere as any }),
        prisma.order.count({ where: { ...(rangeWhere as any), status: "COMPLETED" } }),
        prisma.order.count({ where: { ...(rangeWhere as any), status: { in: refundedStatuses as any } } }),
        prisma.order.aggregate({ where: { ...(rangeWhere as any), status: "COMPLETED" }, _sum: { amount: true } }),
      ]);

      return {
        totalOrders,
        completedOrders,
        refundedOrders,
        totalSales: sumRes._sum.amount ?? 0,
      };
    };

    // Pagination (20개씩)
    totalOrdersAll = await prisma.order.count({ where: baseWhere as any });
    totalPages = Math.max(1, Math.ceil(totalOrdersAll / pageSize));
    currentPage = Math.min(Math.max(1, requestedPage), totalPages);
    const skip = (currentPage - 1) * pageSize;

    const [pageOrders, todayStats, weekStats, monthStats] = await Promise.all([
      prisma.order.findMany({
        where: baseWhere as any,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          orderNo: true,
          userId: true,
          productName: true,
          amount: true,
          refundedAmount: true,
          paymentMethod: true,
          provider: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      getRangeStats(todayStart, tomorrowStart),
      getRangeStats(weekStart, nextWeekStart),
      getRangeStats(monthStart, nextMonthStart),
    ]);

    orders = pageOrders;
    stats = { today: todayStats, week: weekStats, month: monthStats };
  } catch (e) {
    dbError = true;
    console.error("[AdminOrdersPage] order.findMany failed (likely missing migrations):", e);
    // 폴백: 주문 기능 마이그레이션이 안된 경우에도 페이지는 뜨게
    orders = [];
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">주문 관리</h1>
          </div>
        </div>

        {dbError && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">
            주문 데이터를 불러오지 못했습니다. (운영 DB 마이그레이션이 아직 적용되지 않았을 수 있습니다.)<br />
            잠시 후 다시 시도해주세요.
          </div>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">총 주문 수</p>
            <div className="mt-2 space-y-1 text-[13px] text-white/60">
              <div className="flex items-baseline justify-between gap-3">
                <span>오늘</span>
                <span className="text-[18px] font-bold text-white">{stats.today.totalOrders.toLocaleString("ko-KR")}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>이번 주</span>
                <span className="text-[18px] font-bold text-white">{stats.week.totalOrders.toLocaleString("ko-KR")}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>이번 달</span>
                <span className="text-[18px] font-bold text-white">{stats.month.totalOrders.toLocaleString("ko-KR")}</span>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">결제완료</p>
            <div className="mt-2 space-y-1 text-[13px] text-white/60">
              <div className="flex items-baseline justify-between gap-3">
                <span>오늘</span>
                <span className="text-[18px] font-bold text-emerald-400">{stats.today.completedOrders.toLocaleString("ko-KR")}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>이번 주</span>
                <span className="text-[18px] font-bold text-emerald-400">{stats.week.completedOrders.toLocaleString("ko-KR")}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>이번 달</span>
                <span className="text-[18px] font-bold text-emerald-400">{stats.month.completedOrders.toLocaleString("ko-KR")}</span>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">환불</p>
            <div className="mt-2 space-y-1 text-[13px] text-white/60">
              <div className="flex items-baseline justify-between gap-3">
                <span>오늘</span>
                <span className="text-[18px] font-bold text-slate-200">{stats.today.refundedOrders.toLocaleString("ko-KR")}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>이번 주</span>
                <span className="text-[18px] font-bold text-slate-200">{stats.week.refundedOrders.toLocaleString("ko-KR")}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>이번 달</span>
                <span className="text-[18px] font-bold text-slate-200">{stats.month.refundedOrders.toLocaleString("ko-KR")}</span>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">총 매출</p>
            <div className="mt-2 space-y-1 text-[13px] text-white/60">
              <div className="flex items-baseline justify-between gap-3">
                <span>오늘</span>
                <span className="text-[16px] font-bold text-white">{formatPrice(stats.today.totalSales)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>이번 주</span>
                <span className="text-[16px] font-bold text-white">{formatPrice(stats.week.totalSales)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span>이번 달</span>
                <span className="text-[16px] font-bold text-white">{formatPrice(stats.month.totalSales)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 주문 목록 */}
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    주문번호
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    구매자
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    상품명
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    결제금액
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    환불
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    결제수단
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    결제사
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    상태
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    주문일시
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-white/50">
                      아직 주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4 text-[14px] text-white/80 font-mono">
                        <Link href={`/admin/order/${order.orderNo}`} className="hover:underline">
                          {order.orderNo}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <BuyerCell
                          userId={order.userId}
                          name={order.user.name}
                          email={order.user.email}
                        />
                      </td>
                      <td className="px-5 py-4 text-[14px] text-white/80 max-w-[200px] truncate">
                        {order.productName}
                      </td>
                      <td className="px-5 py-4 text-[14px] font-medium text-white">
                        {formatPrice(order.amount)}
                      </td>
                      <td className="px-5 py-4 text-[14px] text-white/70">
                        {order.refundedAmount ? formatPrice(order.refundedAmount) : "-"}
                      </td>
                      <td className="px-5 py-4 text-[14px] text-white/60">
                        {order.paymentMethod || "-"}
                      </td>
                      <td className="px-5 py-4 text-[14px] text-white/60">
                        {order.provider || "-"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[12px] font-medium ${
                            statusLabels[order.status]?.color || "bg-white/10 text-white/60"
                          }`}
                        >
                          {statusLabels[order.status]?.label || order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[14px] text-white/50">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 */}
        {!dbError && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <div className="text-[13px] text-white/50">
              총 {totalOrdersAll.toLocaleString("ko-KR")}건 · {currentPage.toLocaleString("ko-KR")} / {totalPages.toLocaleString("ko-KR")} 페이지 · 페이지당 {pageSize}건
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/orders?page=${Math.max(1, currentPage - 1)}`}
                aria-disabled={currentPage <= 1}
                className={`px-3 py-2 rounded-lg border text-[13px] transition-colors ${
                  currentPage <= 1
                    ? "border-white/[0.06] text-white/30 pointer-events-none"
                    : "border-white/[0.10] text-white/70 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                이전
              </Link>
              <Link
                href={`/admin/orders?page=${Math.min(totalPages, currentPage + 1)}`}
                aria-disabled={currentPage >= totalPages}
                className={`px-3 py-2 rounded-lg border text-[13px] transition-colors ${
                  currentPage >= totalPages
                    ? "border-white/[0.06] text-white/30 pointer-events-none"
                    : "border-white/[0.10] text-white/70 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                다음
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

