"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { id: "section-suneung", label: "수능 교재 구매하기" },
  { id: "section-g1", label: "내신 교재 구매하기" },
  { id: "section-transfer", label: "편입 교재 구매하기" },
  { id: "section-courses", label: "강의 구매하기" },
  { id: "section-free", label: "무료 자료 다운로드" },
];

/** 스크롤이 이 값(px) 이상 내려가면 네비게이션이 나타남 */
const SHOW_THRESHOLD = 50;

export default function HomeSectionNav() {
  const [activeId, setActiveId] = useState<string>("");
  const [visible, setVisible] = useState(false);
  const observersRef = useRef<IntersectionObserver[]>([]);

  // 스크롤 위치에 따라 네비게이션 표시/숨김
  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY >= SHOW_THRESHOLD);
    };
    // 초기 체크
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // IntersectionObserver로 활성 섹션 추적
  useEffect(() => {
    const timer = setTimeout(() => {
      const visibleMap = new Map<string, boolean>();

      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (!el) continue;

        const observer = new IntersectionObserver(
          ([entry]) => {
            visibleMap.set(item.id, entry.isIntersecting);
            for (const navItem of NAV_ITEMS) {
              if (visibleMap.get(navItem.id)) {
                setActiveId(navItem.id);
                return;
              }
            }
          },
          { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
        );

        observer.observe(el);
        observersRef.current.push(observer);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      observersRef.current.forEach((o) => o.disconnect());
      observersRef.current = [];
    };
  }, []);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <nav
      className={`hidden 2xl:flex fixed top-1/2 -translate-y-1/2 z-40 flex-col gap-0.5 transition-all duration-500 ease-out ${
        visible
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-4 pointer-events-none"
      }`}
      style={{ left: "max(0.75rem, calc(50vw - 48rem))" }}
    >
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.06] px-2 py-2.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              className={`block w-full text-left text-[13px] font-medium px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? "text-white bg-white/[0.1]"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
