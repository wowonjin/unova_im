"use client";

import { useEffect, useState } from "react";

const LS_KEY = "unova_favorite_courses_v1";
const FAVORITES_CHANGED_EVENT = "unova-favorites-changed";

function readFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeFavorites(next: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify([...next]));
  } catch {
    // ignore
  }
}

export default function FavoriteStarButton({ courseId }: { courseId: string }) {
  const [active, setActive] = useState<boolean>(false);

  // 마운트 후 클라이언트에서만 localStorage 값 읽기 (hydration 불일치 방지)
  useEffect(() => {
    setActive(readFavorites().has(courseId));
  }, [courseId]);

  return (
    <button
      type="button"
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기"}
      aria-pressed={active}
      onClick={(e) => {
        // 카드 전체 클릭 이동과 충돌 방지
        e.preventDefault();
        e.stopPropagation();
        const fav = readFavorites();
        if (fav.has(courseId)) fav.delete(courseId);
        else fav.add(courseId);
        writeFavorites(fav);
        setActive(fav.has(courseId));
        try {
          window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
        } catch {
          // ignore
        }
      }}
      className="group rounded-xl p-2"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="block">
        <path
          d="M12 17.3l-5.5 3 1-6.1L3 9.7l6.2-.9L12 3l2.8 5.8 6.2.9-4.5 4.5 1 6.1-5.7-3z"
          className={
            active
              ? "fill-orange-500 stroke-orange-500"
              : "fill-transparent stroke-white/80 group-hover:fill-orange-500 group-hover:stroke-orange-500"
          }
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}


