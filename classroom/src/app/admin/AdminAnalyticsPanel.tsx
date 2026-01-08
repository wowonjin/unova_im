"use client";

import { useMemo } from "react";

export type AdminDailyMetrics = {
  date: string; // YYYY-MM-DD (KST)
  pageViews: number;
  visitors: number;
  orders: number;
  revenue: number; // net revenue (KRW)
  signups: number;
  inquiries: number;
  reviews: number;
};

type Summary = {
  orders: number;
  revenue: number;
  pageViews: number;
  visitors: number;
  signups: number;
  inquiries: number;
  reviews: number;
};

function formatMoney(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

function buildPolylinePoints(values: number[], w: number, h: number, pad = 8) {
  const max = Math.max(1, ...values);
  const min = 0;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const n = values.length;
  return values
    .map((v, i) => {
      const x = pad + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
      const y = pad + innerH - ((v - min) / (max - min)) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPath(values: number[], w: number, h: number, pad = 8) {
  const max = Math.max(1, ...values);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = pad + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
    const y = pad + innerH - (v / max) * innerH;
    return { x, y };
  });
  const startX = pts[0]?.x ?? pad;
  const endX = pts[pts.length - 1]?.x ?? w - pad;
  const baseY = pad + innerH;
  const d = [
    `M ${startX.toFixed(1)} ${baseY.toFixed(1)}`,
    `L ${startX.toFixed(1)} ${(pts[0]?.y ?? baseY).toFixed(1)}`,
    ...pts.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${endX.toFixed(1)} ${baseY.toFixed(1)}`,
    "Z",
  ].join(" ");
  return d;
}

export default function AdminAnalyticsPanel({
  daily,
  summary7,
  summaryMonth,
}: {
  daily: AdminDailyMetrics[];
  summary7: Summary;
  summaryMonth: Summary;
}) {
  const w = 520;
  const h = 220;

  const { labels, pv, uv } = useMemo(() => {
    const labels = daily.map((d) => d.date.slice(5)); // MM-DD
    const pv = daily.map((d) => d.pageViews);
    const uv = daily.map((d) => d.visitors);
    return { labels, pv, uv };
  }, [daily]);

  const maxForDots = Math.max(1, ...pv, ...uv);
  const pvPoints = buildPolylinePoints(pv, w, h, 10);
  const uvPoints = buildPolylinePoints(uv, w, h, 10);
  const pvArea = buildAreaPath(pv, w, h, 10);

  return (
    <div className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* 방문자 카드 */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-white">방문자</h2>
          </div>
          <a href="/admin/orders" className="text-[13px] text-white/60 hover:text-white/80">
            더보기
          </a>
        </div>

        <div className="mb-3 flex items-center gap-6 text-[13px] text-white/70">
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#93c5fd]" />
            페이지뷰
            <span className="text-white/40">({sum(pv).toLocaleString("ko-KR")})</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#4f46e5]" />
            방문자
            <span className="text-white/40">({sum(uv).toLocaleString("ko-KR")})</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] p-4">
          <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block">
            {/* grid */}
            {Array.from({ length: 5 }).map((_, i) => {
              const y = 10 + ((h - 20) * i) / 4;
              return <line key={i} x1="10" x2={w - 10} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />;
            })}

            <path d={pvArea} fill="rgba(147, 197, 253, 0.25)" />
            <polyline points={pvPoints} fill="none" stroke="#93c5fd" strokeWidth="2" />
            <polyline points={uvPoints} fill="none" stroke="#4f46e5" strokeWidth="2" />

            {/* dots */}
            {daily.map((d, i) => {
              const x = 10 + ((w - 20) * i) / Math.max(1, daily.length - 1);
              const yPv = 10 + (h - 20) - ((d.pageViews / maxForDots) * (h - 20));
              const yUv = 10 + (h - 20) - ((d.visitors / maxForDots) * (h - 20));
              return (
                <g key={d.date}>
                  <circle cx={x} cy={yPv} r="5.5" fill="#93c5fd" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                  <circle cx={x} cy={yUv} r="5.5" fill="#4f46e5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                </g>
              );
            })}
          </svg>

          <div className="mt-2 flex justify-between text-[12px] text-white/35">
            {labels.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 기간별 분석 카드 */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-white">기간별 분석</h2>
          </div>
          <a href="/admin/orders" className="text-[13px] text-white/60 hover:text-white/80">
            더보기
          </a>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#111113]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-white/60">일자</th>
                <th className="px-4 py-3 text-right text-[12px] font-semibold text-white/60">주문수</th>
                <th className="px-4 py-3 text-right text-[12px] font-semibold text-white/60">매출액</th>
                <th className="px-4 py-3 text-right text-[12px] font-semibold text-white/60">방문자</th>
                <th className="px-4 py-3 text-right text-[12px] font-semibold text-white/60">가입</th>
                <th className="px-4 py-3 text-right text-[12px] font-semibold text-white/60">문의</th>
                <th className="px-4 py-3 text-right text-[12px] font-semibold text-white/60">후기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {daily
                .slice()
                .reverse()
                .map((d) => (
                  <tr key={d.date} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-[13px] text-white/80">{d.date}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-white/80">{d.orders.toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-white/80">{formatMoney(d.revenue)}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-white/80">{d.visitors.toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-white/80">{d.signups.toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-white/80">{d.inquiries.toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-white/80">{d.reviews.toLocaleString("ko-KR")}</td>
                  </tr>
                ))}

              <tr className="bg-white/[0.02]">
                <td className="px-4 py-3 text-[12px] font-semibold text-white/60">최근 7일 합계</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summary7.orders.toLocaleString("ko-KR")}건</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{formatMoney(summary7.revenue)}</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summary7.visitors.toLocaleString("ko-KR")}명</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summary7.signups.toLocaleString("ko-KR")}명</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summary7.inquiries.toLocaleString("ko-KR")}</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summary7.reviews.toLocaleString("ko-KR")}</td>
              </tr>

              <tr className="bg-white/[0.02]">
                <td className="px-4 py-3 text-[12px] font-semibold text-white/60">이번달 합계</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summaryMonth.orders.toLocaleString("ko-KR")}건</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{formatMoney(summaryMonth.revenue)}</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summaryMonth.visitors.toLocaleString("ko-KR")}명</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summaryMonth.signups.toLocaleString("ko-KR")}명</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summaryMonth.inquiries.toLocaleString("ko-KR")}</td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-white/70">{summaryMonth.reviews.toLocaleString("ko-KR")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

