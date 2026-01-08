"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClassroomSearch } from "@/app/_components/ClassroomSearchContext";

type HeaderSearchBarProps = {
  variant?: "dark" | "light";
};

export default function HeaderSearchBar({ variant = "dark" }: HeaderSearchBarProps) {
  const router = useRouter();
  const { items } = useClassroomSearch();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLight = variant === "light";

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const flat = useMemo(() => {
    if (!normalizedQuery) return [];
    const src = Array.isArray(items) ? items : [];
    const courses = src
      .filter((it) => it.type === "course" && (it.title || "").toLowerCase().includes(normalizedQuery));
    const lessons = src
      .filter((it) => it.type === "lesson" && (it.title || "").toLowerCase().includes(normalizedQuery));
    const textbooks = src
      .filter((it) => it.type === "textbook" && (it.title || "").toLowerCase().includes(normalizedQuery));
    return [...courses, ...lessons, ...textbooks].slice(0, 8);
  }, [items, normalizedQuery]);

  const courseResults = useMemo(() => flat.filter((x) => x.type === "course"), [flat]);
  const lessonResults = useMemo(() => flat.filter((x) => x.type === "lesson"), [flat]);
  const textbookResults = useMemo(() => flat.filter((x) => x.type === "textbook"), [flat]);

  const showDropdown = focused && normalizedQuery.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = selectedIndex >= 0 ? flat[selectedIndex] : null;
      if (selected) {
        router.push(selected.href);
        setFocused(false);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-[540px]">
      {/* 유튜브 스타일 검색 입력 */}
      <div
        className={`flex items-center rounded-full border p-[2px] transition-all duration-200 ${
          focused
            ? "border-white/40 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
            : isLight
              ? "border-black/20 hover:border-black/30"
              : "border-white/20 hover:border-white/30"
        }`}
      >
        <div className="flex items-center flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="교재/강의 제목 검색"
            className={`flex-1 bg-transparent py-2 px-4 text-[15px] outline-none placeholder:text-opacity-50 ${
              isLight ? "text-black placeholder:text-black/40" : "text-white placeholder:text-white/40"
            }`}
          />
        </div>
        {/* 검색 아이콘 (우측) */}
        <button
          type="button"
          onClick={() => setFocused(true)}
          aria-label="검색"
          className={`flex items-center justify-center h-9 w-11 rounded-r-full transition-colors ${
            isLight ? "hover:bg-black/10" : "hover:bg-white/10"
          }`}
        >
          <span
            className={`material-symbols-outlined ${isLight ? "text-black/70" : "text-white/70"}`}
            style={{ fontSize: "22px" }}
          >
            search
          </span>
        </button>
      </div>

      {/* 검색 결과 드롭다운 (현재 화면의 교재/강의 목록에서만) */}
      {showDropdown ? (
        <div
          className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-2xl overflow-hidden z-[1400] ${
            isLight ? "bg-white border-black/10" : "bg-[#212121] border-white/10"
          }`}
        >
          {flat.length > 0 ? (
            <div className="max-h-[360px] overflow-y-auto">
              {courseResults.length + lessonResults.length > 0 ? (
                <div className={`${isLight ? "text-black/60 bg-black/[0.02]" : "text-white/60 bg-white/[0.02]"} px-4 py-2 text-xs font-semibold`}>
                  강의
                </div>
              ) : null}
              {courseResults.map((it, idx) => {
                const flatIdx = idx;
                const active = flatIdx === selectedIndex;
                return (
                  <button
                    key={`${it.type}:${it.id}`}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                    onClick={() => {
                      router.push(it.href);
                      setFocused(false);
                      setQuery("");
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      active
                        ? isLight
                          ? "bg-black/[0.06]"
                          : "bg-white/[0.08]"
                        : isLight
                          ? "hover:bg-black/[0.04]"
                          : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${isLight ? "text-black/40" : "text-white/40"}`}
                      style={{ fontSize: "18px" }}
                      aria-hidden="true"
                    >
                      school
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`${isLight ? "text-black/90" : "text-white/90"} text-sm font-medium truncate`}>
                        {it.title}
                      </p>
                      {it.subtitle ? (
                        <p className={`${isLight ? "text-black/50" : "text-white/50"} text-xs truncate`}>{it.subtitle}</p>
                      ) : null}
                    </div>
                    <span className={`${isLight ? "text-black/30" : "text-white/30"} text-xs`}>이동</span>
                  </button>
                );
              })}
              {lessonResults.map((it, idx) => {
                const flatIdx = courseResults.length + idx;
                const active = flatIdx === selectedIndex;
                return (
                  <button
                    key={`${it.type}:${it.id}`}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                    onClick={() => {
                      router.push(it.href);
                      setFocused(false);
                      setQuery("");
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      active
                        ? isLight
                          ? "bg-black/[0.06]"
                          : "bg-white/[0.08]"
                        : isLight
                          ? "hover:bg-black/[0.04]"
                          : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${isLight ? "text-black/40" : "text-white/40"}`}
                      style={{ fontSize: "18px" }}
                      aria-hidden="true"
                    >
                      play_circle
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`${isLight ? "text-black/90" : "text-white/90"} text-sm font-medium truncate`}>
                        {it.title}
                      </p>
                      {it.subtitle ? (
                        <p className={`${isLight ? "text-black/50" : "text-white/50"} text-xs truncate`}>{it.subtitle}</p>
                      ) : null}
                    </div>
                    <span className={`${isLight ? "text-black/30" : "text-white/30"} text-xs`}>이동</span>
                  </button>
                );
              })}

              {textbookResults.length > 0 ? (
                <div className={`${isLight ? "text-black/60 bg-black/[0.02]" : "text-white/60 bg-white/[0.02]"} px-4 py-2 text-xs font-semibold`}>
                  교재
                </div>
              ) : null}
              {textbookResults.map((it, idx) => {
                const flatIdx = courseResults.length + lessonResults.length + idx;
                const active = flatIdx === selectedIndex;
                return (
                  <button
                    key={`${it.type}:${it.id}`}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                    onClick={() => {
                      router.push(it.href);
                      setFocused(false);
                      setQuery("");
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      active
                        ? isLight
                          ? "bg-black/[0.06]"
                          : "bg-white/[0.08]"
                        : isLight
                          ? "hover:bg-black/[0.04]"
                          : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${isLight ? "text-black/40" : "text-white/40"}`}
                      style={{ fontSize: "18px" }}
                      aria-hidden="true"
                    >
                      menu_book
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`${isLight ? "text-black/90" : "text-white/90"} text-sm font-medium truncate`}>
                        {it.title}
                      </p>
                      {it.subtitle ? (
                        <p className={`${isLight ? "text-black/50" : "text-white/50"} text-xs truncate`}>{it.subtitle}</p>
                      ) : null}
                    </div>
                    <span className={`${isLight ? "text-black/30" : "text-white/30"} text-xs`}>이동</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`px-4 py-6 text-center text-sm ${isLight ? "text-black/50" : "text-white/50"}`}>
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
