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

export default async function AdminOrdersPage() {
  const teacher = await requireAdminUser();

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
  let dbError = false;

  try {
    orders = await prisma.order.findMany({
      where: {
        OR: [
          { course: { ownerId: teacher.id } },
          { textbook: { ownerId: teacher.id } },
        ],
        // 미결제/미확정 주문(PENDING)은 더미처럼 쌓이기 쉬워 주문관리 화면에서는 제외합니다.
        // (결제 완료/환불/취소 등 처리된 주문만 노출)
        NOT: { status: "PENDING" },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
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
    });
  } catch (e) {
    dbError = true;
    console.error("[AdminOrdersPage] order.findMany failed (likely missing migrations):", e);
    // 폴백: 주문 기능 마이그레이션이 안된 경우에도 페이지는 뜨게
    orders = [];
  }

  const totalAmount = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + o.amount, 0);
  const refundedCount = orders.filter((o) => o.status === "REFUNDED" || o.status === "PARTIALLY_REFUNDED").length;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/admin"
                className="text-white/50 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  arrow_back
                </span>
              </Link>
              <h1 className="text-[28px] font-bold tracking-tight">주문 관리</h1>
            </div>
            <p className="text-white/50">결제된 주문 목록을 확인하고 관리합니다.</p>
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
            <p className="text-[24px] font-bold">{orders.length}</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">결제완료</p>
            <p className="text-[24px] font-bold text-emerald-400">
              {orders.filter((o) => o.status === "COMPLETED").length}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">환불</p>
            <p className="text-[24px] font-bold text-slate-300">{refundedCount}</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">총 매출</p>
            <p className="text-[24px] font-bold">{formatPrice(totalAmount)}</p>
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
      </div>
    </AppShell>
  );
}

