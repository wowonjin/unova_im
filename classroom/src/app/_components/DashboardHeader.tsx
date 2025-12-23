"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

type SortKey = "recent" | "teacher" | "subject" | "progress" | "subjectWatch";
type SortDir = "asc" | "desc";

function getSortKey(v: string | null): SortKey {
  if (v === "teacher" || v === "subject" || v === "progress" || v === "subjectWatch") return v;
  return "recent";
}

function getSortDir(v: string | null): SortDir {
  return v === "asc" ? "asc" : "desc";
}

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "recent", label: "최근 수강순", icon: "schedule" },
  { key: "progress", label: "진도율순", icon: "trending_up" },
  { key: "teacher", label: "선생님별", icon: "person" },
  { key: "subject", label: "과목별", icon: "menu_book" },
  { key: "subjectWatch", label: "과목 시청률순", icon: "bar_chart" },
];

export default function DashboardHeader({
  totalCount,
}: {
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sort = getSortKey(searchParams.get("sort"));
  const dir = getSortDir(searchParams.get("dir"));

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
    if (nextSort === "recent") sp.delete("sort");
    else sp.set("sort", nextSort);
    sp.set("dir", nextDir);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const currentOption = SORT_OPTIONS.find((o) => o.key === sort) ?? SORT_OPTIONS[0];

  return (
    <div className="mb-6">
      {/* 헤더 카드 */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.04] to-transparent p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* 좌측: 제목 및 개수 */}
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08]">
              <span className="material-symbols-outlined text-[22px] text-white/70">school</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">수강중인 강좌</h1>
              <p className="mt-0.5 text-sm text-white/50">
                총 <span className="font-medium text-white/70">{totalCount}개</span>의 강좌를 수강하고 있습니다
              </p>
            </div>
          </div>

          {/* 우측: 정렬 */}
          <div className="flex items-center gap-2">
            {/* 정렬 드롭다운 */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white/70 transition-all hover:bg-white/[0.08] focus:outline-none"
                aria-label="정렬 기준"
              >
                <span className="material-symbols-outlined text-[18px] text-white/50">
                  {currentOption.icon}
                </span>
                <span className="hidden font-medium sm:inline">{currentOption.label}</span>
                <span className="material-symbols-outlined text-[18px] text-white/40 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  expand_more
                </span>
              </button>

              {/* 드롭다운 메뉴 */}
              {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1c] py-1.5 shadow-2xl">
                  <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-white/30">
                    정렬 기준
                  </div>
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setParams({ sort: option.key });
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${
                        sort === option.key ? "bg-white/[0.08] text-white" : "text-white/60"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${sort === option.key ? "text-white/80" : "text-white/40"}`}>
                        {option.icon}
                      </span>
                      <span className="flex-1">{option.label}</span>
                      {sort === option.key && (
                        <span className="material-symbols-outlined text-[18px] text-white/60">check</span>
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/50 transition-all hover:bg-white/[0.08] hover:text-white/70 focus:outline-none"
              aria-label={dir === "asc" ? "오름차순" : "내림차순"}
              title={dir === "asc" ? "오름차순" : "내림차순"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {dir === "asc" ? "arrow_upward" : "arrow_downward"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
