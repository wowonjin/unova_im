"use client";

import { useMemo, useState } from "react";

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

// Catmull-Rom spline을 사용한 부드러운 곡선 생성
function catmullRomSpline(points: { x: number; y: number }[], tension = 0.5): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function buildSmoothPath(values: number[], w: number, h: number, pad = 20) {
  const max = Math.max(1, ...values);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const n = values.length;

  const points = values.map((v, i) => ({
    x: pad + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1)),
    y: pad + innerH - (v / max) * innerH,
  }));

  return catmullRomSpline(points);
}

function buildSmoothAreaPath(values: number[], w: number, h: number, pad = 20) {
  const max = Math.max(1, ...values);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const n = values.length;
  const baseY = pad + innerH;

  const points = values.map((v, i) => ({
    x: pad + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1)),
    y: pad + innerH - (v / max) * innerH,
  }));

  const linePath = catmullRomSpline(points);
  const startX = points[0]?.x ?? pad;
  const endX = points[points.length - 1]?.x ?? w - pad;

  return `${linePath} L ${endX} ${baseY} L ${startX} ${baseY} Z`;
}

function getPointCoords(values: number[], w: number, h: number, pad = 20) {
  const max = Math.max(1, ...values);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const n = values.length;

  return values.map((v, i) => ({
    x: pad + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1)),
    y: pad + innerH - (v / max) * innerH,
    value: v,
  }));
}

