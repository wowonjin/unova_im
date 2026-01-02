"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

type SortKey = "teacher" | "subject" | "progress" | "subjectWatch";
type SortDir = "asc" | "desc";

function getSortKey(v: string | null): SortKey {
  if (v === "recent") return "progress";
  if (v === "teacher" || v === "subject" || v === "progress" || v === "subjectWatch") return v;
  return "progress";
}

function getSortDir(v: string | null): SortDir {
  return v === "asc" ? "asc" : "desc";
}

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "progress", label: "진도율순", icon: "📊" },
  { key: "teacher", label: "선생님별", icon: "👤" },
  { key: "subject", label: "과목별", icon: "📚" },
  { key: "subjectWatch", label: "과목 시청률순", icon: "📈" },
];

export default function DashboardSortControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = getSortKey(searchParams.get("sort"));
  const dir = getSortDir(searchParams.get("dir"));

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setParams = (next: { sort?: SortKey; dir?: SortDir }) => {
    const sp = new URLSearchParams(searchParams.toString());
    const nextSort = next.sort ?? sort;
    const nextDir = next.dir ?? dir;
    if (nextSort === "progress") sp.delete("sort");
    else sp.set("sort", nextSort);
    sp.set("dir", nextDir);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const currentOption = SORT_OPTIONS.find((o) => o.key === sort) ?? SORT_OPTIONS[0];

  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
      {/* 정렬 드롭다운 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-[#1d1d1f] px-3 text-sm text-white/80 transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/10"
          aria-label="정렬 기준"
        >
          <span className="text-base">{currentOption.icon}</span>
          <span>{currentOption.label}</span>
          <svg
            className={`h-4 w-4 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 드롭다운 메뉴 */}
        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#1d1d1f] py-1 shadow-xl">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setParams({ sort: option.key });
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                  sort === option.key ? "bg-white/10 text-white" : "text-white/70"
                }`}
              >
                <span className="text-base">{option.icon}</span>
                <span>{option.label}</span>
                {sort === option.key && (
                  <svg className="ml-auto h-4 w-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 정렬 방향 토글 */}
      <button
        type="button"
        onClick={() => setParams({ dir: dir === "asc" ? "desc" : "asc" })}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#1d1d1f] text-white/60 transition-colors hover:bg-white/5 hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-white/10"
        aria-label={dir === "asc" ? "오름차순 (클릭하여 내림차순으로 변경)" : "내림차순 (클릭하여 오름차순으로 변경)"}
        title={dir === "asc" ? "오름차순" : "내림차순"}
      >
        {dir === "asc" ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          </svg>
        )}
      </button>
    </div>
  );
}
