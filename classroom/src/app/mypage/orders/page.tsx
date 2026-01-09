import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { formatOrderDate, mapOrderStatusToLabel, type OrderView } from "../_utils/order-view";

export default async function MyPageOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/mypage/orders");

  let orders: OrderView[] = [];
  try {
    const dbOrders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        orderNo: true,
        productName: true,
        productType: true,
        courseId: true,
        textbookId: true,
        amount: true,
        refundedAmount: true,
        status: true,
        createdAt: true,
        providerPayload: true,
      },
    });

    type LineItemRef = { productType: "COURSE" | "TEXTBOOK"; productId: string; amount: number };
    const extractLineItemRefs = (payload: Prisma.JsonValue | unknown): LineItemRef[] | null => {
      if (!payload || typeof payload !== "object") return null;
      const anyPayload = payload as any;
      const items = anyPayload?.lineItems?.items;
      if (!Array.isArray(items)) return null;
      const refs = items
        .map((it: any) => ({
          productType: it?.productType === "COURSE" ? "COURSE" : it?.productType === "TEXTBOOK" ? "TEXTBOOK" : null,
          productId: typeof it?.productId === "string" ? it.productId : null,
          amount: Number(it?.amount ?? 0),
        }))
        .filter((it: any) => it.productType && it.productId && Number.isFinite(it.amount));
      return refs.length ? (refs as LineItemRef[]) : null;
    };

    // --- 상품 제목 맵 준비(토스 다중상품/단일상품 모두 링크/표시를 위해) ---
    const courseIds = new Set<string>();
    const textbookIds = new Set<string>();

    const extractedRefs = dbOrders.map((o) => extractLineItemRefs(o.providerPayload));
    extractedRefs.forEach((refs) => {
      if (!refs) return;
      for (const r of refs) {
        if (r.productType === "COURSE") courseIds.add(r.productId);
        else textbookIds.add(r.productId);
      }
    });

    for (const o of dbOrders) {
      if (o.courseId) courseIds.add(o.courseId);
      if (o.textbookId) textbookIds.add(o.textbookId);
    }

    const [courses, textbooks] = await Promise.all([
      courseIds.size
        ? prisma.course.findMany({
            where: { id: { in: Array.from(courseIds) } },
            select: { id: true, title: true },
          })
        : Promise.resolve([] as Array<{ id: string; title: string }>),
      textbookIds.size
        ? prisma.textbook.findMany({
            where: { id: { in: Array.from(textbookIds) } },
            select: { id: true, title: true },
          })
        : Promise.resolve([] as Array<{ id: string; title: string }>),
    ]);

    const titleById = new Map<string, string>();
    for (const c of courses) titleById.set(c.id, c.title);
    for (const t of textbooks) titleById.set(t.id, t.title);

    orders = dbOrders.map((o, idx) => {
      const remaining = Math.max(0, o.amount - (o.refundedAmount || 0));
      const lineRefs = extractedRefs[idx] ?? null;

      const items: OrderView["items"] =
        lineRefs?.map((r) => ({
          name: titleById.get(r.productId) || `상품 (${r.productId.slice(0, 6)})`,
          price: r.amount,
          href: `/store/${r.productId}`,
        })) ??
        (o.courseId || o.textbookId
          ? [
              {
                name: titleById.get(o.courseId || o.textbookId || "") || o.productName,
                price: remaining,
                href: `/store/${o.courseId || o.textbookId}`,
              },
            ]
          : [{ name: o.productName, price: remaining }]);

      return {
        id: o.orderNo,
        date: formatOrderDate(o.createdAt),
        items,
        total: remaining,
        status: mapOrderStatusToLabel(o.status),
      };
    });
  } catch (e) {
    console.error("[mypage/orders] order.findMany failed:", e);
    orders = [];
  }

  return (
    <div>
      <h1 className="text-[22px] font-bold">주문내역</h1>
      <p className="text-[14px] text-white/60 mt-2">결제하신 상품 및 강의 내역을 확인하세요.</p>

      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <span className="material-symbols-outlined text-white/15" style={{ fontSize: "64px" }}>
            shopping_bag
          </span>
          <p className="mt-4 text-white/60">주문내역이 없습니다</p>
          <Link
            href="https://unova.co.kr"
            target="_blank"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
          >
            교재 및 강의 구매하기
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              arrow_forward
            </span>
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <div className="divide-y divide-white/10">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>

          <div className="mt-8 text-[13px] text-white/50">
            <p>• 실물 교재의 배송 조회는 유노바 홈페이지에서 확인하실 수 있습니다.</p>
            <p className="mt-1">• 강의 수강 관련 문의는 카카오톡 채널로 연락해주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function statusClass(status: string): string {
  if (status === "결제완료") return "bg-green-500/20 text-green-400";
  if (status === "결제대기") return "bg-yellow-500/20 text-yellow-400";
  if (status === "환불" || status === "부분환불") return "bg-purple-500/20 text-purple-400";
  if (status === "취소") return "bg-red-500/20 text-red-400";
  return "bg-white/10 text-white/60";
}

function OrderRow({ order }: { order: OrderView }) {
  return (
    <div className="py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-[12px] text-white/45">주문번호</span>
            <span className="text-[13px] font-mono text-white/80 truncate">{order.id}</span>
          </div>
          <p className="mt-2 text-[13px] text-white/50">주문일자 · {order.date}</p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[12px] text-white/45">총 결제금액</p>
          <p className="text-[20px] font-bold leading-tight">{order.total.toLocaleString()}원</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white/40" style={{ fontSize: "20px" }}>
                  shopping_bag
                </span>
              </div>
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-[14px] text-white/85 truncate hover:underline underline-offset-4"
                  title={item.name}
                >
                  {item.name}
                </Link>
              ) : (
                <p className="text-[14px] text-white/85 truncate">{item.name}</p>
              )}
            </div>
            <p className="text-[14px] font-medium text-white/85 shrink-0">{item.price.toLocaleString()}원</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${statusClass(status)}`}>
      {status}
    </span>
  );
}

