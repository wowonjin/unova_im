"use client";

import { useEffect, useMemo, useState } from "react";

type Popup = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
};

const FALLBACK_POPUPS: Popup[] = [
  {
    id: "main-sumin-1",
    title: "김수민 선생님 소개",
    imageUrl: "/popups/sumin1.png",
    linkUrl: null,
    position: "center",
  },
];

function getDismissKey(id: string) {
  // 하루 동안만 닫기: YYYY-MM-DD 기준
  const d = new Date();
  const keyDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `unova_popup_dismissed:${id}:${keyDate}`;
}

function filterDismissed(list: Popup[]) {
  return list.filter((p) => {
    try {
      return !localStorage.getItem(getDismissKey(p.id));
    } catch {
      return true;
    }
  });
}

export default function PopupLayerClient() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        let list: Popup[] = [];
        // 팝업은 자주 변하지 않으므로 브라우저/서버 캐시를 허용해서 반복 로딩 비용을 줄입니다.
        const res = await fetch("/api/popups/active", { cache: "force-cache" });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) {
          list = Array.isArray(json.popups) ? json.popups : [];
        }
        const merged = [...FALLBACK_POPUPS, ...list];
        const filtered = filterDismissed(merged);
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
    const center = popups.filter((p) => p.position === "center");
    if (center.length > 0) return center;
    return popups.slice(0, 1);
  }, [popups]);

  useEffect(() => {
    if (active.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % active.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [active.length]);

  useEffect(() => {
    if (currentIndex < active.length) return;
    setCurrentIndex(0);
  }, [active.length, currentIndex]);

  if (!loaded) return null;
  if (active.length === 0) return null;

  const p = active[currentIndex] ?? active[0];

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
    <div className="pointer-events-none fixed left-3 top-1/2 z-[80] -translate-y-1/2 md:left-6">
      <div className="pointer-events-auto w-[280px] overflow-hidden rounded-none border border-white/20 bg-black/20 shadow-2xl backdrop-blur-[2px] md:w-[340px]">
        <div className="relative">
          <button type="button" onClick={open} className="block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt={p.title} className="w-full h-auto object-cover" />
          </button>
        </div>
        <div className="flex items-center border-t border-black/10 bg-white px-0 py-0">
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-none bg-transparent px-2.5 py-2.5 text-center text-[11px] text-black hover:bg-black/[0.04]"
          >
            오늘 그만 보기
          </button>
          <button
            type="button"
            onClick={() => {
              setPopups((prev) => prev.filter((x) => x.id !== p.id));
            }}
            className="flex-1 rounded-none border-l border-black/10 bg-transparent px-2.5 py-2.5 text-center text-[11px] text-black hover:bg-black/[0.04]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}


