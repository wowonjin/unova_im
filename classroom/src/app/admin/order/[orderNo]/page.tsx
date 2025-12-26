import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderNo: string }> }) {
  await requireAdminUser();
  const { orderNo } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!order) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">주문을 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  const remaining = Math.max(0, order.amount - (order.refundedAmount || 0));

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/orders" className="text-white/50 hover:text-white transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              arrow_back
            </span>
          </Link>
          <h1 className="text-[24px] font-bold">주문 상세</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/50">주문번호</p>
              <p className="mt-1 font-mono text-white">{order.orderNo}</p>
            </div>
            <div>
              <p className="text-white/50">상태</p>
              <p className="mt-1 text-white">{order.status}</p>
            </div>
            <div>
              <p className="text-white/50">구매자</p>
              <p className="mt-1 text-white">{order.user.name || "-"} / {order.user.email}</p>
            </div>
            <div>
              <p className="text-white/50">상품</p>
              <p className="mt-1 text-white">{order.productName} ({order.productType})</p>
            </div>
            <div>
              <p className="text-white/50">결제금액</p>
              <p className="mt-1 text-white">{formatPrice(order.amount)}</p>
            </div>
            <div>
              <p className="text-white/50">환불금액</p>
              <p className="mt-1 text-white">{formatPrice(order.refundedAmount || 0)} (남은금액: {formatPrice(remaining)})</p>
            </div>
            <div>
              <p className="text-white/50">결제수단</p>
              <p className="mt-1 text-white">{order.paymentMethod || "-"}</p>
            </div>
            <div>
              <p className="text-white/50">결제사/paymentKey</p>
              <p className="mt-1 text-white">{order.provider || "-"} / <span className="font-mono">{order.providerPaymentKey || "-"}</span></p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <h2 className="text-[16px] font-semibold">환불(취소)</h2>
            <p className="mt-1 text-xs text-white/50">토스 결제건(COMPLETED)만 처리됩니다. 부분환불은 “취소금액”을 입력하세요.</p>

            <form action="/api/admin/orders/toss-cancel" method="post" className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              <input type="hidden" name="orderNo" value={order.orderNo} />
              <div className="md:col-span-6">
                <label className="block text-xs text-white/60 mb-1">환불 사유</label>
                <input
                  name="reason"
                  defaultValue="고객 요청"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs text-white/60 mb-1">취소금액(선택)</label>
                <input
                  name="cancelAmount"
                  type="number"
                  min={1}
                  max={remaining}
                  placeholder={`최대 ${remaining}`}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="md:col-span-3 flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/15"
                >
                  환불 실행
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <h2 className="text-[16px] font-semibold">결제사 응답(JSON)</h2>
            <pre className="mt-3 max-h-[380px] overflow-auto rounded-xl border border-white/10 bg-[#121214] p-4 text-xs text-white/70">
{JSON.stringify(order.providerPayload ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </AppShell>
  );
}


