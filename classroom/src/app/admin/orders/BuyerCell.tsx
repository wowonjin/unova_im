"use client";

import { useEffect, useMemo, useState } from "react";

type SummaryOrder = {
  orderNo: string;
  productName: string;
  amount: number;
  status: string;
  createdAt: string;
};

type SummaryUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  addressDetail: string | null;
  imwebMemberCode: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

type SummaryPayload = {
  ok: true;
  user: SummaryUser;
  orders: SummaryOrder[];
  stats: {
    completedCount: number;
    totalPaidAmount: number;
  };
};

function formatMoney(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
}

function labelStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return { label: "결제완료", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" };
    case "REFUNDED":
      return { label: "환불", className: "bg-slate-500/20 text-slate-200 border-slate-500/20" };
    case "PARTIALLY_REFUNDED":
      return { label: "부분환불", className: "bg-slate-500/20 text-slate-200 border-slate-500/20" };
    case "CANCELLED":
      return { label: "취소", className: "bg-rose-500/20 text-rose-300 border-rose-500/20" };
    default:
      return { label: status, className: "bg-white/5 text-white/60 border-white/10" };
  }
}

export default function BuyerCell({ userId, name, email }: { userId: string; name: string | null; email: string }) {
  const title = useMemo(() => (name && name.trim() ? name.trim() : email), [name, email]);
  const subtitle = useMemo(() => (name && name.trim() ? email : ""), [name, email]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SummaryPayload | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`/api/admin/members/summary?userId=${encodeURIComponent(userId)}`, { method: "GET" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          const code = json?.error ? String(json.error) : `HTTP_${res.status}`;
          throw new Error(code);
        }
        if (!cancelled) setData(json as SummaryPayload);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "FETCH_FAILED");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, userId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group text-left"
        title="구매자 정보 보기"
      >
        <p className="text-[14px] text-white/85 group-hover:underline">{title}</p>
        {subtitle ? <p className="text-[12px] text-white/50">{subtitle}</p> : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#141416] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-white">회원 정보</p>
                <p className="mt-0.5 text-[12px] text-white/45">구매자를 클릭하면 회원정보와 구매 내역을 확인할 수 있습니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/80 hover:bg-white/10"
              >
                닫기
              </button>
            </div>

            <div className="px-5 py-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />
                  <div className="h-20 rounded bg-white/5 animate-pulse" />
                  <div className="h-40 rounded bg-white/5 animate-pulse" />
                </div>
              ) : err ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  정보를 불러오지 못했습니다. (에러: {err})
                </div>
              ) : data ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-white/45">이름</p>
                      <p className="mt-1 text-white">{data.user.name || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-white/45">이메일</p>
                      <p className="mt-1 text-white">{data.user.email}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-white/45">휴대폰</p>
                      <p className="mt-1 text-white">{data.user.phone || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-white/45">회원코드</p>
                      <p className="mt-1 text-white">{data.user.imwebMemberCode || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                      <p className="text-white/45">주소</p>
                      <p className="mt-1 text-white">
                        {data.user.address || "-"}
                        {data.user.addressDetail ? ` ${data.user.addressDetail}` : ""}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-white/45">가입일</p>
                      <p className="mt-1 text-white">{formatDateTime(data.user.createdAt)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-white/45">마지막 로그인</p>
                      <p className="mt-1 text-white">{data.user.lastLoginAt ? formatDateTime(data.user.lastLoginAt) : "-"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                      <div>
                        <p className="text-[14px] font-semibold text-white">구매했던 상품(주문) 목록</p>
                        <p className="mt-0.5 text-[12px] text-white/45">
                          결제완료 기준 {data.stats.completedCount}건 · 총 {formatMoney(data.stats.totalPaidAmount)}
                        </p>
                      </div>
                      <a
                        href={`/admin/members?q=${encodeURIComponent(data.user.email)}`}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/80 hover:bg-white/10"
                      >
                        회원관리에서 보기
                      </a>
                    </div>

                    {data.orders.length === 0 ? (
                      <div className="px-5 py-8 text-center text-[13px] text-white/45">구매 내역이 없습니다.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                              <th className="px-5 py-3 text-left text-[12px] font-medium text-white/50">주문번호</th>
                              <th className="px-5 py-3 text-left text-[12px] font-medium text-white/50">상품명</th>
                              <th className="px-5 py-3 text-left text-[12px] font-medium text-white/50">금액</th>
                              <th className="px-5 py-3 text-left text-[12px] font-medium text-white/50">상태</th>
                              <th className="px-5 py-3 text-left text-[12px] font-medium text-white/50">일시</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.orders.map((o) => {
                              const s = labelStatus(o.status);
                              return (
                                <tr key={o.orderNo} className="border-b border-white/5 hover:bg-white/[0.02]">
                                  <td className="px-5 py-3 font-mono text-[12px] text-white/70">
                                    <a href={`/admin/order/${encodeURIComponent(o.orderNo)}`} className="hover:underline">
                                      {o.orderNo}
                                    </a>
                                  </td>
                                  <td className="px-5 py-3 text-[13px] text-white/80">{o.productName}</td>
                                  <td className="px-5 py-3 text-[13px] text-white/80">{formatMoney(o.amount)}</td>
                                  <td className="px-5 py-3">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] ${s.className}`}>
                                      {s.label}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-[12px] text-white/50">{formatDateTime(o.createdAt)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

