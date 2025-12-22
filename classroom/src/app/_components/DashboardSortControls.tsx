"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SortKey = "recent" | "teacher" | "subject" | "progress" | "subjectWatch";
type SortDir = "asc" | "desc";

function getSortKey(v: string | null): SortKey {
  if (v === "teacher" || v === "subject" || v === "progress" || v === "subjectWatch") return v;
  return "recent";
}

function getSortDir(v: string | null): SortDir {
  return v === "asc" ? "asc" : "desc";
}

export default function DashboardSortControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = getSortKey(searchParams.get("sort"));
  const dir = getSortDir(searchParams.get("dir"));

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

  return (
    <div className="flex items-center gap-2">
      <select
        value={sort}
        onChange={(e) => setParams({ sort: getSortKey(e.target.value) })}
        className="h-10 rounded-xl border border-white/10 bg-[#1d1d1f] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/10"
        aria-label="정렬 기준"
      >
        <option value="recent">최근 수강</option>
        <option value="teacher">선생님</option>
        <option value="subject">과목</option>
        <option value="progress">학습 진도율</option>
        <option value="subjectWatch">과목별 시청율</option>
      </select>

      <button
        type="button"
        onClick={() => setParams({ dir: dir === "asc" ? "desc" : "asc" })}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/10"
        aria-label={dir === "asc" ? "오름차순" : "내림차순"}
        title={dir === "asc" ? "오름차순" : "내림차순"}
      >
        {dir === "asc" ? "오름차순" : "내림차순"}
      </button>
    </div>
  );
}


