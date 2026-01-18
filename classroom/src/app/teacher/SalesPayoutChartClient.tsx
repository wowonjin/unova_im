"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };

function formatWon(v: number) {
  return `${Math.max(0, Math.round(v)).toLocaleString("ko-KR")}원`;
}

function formatWonShort(v: number) {
  const n = Math.max(0, Math.round(v));
  if (n >= 100_000_000) {
    const x = n / 100_000_000;
    return `${Number.isInteger(x) ? x.toFixed(0) : x.toFixed(1)}억`;
  }
  if (n >= 10_000) {
    const x = n / 10_000;
    return `${Number.isInteger(x) ? x.toFixed(0) : x.toFixed(1)}만`;
  }
  return `${n.toLocaleString("ko-KR")}`;
}

function smoothPath(points: Point[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const d: string[] = [];
  d.push(`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`);

  // Catmull-Rom -> Bezier (부드러운 곡선)
  const tension = 0.8;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    d.push(
      `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    );
  }
  return d.join(" ");
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition ${
        active
          ? "bg-white/10 border-white/20 text-white"
          : "bg-transparent border-white/[0.08] text-white/45 hover:bg-white/[0.04] hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

export default function SalesPayoutChartClient({
  labels,
  weekdays,
  salesValues,
  payoutValues,
}: {
  labels: string[];
  weekdays: string[];
  salesValues: number[];
  payoutValues: number[];
}) {
  const [active, setActive] = useState<"sales" | "payout">("sales");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const W = 960;
  const H = 280;
  const padL = 56;
  const padR = 16;
  const padT = 22;
  const padB = 64;
  const w = W - padL - padR;
  const h = H - padT - padB;

  const max = useMemo(() => {
    const all = [...salesValues, ...payoutValues].map((v) => Math.max(0, v));
    return Math.max(1, ...all);
  }, [salesValues, payoutValues]);

  const tickVals = useMemo(() => [0, max * 0.5, max].map((v) => Math.round(v)), [max]);

  const n = labels.length;
  const xAt = (i: number) => padL + (n <= 1 ? 0 : (w * i) / (n - 1));
  const yAt = (v: number) => padT + (1 - Math.max(0, v) / max) * h;

  const clampIdx = (i: number) => Math.max(0, Math.min(n - 1, i));

  const svgPointFromClient = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(inv);
    return { x: p.x, y: p.y };
  };

  const series = useMemo(
    () => [
      {
        key: "sales" as const,
        label: "판매액",
        values: salesValues,
        line: "rgba(255,255,255,0.95)",
        areaId: "salesAreaCombinedV3",
        areaTop: "rgba(255,255,255,0.16)",
        areaBottom: "rgba(255,255,255,0)",
      },
      {
        key: "payout" as const,
        label: "정산액",
        values: payoutValues,
        line: "rgba(16,185,129,0.95)",
        areaId: "payoutAreaCombinedV3",
        areaTop: "rgba(16,185,129,0.18)",
        areaBottom: "rgba(16,185,129,0)",
      },
    ],
    [salesValues, payoutValues]
  );

  const hoverMeta = useMemo(() => {
    if (hoverIdx === null || n <= 0) return null;
    const i = clampIdx(hoverIdx);
    const day = labels[i] ?? "";
    const wd = weekdays[i] ?? "";
    const salesV = salesValues[i] ?? 0;
    const payoutV = payoutValues[i] ?? 0;
    return {
      i,
      day,
      wd,
      x: xAt(i),
      salesV,
      payoutV,
      salesY: yAt(salesV),
      payoutY: yAt(payoutV),
    };
  }, [hoverIdx, n, labels, weekdays, salesValues, payoutValues, max]);

  const updateTooltipPos = (meta: NonNullable<typeof hoverMeta>) => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    const y = active === "sales" ? meta.salesY : meta.payoutY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = meta.x;
    pt.y = y;
    const screen = pt.matrixTransform(ctm);
    const wrapRect = wrap.getBoundingClientRect();
    const left = screen.x - wrapRect.left;
    const top = screen.y - wrapRect.top;

    // 툴팁이 가장자리에서 잘리지 않도록 약간의 clamp
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const paddedLeft = clamp(left, 24, wrapRect.width - 24);
    const paddedTop = clamp(top, 12, wrapRect.height - 12);
    setTooltipPos({ left: paddedLeft, top: paddedTop });
  };

  useEffect(() => {
    if (!hoverMeta) {
      setTooltipPos(null);
      return;
    }
    updateTooltipPos(hoverMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverMeta?.i, active]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-white/70 font-semibold">판매액 / 정산액 그래프</p>
        <div className="flex flex-wrap items-center gap-2">
          <SegButton active={active === "sales"} onClick={() => setActive("sales")}>
            판매액
          </SegButton>
          <SegButton active={active === "payout"} onClick={() => setActive("payout")}>
            정산액
          </SegButton>
        </div>
      </div>

      <div ref={wrapRef} className="min-w-0 relative">
        {/* hover tooltip */}
        {hoverMeta && tooltipPos ? (
          <div
            className="pointer-events-none absolute z-[99999] w-[240px] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border border-white/10 bg-[#1d1d1f] px-3 py-2 text-[11px] text-white/80 shadow-lg"
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-white/90">좌표</span>
              <span className="text-white/50">
                {hoverMeta.day} ({hoverMeta.wd})
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="inline-flex items-center gap-1 text-white/60">
                  <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
                  판매액
                </span>
                <span className="font-semibold text-white/90 tabular-nums">{formatWon(hoverMeta.salesV)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="inline-flex items-center gap-1 text-white/60">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400/80" />
                  정산액
                </span>
                <span className="font-semibold text-white/90 tabular-nums">{formatWon(hoverMeta.payoutV)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-[260px] w-full"
          onPointerMove={(e) => {
            if (n <= 0) return;
            const p = svgPointFromClient(e.clientX, e.clientY);
            if (!p) return;
            const t = n <= 1 ? 0 : (p.x - padL) / w;
            const idx = n <= 1 ? 0 : Math.round(t * (n - 1));
            const ci = clampIdx(idx);
            setHoverIdx(ci);
            const meta = {
              i: ci,
              day: labels[ci] ?? "",
              wd: weekdays[ci] ?? "",
              x: xAt(ci),
              salesV: salesValues[ci] ?? 0,
              payoutV: payoutValues[ci] ?? 0,
              salesY: yAt(salesValues[ci] ?? 0),
              payoutY: yAt(payoutValues[ci] ?? 0),
            };
            updateTooltipPos(meta);
          }}
          onPointerLeave={() => {
            setHoverIdx(null);
            setTooltipPos(null);
          }}
        >
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={s.areaId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={s.areaTop} />
                <stop offset="1" stopColor={s.areaBottom} />
              </linearGradient>
            ))}
          </defs>

          {/* grid + y labels */}
          {tickVals.map((t, idx) => {
            const y = yAt(t);
            return (
              <g key={`tick-${idx}-${t}`}>
                <line x1={padL} y1={y} x2={padL + w} y2={y} stroke="rgba(255,255,255,0.08)" />
                <text x={padL - 10} y={y + 4} textAnchor="end" fontSize="12" fill="rgba(255,255,255,0.45)">
                  {formatWonShort(t)}
                </text>
              </g>
            );
          })}

          {/* series paths */}
          {(() => {
            const baseY = padT + h;
            return (
              <>
                {series.map((s) => {
                  const isActive = s.key === active;
                  const opacity = isActive ? 1 : 0.18;
                  const pts: Point[] = labels.map((_, i) => ({ x: xAt(i), y: yAt(s.values?.[i] ?? 0) }));
                  const lineD = smoothPath(pts);
                  const areaD =
                    pts.length >= 2
                      ? `${lineD} L ${pts[pts.length - 1].x.toFixed(2)} ${baseY.toFixed(2)} L ${pts[0].x.toFixed(
                          2
                        )} ${baseY.toFixed(2)} Z`
                      : "";

                  return (
                    <g key={s.key} opacity={opacity}>
                      {isActive && areaD ? <path d={areaD} fill={`url(#${s.areaId})`} /> : null}
                      <path d={lineD} fill="none" stroke={s.line} strokeWidth={isActive ? "3" : "2.5"} />
                      {pts.map((p, i) => (
                        <g key={`${s.key}-p-${i}`}>
                          <circle cx={p.x} cy={p.y} r={isActive ? (i === pts.length - 1 ? 3.6 : 3.1) : 2.7} fill={s.line} />
                          <title>
                            {labels[i]} ({weekdays[i]}) · {s.label}: {formatWon(s.values?.[i] ?? 0)}
                          </title>
                        </g>
                      ))}
                    </g>
                  );
                })}
              </>
            );
          })()}

          {/* hover crosshair */}
          {hoverMeta ? (
            <g>
              <line
                x1={hoverMeta.x}
                y1={padT}
                x2={hoverMeta.x}
                y2={padT + h}
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="1"
              />
              <circle cx={hoverMeta.x} cy={active === "sales" ? hoverMeta.salesY : hoverMeta.payoutY} r="4" fill="rgba(255,255,255,0.90)" />
              <circle cx={hoverMeta.x} cy={hoverMeta.payoutY} r="3.2" fill="rgba(16,185,129,0.95)" opacity={active === "payout" ? 1 : 0.35} />
              <circle cx={hoverMeta.x} cy={hoverMeta.salesY} r="3.2" fill="rgba(255,255,255,0.95)" opacity={active === "sales" ? 1 : 0.35} />
            </g>
          ) : null}

          {/* x axis labels */}
          {labels.map((d, i) => {
            const x = xAt(i);
            const isWeekend = weekdays[i] === "일" || weekdays[i] === "토";
            return (
              <g key={`xl-${i}`}>
                <text
                  x={x}
                  y={padT + h + 22}
                  textAnchor="middle"
                  fontSize="12"
                  fill={isWeekend ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.55)"}
                >
                  {weekdays[i]}
                </text>
                <text x={x} y={padT + h + 42} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.30)">
                  {d}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

