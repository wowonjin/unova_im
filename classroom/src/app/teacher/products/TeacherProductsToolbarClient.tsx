"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./TeacherProducts.module.scss";

type Range = "all" | "day" | "week" | "month";
type Sort = "revenue_desc" | "count_desc" | "updated_desc" | "title_asc";

export default function TeacherProductsToolbarClient({
  initialQ,
  initialRange,
  initialSort,
}: {
  initialQ: string;
  initialRange: Range;
  initialSort: Sort;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState(initialQ);
  const [range, setRange] = useState<Range>(initialRange);
  const [sort, setSort] = useState<Sort>(initialSort);

  // URL 변경(뒤로가기/다른 탭 이동 등) 시 상태 동기화
  useEffect(() => setQ(initialQ), [initialQ]);
  useEffect(() => setRange(initialRange), [initialRange]);
  useEffect(() => setSort(initialSort), [initialSort]);

  const baseParams = useMemo(() => {
    // 현재 URL의 다른 파라미터도 유지
    const p = new URLSearchParams(sp?.toString() ?? "");
    return p;
  }, [sp]);

  const navigate = (next: { q?: string; range?: Range; sort?: Sort }, mode: "push" | "replace") => {
    const p = new URLSearchParams(baseParams);

    const nextQ = next.q ?? q;
    const nextRange = next.range ?? range;
    const nextSort = next.sort ?? sort;

    if (nextQ && nextQ.trim()) p.set("q", nextQ.trim());
    else p.delete("q");

    if (nextRange) p.set("range", nextRange);
    else p.delete("range");

    if (nextSort) p.set("sort", nextSort);
    else p.delete("sort");

    const qs = p.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (mode === "replace") router.replace(url);
    else router.push(url);
  };

  // 검색어는 타이핑 시 자동 반영(디바운스)
  useEffect(() => {
    const t = window.setTimeout(() => {
      navigate({ q }, "replace");
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <div className={styles.seg} role="group" aria-label="기간 필터">
          <button
            type="button"
            onClick={() => {
              setRange("all");
              navigate({ range: "all" }, "push");
            }}
            className={`${styles.segBtn} ${range === "all" ? styles.segBtnActive : ""}`}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => {
              setRange("day");
              navigate({ range: "day" }, "push");
            }}
            className={`${styles.segBtn} ${range === "day" ? styles.segBtnActive : ""}`}
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => {
              setRange("week");
              navigate({ range: "week" }, "push");
            }}
            className={`${styles.segBtn} ${range === "week" ? styles.segBtnActive : ""}`}
          >
            이번주
          </button>
          <button
            type="button"
            onClick={() => {
              setRange("month");
              navigate({ range: "month" }, "push");
            }}
            className={`${styles.segBtn} ${range === "month" ? styles.segBtnActive : ""}`}
          >
            이번달
          </button>
        </div>
      </div>

      <div className={styles.toolbarRight}>
        <input
          className={styles.input}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="상품명 검색"
        />

        <select
          className={styles.select}
          value={sort}
          onChange={(e) => {
            const next = (e.target.value || "revenue_desc") as Sort;
            setSort(next);
            navigate({ sort: next }, "push");
          }}
          aria-label="정렬"
        >
          <option value="revenue_desc">매출 높은 순</option>
          <option value="count_desc">판매횟수 많은 순</option>
          <option value="updated_desc">최근 수정 순</option>
          <option value="title_asc">이름 오름차순</option>
        </select>
      </div>
    </div>
  );
}

