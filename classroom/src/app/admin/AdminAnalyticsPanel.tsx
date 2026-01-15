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
  icon,
  accentColor,
  trend,
}: {
  label: string;
  value: string;
  icon: string;
  accentColor: string;
  trend?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="absolute -right-2 -top-2 text-[48px] opacity-[0.03]">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-medium text-white/40 uppercase tracking-wider">
        <span className={`material-symbols-outlined text-[14px] ${accentColor}`}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-[24px] font-semibold text-white/90 tracking-tight">{value}</div>
      {trend !== undefined && trend !== 0 && (
        <div className={`mt-1 flex items-center gap-1 text-[11px] ${trend >= 0 ? "text-white/40" : "text-white/30"}`}>
          <span className="material-symbols-outlined text-[12px]">
            {trend >= 0 ? "north" : "south"}
          </span>
          {Math.abs(trend)}% vs 어제
        </div>
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
  const [activeMetric, setActiveMetric] = useState<"pageViews" | "visitors">("pageViews");

  const w = 600;
  const h = 260;
  const pad = 30;

  const { labels, pv, uv, pvPoints, uvPoints } = useMemo(() => {
    const labels = daily.map((d) => {
      const [, m, day] = d.date.split("-");
      return `${parseInt(m || "1")}/${parseInt(day || "1")}`;
    });
    const pv = daily.map((d) => d.pageViews);
    const uv = daily.map((d) => d.visitors);
    const pvPoints = getPointCoords(pv, w, h, pad);
    const uvPoints = getPointCoords(uv, w, h, pad);
    return { labels, pv, uv, pvPoints, uvPoints };
  }, [daily]);

  const pvPath = buildSmoothPath(pv, w, h, pad);
  const uvPath = buildSmoothPath(uv, w, h, pad);
  const pvArea = buildSmoothAreaPath(pv, w, h, pad);
  const uvArea = buildSmoothAreaPath(uv, w, h, pad);

  // Y축 눈금 계산
  const maxValue = Math.max(...pv, ...uv, 1);
  const yTicks = [0, Math.round(maxValue * 0.25), Math.round(maxValue * 0.5), Math.round(maxValue * 0.75), maxValue];

  // 오늘 vs 어제 트렌드 계산
  const today = daily[daily.length - 1];
  const yesterday = daily[daily.length - 2];
  const pvTrend = yesterday && yesterday.pageViews > 0 
    ? Math.round(((today?.pageViews || 0) - yesterday.pageViews) / yesterday.pageViews * 100)
    : 0;
  const uvTrend = yesterday && yesterday.visitors > 0
    ? Math.round(((today?.visitors || 0) - yesterday.visitors) / yesterday.visitors * 100)
    : 0;

  return (
    <div className="mb-10 space-y-6">
      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="페이지뷰"
          value={sum(pv).toLocaleString("ko-KR")}
          icon="visibility"
          accentColor="text-white/50"
          trend={pvTrend}
        />
        <StatCard
          label="방문자"
          value={sum(uv).toLocaleString("ko-KR")}
          icon="person"
          accentColor="text-white/50"
          trend={uvTrend}
        />
        <StatCard
          label="주문"
          value={`${summary7.orders}건`}
          icon="shopping_cart"
          accentColor="text-white/50"
        />
        <StatCard
          label="매출"
          value={formatMoney(summary7.revenue)}
          icon="payments"
          accentColor="text-white/50"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 방문자 트래픽 그래프 카드 */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-white/90">트래픽 분석</h2>
              <p className="mt-0.5 text-[12px] text-white/30">최근 7일간 방문 추이</p>
            </div>
            <div className="flex items-center gap-1.5">
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
            </div>
          </div>

          {/* 레전드 */}
          <div className="mb-4 flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-white/60" />
              <span className="text-[12px] text-white/40">페이지뷰</span>
              <span className="text-[12px] font-medium text-white/60">{sum(pv).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-white/30" />
              <span className="text-[12px] text-white/40">방문자</span>
              <span className="text-[12px] font-medium text-white/60">{sum(uv).toLocaleString()}</span>
            </div>
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
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* 영역 채우기 */}
              <path
                d={pvArea}
                fill="url(#pvGradient)"
                className={`transition-opacity duration-300 ${activeMetric === "visitors" ? "opacity-30" : "opacity-100"}`}
              />
              <path
                d={uvArea}
                fill="url(#uvGradient)"
                className={`transition-opacity duration-300 ${activeMetric === "pageViews" ? "opacity-30" : "opacity-100"}`}
              />

              {/* 라인 */}
              <path
                d={pvPath}
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-opacity duration-300 ${activeMetric === "visitors" ? "opacity-30" : "opacity-100"}`}
              />
              <path
                d={uvPath}
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-opacity duration-300 ${activeMetric === "pageViews" ? "opacity-30" : "opacity-100"}`}
              />

              {/* 호버 영역 및 점 */}
              {daily.map((d, i) => {
                const pvPt = pvPoints[i];
                const uvPt = uvPoints[i];
                const isHovered = hoveredIndex === i;
                const columnWidth = (w - pad * 2) / (daily.length - 1 || 1);
                const hitAreaX = i === 0 ? pad : pvPt.x - columnWidth / 2;
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
                        x1={pvPt.x}
                        x2={pvPt.x}
                        y1={pad}
                        y2={h - pad}
                        stroke="rgba(255,255,255,0.1)"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* 페이지뷰 점 */}
                    <circle
                      cx={pvPt.x}
                      cy={pvPt.y}
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)"}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth="1"
                      className={`transition-all duration-150 ${activeMetric === "visitors" ? "opacity-30" : "opacity-100"}`}
                    />

                    {/* 방문자 점 */}
                    <circle
                      cx={uvPt.x}
                      cy={uvPt.y}
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)"}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth="1"
                      className={`transition-all duration-150 ${activeMetric === "pageViews" ? "opacity-30" : "opacity-100"}`}
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
                  left: `${(pvPoints[hoveredIndex].x / w) * 100}%`,
                  top: "16px",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="mb-1.5 text-[11px] font-medium text-white/50">{daily[hoveredIndex].date}</div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
                    <span className="text-[11px] text-white/40">페이지뷰</span>
                    <span className="text-[12px] font-semibold text-white/80">{daily[hoveredIndex].pageViews.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                    <span className="text-[11px] text-white/40">방문자</span>
                    <span className="text-[12px] font-semibold text-white/80">{daily[hoveredIndex].visitors.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 기간별 분석 카드 */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-white/90">기간별 분석</h2>
              <p className="mt-0.5 text-[12px] text-white/30">일별 상세 통계</p>
            </div>
            <a
              href="/admin/orders"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-white/40 transition-all hover:bg-white/[0.04] hover:text-white/60"
            >
              더보기
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            </a>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.04] bg-black/20">
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-white/[0.04] bg-[#0c0c0e]">
                    <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-white/30">일자</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white/30">주문</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white/30">매출</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white/30">방문자</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white/30">가입</th>
                    <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white/30">문의</th>
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
                          <div className="text-[12px] font-medium text-white/60">{d.date.slice(5)}</div>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className={`text-[12px] ${d.orders > 0 ? "font-medium text-white/70" : "text-white/20"}`}>
                            {d.orders > 0 ? d.orders : "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className={`text-[12px] ${d.revenue > 0 ? "font-medium text-white/70" : "text-white/20"}`}>
                            {d.revenue > 0 ? formatMoney(d.revenue) : "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className="text-[12px] text-white/50">{d.visitors.toLocaleString()}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className={`text-[12px] ${d.signups > 0 ? "text-white/50" : "text-white/20"}`}>
                            {d.signups > 0 ? d.signups : "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <span className={`text-[12px] ${d.inquiries > 0 ? "text-white/50" : "text-white/20"}`}>
                            {d.inquiries > 0 ? d.inquiries : "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* 요약 행 */}
            <div className="border-t border-white/[0.06] bg-white/[0.02]">
              <div className="grid grid-cols-2 divide-x divide-white/[0.04]">
                <div className="p-3.5">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/30">최근 7일</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[16px] font-semibold text-white/80">{formatMoney(summary7.revenue)}</span>
                    <span className="text-[11px] text-white/30">{summary7.orders}건</span>
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/30">이번달</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[16px] font-semibold text-white/80">{formatMoney(summaryMonth.revenue)}</span>
                    <span className="text-[11px] text-white/30">{summaryMonth.orders}건</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
