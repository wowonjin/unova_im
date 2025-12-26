import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusLabels: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: "결제완료", color: "bg-emerald-500/20 text-emerald-400" },
  PENDING: { label: "입금대기", color: "bg-amber-500/20 text-amber-400" },
  CANCELLED: { label: "취소", color: "bg-rose-500/20 text-rose-400" },
  REFUNDED: { label: "환불", color: "bg-slate-500/20 text-slate-400" },
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

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked = local.slice(0, 3) + "***";
  return `${masked}@${domain}`;
}

function maskName(name: string | null): string {
  if (!name) return "회원";
  if (name.length <= 1) return name + "**";
  return name.slice(0, 1) + "**";
}

export default async function AdminOrdersPage() {
  const teacher = await requireAdminUser();

  // Get orders for products owned by this teacher
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { course: { ownerId: teacher.id } },
        { textbook: { ownerId: teacher.id } },
      ],
    },
    include: {
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalAmount = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + o.amount, 0);

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
            <p className="text-[13px] text-white/40 mb-1">입금대기</p>
            <p className="text-[24px] font-bold text-amber-400">
              {orders.filter((o) => o.status === "PENDING").length}
            </p>
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
                    paymentKey
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    상태
                  </th>
                  <th className="px-5 py-4 text-left text-[13px] font-medium text-white/50">
                    주문일시
                  </th>
                  <th className="px-5 py-4 text-right text-[13px] font-medium text-white/50">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-12 text-center text-white/50">
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
                        <p className="text-[14px] text-white/80">{maskName(order.user.name)}</p>
                        <p className="text-[12px] text-white/40">{maskEmail(order.user.email)}</p>
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
                      <td className="px-5 py-4 text-[12px] text-white/50 font-mono max-w-[220px] truncate">
                        {order.providerPaymentKey || "-"}
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
                      <td className="px-5 py-4 text-right">
                        {order.status === "COMPLETED" && order.provider === "toss" && order.providerPaymentKey ? (
                          <form action="/api/admin/orders/toss-cancel" method="post" className="inline-flex items-center gap-2">
                            <input type="hidden" name="orderNo" value={order.orderNo} />
                            <input type="hidden" name="reason" value="고객 요청" />
                            <button
                              type="submit"
                              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[12px] text-white/80 hover:bg-white/10"
                            >
                              환불
                            </button>
                          </form>
                        ) : (
                          <span className="text-[12px] text-white/30">-</span>
                        )}
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

