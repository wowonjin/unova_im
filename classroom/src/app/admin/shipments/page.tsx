import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import ShipmentsFiltersClient from "./ShipmentsFiltersClient";

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

type SearchParams = Record<string, string | string[] | undefined>;

type LineItem = { productType: "COURSE" | "TEXTBOOK"; productId: string; amount?: number };

function extractLineItems(payload: unknown): LineItem[] | null {
  if (!payload || typeof payload !== "object") return null;
  const anyPayload = payload as any;
  const items = anyPayload?.lineItems?.items;
  if (!Array.isArray(items)) return null;
  const normalized = items
    .map((it: any) => ({
      productType: it?.productType === "COURSE" ? "COURSE" : it?.productType === "TEXTBOOK" ? "TEXTBOOK" : null,
      productId: typeof it?.productId === "string" ? it.productId : null,
      amount: Number(it?.amount ?? 0),
    }))
    .filter((it: any) => it.productType && it.productId);
  return normalized.length ? (normalized as LineItem[]) : null;
}

function firstString(v: string | string[] | undefined): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : null;
  return null;
}

function parseCsvIds(v: string | string[] | undefined): string[] {
  const s = firstString(v);
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function isPromiseLike<T>(v: unknown): v is Promise<T> {
  return Boolean(v) && typeof v === "object" && typeof (v as any).then === "function";
}

export default async function AdminShipmentsPage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
  const teacher = await requireAdminUser();

  const sp: SearchParams = isPromiseLike<SearchParams>(searchParams) ? await searchParams : (searchParams ?? {});

  const todayKey = kstDateKey(new Date());
  const textbookIds = parseCsvIds(sp.textbookIds);
  const legacyOne = firstString(sp.textbookId) || "";
  const selectedIds = (textbookIds.length ? textbookIds : (legacyOne ? [legacyOne] : [])).slice(0, 50);
  const dateFilter = (firstString(sp.date) || "today").toLowerCase();

  const shippingFee = Number(firstString(sp.shippingFee) || "3000");
  const freightCode = (firstString(sp.freightCode) || "030").trim();
  const defaultMessage = (firstString(sp.message) || "친절 배송 부탁드립니다.").trim();

  const textbooks = await prisma.textbook.findMany({
    where: { ownerId: teacher.id, isPublished: true, price: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
  const selectedTextbooks = selectedIds.map((id) => textbooks.find((t) => t.id === id)).filter(Boolean) as Array<{ id: string; title: string }>;

  const start = dateFilter === "today" ? kstStartOfDay(todayKey) : null;
  const end = dateFilter === "today" ? kstStartOfDay(addDaysKst(todayKey, 1)) : null;

  const orders = await prisma.order.findMany({
    where: {
      NOT: { status: "PENDING" },
      ...(start && end ? { createdAt: { gte: start, lt: end } } : {}),
      OR: [
        { course: { ownerId: teacher.id } },
        { textbook: { ownerId: teacher.id } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      orderNo: true,
      status: true,
      productName: true,
      productType: true,
      textbookId: true,
      providerPayload: true,
      createdAt: true,
      user: { select: { name: true, email: true, phone: true, address: true, addressDetail: true } },
    },
  });

  const titleByTextbookId = new Map(textbooks.map((t) => [t.id, t.title] as const));
  const selectedIdSet = new Set(selectedIds);

  const rows = orders.flatMap((o) => {
    if (selectedIds.length === 0) return [];

    const base = {
      orderNo: o.orderNo,
      orderedAt: o.createdAt,
      recipientName: o.user.name || o.user.email,
      address: [o.user.address || "", o.user.addressDetail || ""].join(" ").trim(),
      tel: o.user.phone || "",
      mobile: o.user.phone || "",
      qty: 1,
      shippingFee: Number.isFinite(shippingFee) ? shippingFee : 3000,
      freightCode,
      message: defaultMessage,
    };

    const out: Array<typeof base & { itemName: string }> = [];

    if (o.textbookId && selectedIdSet.has(o.textbookId)) {
      out.push({
        ...base,
        itemName: titleByTextbookId.get(o.textbookId) || o.productName,
      });
      return out;
    }

    const items = extractLineItems(o.providerPayload);
    if (!items?.length) return out;
    for (const it of items) {
      if (it.productType !== "TEXTBOOK") continue;
      if (!selectedIdSet.has(it.productId)) continue;
      out.push({
        ...base,
        itemName: titleByTextbookId.get(it.productId) || o.productName,
      });
    }
    return out;
  });

  const downloadUrl =
    selectedIds.length
      ? `/api/admin/shipments/export?textbookIds=${encodeURIComponent(selectedIds.join(","))}&date=${encodeURIComponent(dateFilter)}&shippingFee=${encodeURIComponent(String(Number.isFinite(shippingFee) ? shippingFee : 3000))}&freightCode=${encodeURIComponent(freightCode)}&message=${encodeURIComponent(defaultMessage)}`
      : null;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[26px] font-bold tracking-tight">택배 관리</h1>
            </div>
          </div>

          {downloadUrl ? (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-[14px] font-medium text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-blue-400 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                download
              </span>
              엑셀 다운로드
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[12px]">
                {rows.length}건
              </span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-[14px] text-white/30 cursor-not-allowed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                download
              </span>
              엑셀 다운로드
            </button>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border border-white/[0.08] bg-transparent p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-400" style={{ fontSize: "20px" }}>
                  local_shipping
                </span>
              </div>
              <div>
                <p className="text-[12px] text-white/40">발송 대기</p>
                <p className="text-[22px] font-bold text-white">{rows.length}<span className="text-[14px] font-normal text-white/40 ml-1">건</span></p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-transparent p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: "20px" }}>
                  inventory_2
                </span>
              </div>
              <div>
                <p className="text-[12px] text-white/40">선택 상품</p>
                <p className="text-[22px] font-bold text-white">{selectedIds.length}<span className="text-[14px] font-normal text-white/40 ml-1">종</span></p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-transparent p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-400" style={{ fontSize: "20px" }}>
                  calendar_today
                </span>
              </div>
              <div>
                <p className="text-[12px] text-white/40">조회 기간</p>
                <p className="text-[14px] font-medium text-white mt-1">
                  {dateFilter === "today" ? todayKey : "전체"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-transparent p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-400" style={{ fontSize: "20px" }}>
                  payments
                </span>
              </div>
              <div>
                <p className="text-[12px] text-white/40">기본 운임</p>
                <p className="text-[14px] font-medium text-white mt-1">
                  {Number.isFinite(shippingFee) ? shippingFee.toLocaleString() : 3000}원
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 영역 */}
        <ShipmentsFiltersClient
          textbooks={textbooks}
          initial={{
            textbookIds: selectedIds,
            date: dateFilter === "all" ? "all" : "today",
            shippingFee: String(Number.isFinite(shippingFee) ? shippingFee : 3000),
            freightCode,
            message: defaultMessage,
          }}
        />

        {/* 테이블 영역 */}
        <div className="mt-6">
          {selectedIds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-transparent p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-white/20" style={{ fontSize: "32px" }}>
                  inventory_2
                </span>
              </div>
              <p className="text-[15px] font-medium text-white/70">상품을 선택해주세요</p>
              <p className="text-[13px] text-white/40 mt-1">
                위에서 발송할 교재 상품을 선택하면 해당 주문 목록이 표시됩니다
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-transparent p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-white/20" style={{ fontSize: "32px" }}>
                  inbox
                </span>
              </div>
              <p className="text-[15px] font-medium text-white/70">주문이 없습니다</p>
              <p className="text-[13px] text-white/40 mt-1">
                선택한 상품에 해당하는 {dateFilter === "today" ? "오늘" : ""} 주문이 없습니다
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-transparent">
              {/* 테이블 헤더 정보 */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-white/40" style={{ fontSize: "18px" }}>
                    table_rows
                  </span>
                  <span className="text-[13px] text-white/60">
                    총 <span className="text-white font-medium">{rows.length}</span>건
                  </span>
                  {selectedTextbooks.length > 0 && (
                    <span className="text-[12px] text-white/40 ml-2">
                      ({selectedTextbooks.map((t) => t.title).join(", ")})
                    </span>
                  )}
                </div>
                <span className="text-[12px] text-white/30">
                  * 주소/연락처는 회원정보 기준
                </span>
              </div>

              {/* 테이블 */}
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-white/50 uppercase tracking-wider">수하인명</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-white/50 uppercase tracking-wider">수하인 주소</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-white/50 uppercase tracking-wider">전화번호</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-white/50 uppercase tracking-wider">핸드폰</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-white/50 uppercase tracking-wider">수량</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-white/50 uppercase tracking-wider">운임</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-white/50 uppercase tracking-wider">구분</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-white/50 uppercase tracking-wider">품목명</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-white/50 uppercase tracking-wider">배송메시지</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((r, idx) => (
                      <tr key={`${r.orderNo}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white/90 font-medium">{r.recipientName}</td>
                        <td className="px-4 py-3 text-white/70 max-w-[280px] truncate" title={r.address}>{r.address || <span className="text-white/30">-</span>}</td>
                        <td className="px-4 py-3 text-white/60 font-mono text-[12px]">{r.tel || <span className="text-white/30">-</span>}</td>
                        <td className="px-4 py-3 text-white/60 font-mono text-[12px]">{r.mobile || <span className="text-white/30">-</span>}</td>
                        <td className="px-4 py-3 text-right text-white/70">{r.qty}</td>
                        <td className="px-4 py-3 text-right text-white/70">{r.shippingFee.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
                            {r.freightCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/80 max-w-[180px] truncate" title={r.itemName}>{r.itemName}</td>
                        <td className="px-4 py-3 text-white/50 max-w-[160px] truncate" title={r.message}>{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
