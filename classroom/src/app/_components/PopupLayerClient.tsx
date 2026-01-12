"use client";

import { useEffect, useMemo, useState } from "react";

type Popup = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
};

function getDismissKey(id: string) {
  // 하루 동안만 닫기: YYYY-MM-DD 기준
  const d = new Date();
  const keyDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `unova_popup_dismissed:${id}:${keyDate}`;
}

export default function PopupLayerClient() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        // 팝업은 자주 변하지 않으므로 브라우저/서버 캐시를 허용해서 반복 로딩 비용을 줄입니다.
        const res = await fetch("/api/popups/active", { cache: "force-cache" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) return;
        const list: Popup[] = Array.isArray(json.popups) ? json.popups : [];

        // localStorage 닫기 상태 반영
        const filtered = list.filter((p) => {
          try {
            return !localStorage.getItem(getDismissKey(p.id));
          } catch {
            return true;
          }
        });
        if (!cancelled) setPopups(filtered);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(() => {
    // center 팝업이 있으면 그것만 우선 노출(사용자 경험)
    const center = popups.find((p) => p.position === "center");
    if (center) return [center];
    return popups.slice(0, 1);
  }, [popups]);

  if (!loaded) return null;
  if (active.length === 0) return null;

  const p = active[0];
  const isCenter = p.position === "center";

  const close = () => {
    try {
      localStorage.setItem(getDismissKey(p.id), "1");
    } catch {
      // ignore
    }
    setPopups((prev) => prev.filter((x) => x.id !== p.id));
  };

  const open = () => {
    if (!p.linkUrl) return;
    // 내부/외부 모두 새 탭으로(운영에서 팝업 클릭은 이탈/전환 목적이 많음)
    window.open(p.linkUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {isCenter ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1c] shadow-2xl">
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 z-10 rounded-lg bg-black/40 p-2 text-white/80 hover:bg-black/60"
              aria-label="닫기"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                close
              </span>
            </button>
            <button type="button" onClick={open} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.title} className="w-full h-auto object-cover" />
            </button>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <p className="truncate text-sm text-white/70">{p.title}</p>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15"
              >
                오늘 그만 보기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-4 right-4 z-[80] w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1c] shadow-2xl">
          <div className="relative">
            <button
              type="button"
              onClick={close}
              className="absolute right-2 top-2 z-10 rounded-lg bg-black/40 p-1.5 text-white/80 hover:bg-black/60"
              aria-label="닫기"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                close
              </span>
            </button>
            <button type="button" onClick={open} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.title} className="w-full h-auto object-cover" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-2">
            <p className="truncate text-xs text-white/70">{p.title}</p>
            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/15"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}