// 통계 카드 컴포넌트
function StatCard({
  label,
  value,
  lines,
}: {
  label: string;
  value?: string;
  lines?: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{label}</div>
      {lines && lines.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {lines.map((line) => (
            <div key={line.label} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-white/40">{line.label}</span>
              <span className="font-medium text-white/80">{line.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-[24px] font-semibold text-white/90 tracking-tight">{value ?? "-"}</div>
      )}
    </div>
  );
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeMetric, setActiveMetric] = useState<"pageViews" | "visitors" | "orders" | "revenue">("pageViews");

  const w = 600;
  const h = 260;
  const pad = 30;

  const { labels, pv, uv, orders, revenue, pvPoints, uvPoints, ordersPoints, revenuePoints } = useMemo(() => {
    const labels = daily.map((d) => {
      const [, m, day] = d.date.split("-");
      return `${parseInt(m || "1")}/${parseInt(day || "1")}`;
    });
    const pv = daily.map((d) => d.pageViews);
    const uv = daily.map((d) => d.visitors);
    const orders = daily.map((d) => d.orders);
    const revenue = daily.map((d) => d.revenue);
    const pvPoints = getPointCoords(pv, w, h, pad);
    const uvPoints = getPointCoords(uv, w, h, pad);
    const ordersPoints = getPointCoords(orders, w, h, pad);
    const revenuePoints = getPointCoords(revenue, w, h, pad);
    return { labels, pv, uv, orders, revenue, pvPoints, uvPoints, ordersPoints, revenuePoints };
  }, [daily]);

  const metricConfig = {
    pageViews: {
      label: "페이지뷰",
      values: pv,
      points: pvPoints,
      gradientId: "pvGradient",
      stroke: "rgba(255,255,255,0.55)",
      dot: "rgba(255,255,255,0.75)",
    },
    visitors: {
      label: "방문자",
      values: uv,
      points: uvPoints,
      gradientId: "uvGradient",
      stroke: "rgba(255,255,255,0.3)",
      dot: "rgba(255,255,255,0.5)",
    },
    orders: {
      label: "주문",
      values: orders,
      points: ordersPoints,
      gradientId: "ordersGradient",
      stroke: "rgba(56,189,248,0.65)", // sky-400
      dot: "rgba(56,189,248,0.75)",
    },
    revenue: {
      label: "매출",
      values: revenue,
      points: revenuePoints,
      gradientId: "revenueGradient",
      stroke: "rgba(52,211,153,0.65)", // emerald-400
      dot: "rgba(52,211,153,0.75)",
    },
  } as const;

  const active = metricConfig[activeMetric];
  const activePath = buildSmoothPath(active.values, w, h, pad);
  const activeArea = buildSmoothAreaPath(active.values, w, h, pad);

  const formatRevenueTick = (v: number) => {
    if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
    if (v >= 10_000) return `${(v / 10_000).toFixed(1)}만`;
    return v.toLocaleString("ko-KR");
  };

  const formatActiveValue = (v: number) => {
    if (activeMetric === "revenue") return formatMoney(v);
    if (activeMetric === "orders") return `${v}건`;
    return v.toLocaleString("ko-KR");
  };

  // Y축 눈금 계산
  const maxValue = Math.max(...active.values, 1);
  const yTicks = [0, Math.round(maxValue * 0.25), Math.round(maxValue * 0.5), Math.round(maxValue * 0.75), maxValue];
  const todayMetric = daily[daily.length - 1];
  const todayOrders = todayMetric?.orders ?? 0;
  const todayRevenue = todayMetric?.revenue ?? 0;
  const todayPageViews = todayMetric?.pageViews ?? 0;
  const todayVisitors = todayMetric?.visitors ?? 0;

  return (
    <div className="mb-10 space-y-6">
      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="페이지뷰"
          lines={[
            { label: "오늘", value: todayPageViews.toLocaleString("ko-KR") },
            { label: "이번주", value: sum(pv).toLocaleString("ko-KR") },
            { label: "이번달", value: summaryMonth.pageViews.toLocaleString("ko-KR") },
          ]}
        />
        <StatCard
          label="방문자"
          lines={[
            { label: "오늘", value: todayVisitors.toLocaleString("ko-KR") },
            { label: "이번주", value: sum(uv).toLocaleString("ko-KR") },
            { label: "이번달", value: summaryMonth.visitors.toLocaleString("ko-KR") },
          ]}
        />
        <StatCard
          label="주문"
          lines={[
            { label: "오늘", value: `${todayOrders}건` },
            { label: "이번주", value: `${summary7.orders}건` },
            { label: "이번달", value: `${summaryMonth.orders}건` },
          ]}
        />
        <StatCard
          label="매출"
          lines={[
            { label: "오늘", value: formatMoney(todayRevenue) },
            { label: "이번주", value: formatMoney(summary7.revenue) },
            { label: "이번달", value: formatMoney(summaryMonth.revenue) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 방문자 트래픽 그래프 카드 */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-white/90">트래픽 분석</h2>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveMetric("pageViews")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  activeMetric === "pageViews"
                    ? "bg-white/10 text-white/80"
                    : "text-white/30 hover:bg-white/[0.04] hover:text-white/50"
                }`}
              >
                페이지뷰
              </button>
              <button
                onClick={() => setActiveMetric("visitors")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  activeMetric === "visitors"
                    ? "bg-white/10 text-white/80"
                    : "text-white/30 hover:bg-white/[0.04] hover:text-white/50"
                }`}
              >
                방문자
              </button>
              <button
                onClick={() => setActiveMetric("orders")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  activeMetric === "orders"
                    ? "bg-white/10 text-white/80"
                    : "text-white/30 hover:bg-white/[0.04] hover:text-white/50"
                }`}
              >
                주문
              </button>
              <button
                onClick={() => setActiveMetric("revenue")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  activeMetric === "revenue"
                    ? "bg-white/10 text-white/80"
                    : "text-white/30 hover:bg-white/[0.04] hover:text-white/50"
                }`}
              >
                매출
              </button>
            </div>
          </div>

          {/* 레전드 */}
          <div className="mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: active.dot }} />
            <span className="text-[12px] text-white/40">{active.label}</span>
            <span className="text-[12px] font-medium text-white/60">{formatActiveValue(sum(active.values))}</span>
          </div>

          {/* 그래프 영역 */}
          <div className="relative rounded-xl bg-white/[0.01] p-2">
            <svg
              width="100%"
              viewBox={`0 0 ${w} ${h}`}
              className="block overflow-visible"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                {/* 페이지뷰 그라데이션 */}
                <linearGradient id="pvGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                {/* 방문자 그라데이션 */}
                <linearGradient id="uvGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                {/* 주문 그라데이션 */}
                <linearGradient id="ordersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
                  <stop offset="100%" stopColor="rgba(56,189,248,0)" />
                </linearGradient>
                {/* 매출 그라데이션 */}
                <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(52,211,153,0.16)" />
                  <stop offset="100%" stopColor="rgba(52,211,153,0)" />
                </linearGradient>
              </defs>

              {/* Y축 그리드 라인 */}
              {yTicks.map((tick, i) => {
                const y = pad + (h - pad * 2) - (tick / maxValue) * (h - pad * 2);
                return (
                  <g key={i}>
                    <line
                      x1={pad}
                      x2={w - pad}
                      y1={y}
                      y2={y}
                      stroke="rgba(255,255,255,0.04)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={pad - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-white/20 text-[9px]"
                    >
                      {activeMetric === "revenue" ? formatRevenueTick(tick) : tick.toLocaleString("ko-KR")}
                    </text>
                  </g>
                );
              })}

              {/* 영역 채우기 */}
              <path d={activeArea} fill={`url(#${active.gradientId})`} className="transition-opacity duration-300" />

              {/* 라인 */}
              <path
                d={activePath}
                fill="none"
                stroke={active.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-opacity duration-300"
              />

              {/* 호버 영역 및 점 */}
              {daily.map((d, i) => {
                const pt = active.points[i];
                const isHovered = hoveredIndex === i;
                const columnWidth = (w - pad * 2) / (daily.length - 1 || 1);
                const hitAreaX = i === 0 ? pad : pt.x - columnWidth / 2;
                const hitAreaWidth = i === 0 || i === daily.length - 1 ? columnWidth / 2 : columnWidth;

                return (
                  <g key={d.date}>
                    {/* 호버 영역 */}
                    <rect
                      x={hitAreaX}
                      y={pad}
                      width={hitAreaWidth}
                      height={h - pad * 2}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIndex(i)}
                      className="cursor-pointer"
                    />

                    {/* 호버 시 수직선 */}
                    {isHovered && (
                      <line
                        x1={pt.x}
                        x2={pt.x}
                        y1={pad}
                        y2={h - pad}
                        stroke="rgba(255,255,255,0.1)"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* 점 */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? active.dot : active.dot}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth="1"
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}

              {/* X축 레이블 */}
              {labels.map((label, i) => {
                const x = pad + ((w - pad * 2) * i) / (labels.length - 1 || 1);
                return (
                  <text
                    key={label}
                    x={x}
                    y={h - 8}
                    textAnchor="middle"
                    className={`text-[10px] transition-all ${hoveredIndex === i ? "fill-white/60 font-medium" : "fill-white/25"}`}
                  >
                    {label}
                  </text>
                );
              })}
            </svg>

            {/* 툴팁 */}
            {hoveredIndex !== null && daily[hoveredIndex] && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-white/[0.08] bg-[#18181b]/95 px-3 py-2.5 shadow-xl"
                style={{
                  left: `${(active.points[hoveredIndex].x / w) * 100}%`,
                  top: "16px",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="mb-1.5 text-[11px] font-medium text-white/50">{daily[hoveredIndex].date}</div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active.dot }} />
                    <span className="text-[11px] text-white/40">{active.label}</span>
                    <span className="text-[12px] font-semibold text-white/80">{formatActiveValue(active.points[hoveredIndex].value)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 기간별 분석 카드 */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-5">
            <h2 className="text-[17px] font-semibold text-white/90">기간별 분석</h2>
          </div>

          {/* 일별 상세 테이블 */}
          <div className="overflow-hidden rounded-xl bg-transparent">
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-white/[0.06] bg-transparent">
                    <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-white">일자</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white">주문</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white">매출</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white">방문자</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white">PV</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white">가입</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white">문의</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {daily
                    .slice()
                    .reverse()
                    .map((d, idx) => (
                      <tr
                        key={d.date}
                        className={`transition-colors hover:bg-white/[0.02] ${idx === 0 ? "bg-white/[0.015]" : ""}`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="text-[12px] font-medium text-white">{d.date.slice(5)}</div>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className={`text-[12px] ${d.orders > 0 ? "font-medium text-white" : "text-white"}`}>
                            {d.orders > 0 ? d.orders : "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className={`text-[12px] ${d.revenue > 0 ? "font-medium text-white" : "text-white"}`}>
                            {d.revenue > 0 ? formatMoney(d.revenue) : "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className="text-[12px] text-white">{d.visitors.toLocaleString()}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className="text-[12px] text-white">{d.pageViews.toLocaleString()}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className={`text-[12px] ${d.signups > 0 ? "text-white" : "text-white"}`}>
                            {d.signups > 0 ? d.signups : "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className={`text-[12px] ${d.inquiries > 0 ? "text-white" : "text-white"}`}>
                            {d.inquiries > 0 ? d.inquiries : "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* 합계 행 */}
            <div className="border-t border-white/[0.06] bg-transparent">
              <div className="grid grid-cols-7 px-3 py-2.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white">합계 (7일)</div>
                <div className="text-right text-[12px] font-semibold text-white">{summary7.orders}건</div>
                <div className="text-right text-[12px] font-semibold text-white">{formatMoney(summary7.revenue)}</div>
                <div className="text-right text-[12px] text-white">{summary7.visitors.toLocaleString()}</div>
                <div className="text-right text-[12px] text-white">{summary7.pageViews.toLocaleString()}</div>
                <div className="text-right text-[12px] text-white">{summary7.signups}</div>
                <div className="text-right text-[12px] text-white">{summary7.inquiries}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
