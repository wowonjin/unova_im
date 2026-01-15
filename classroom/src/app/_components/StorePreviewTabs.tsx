"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type StorePreviewProduct = {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  price: number;
  originalPrice: number | null;
  tags: string[];
  textbookType: string | null;
  type: "course" | "textbook";
  thumbnailUrl: string | null;
  // course 레거시(파일 저장) 썸네일 지원: thumbnailUrl이 비어도 storedPath가 있으면 API로 서빙 가능
  thumbnailStoredPath?: string | null;
  thumbnailUpdatedAtISO?: string | null;
  rating: number | null;
  reviewCount: number | null;
};

const types = ["교재", "강의"] as const;
type TypeLabel = (typeof types)[number];
type Variant = "tabs" | "sections";
type SectionsMode = "home" | "simple";

function getThumbnailSrc(product: StorePreviewProduct): string | null {
  if (!product.thumbnailUrl && !(product.type === "course" && product.thumbnailStoredPath)) return null;

  if (product.type === "course") {
    return `/api/courses/${product.id}/thumbnail${
      product.thumbnailUpdatedAtISO ? `?v=${encodeURIComponent(product.thumbnailUpdatedAtISO)}` : ""
    }`;
  }

  return `/api/textbooks/${product.id}/thumbnail${
    product.thumbnailUpdatedAtISO ? `?v=${encodeURIComponent(product.thumbnailUpdatedAtISO)}` : ""
  }`;
}

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function getDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

function ProductGrid({
  products,
  emptyLabel,
}: {
  products: StorePreviewProduct[];
  emptyLabel: string;
}) {
  if (products.length <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="material-symbols-outlined text-white/20" style={{ fontSize: "64px" }} aria-hidden="true">
          search_off
        </span>
        <p className="mt-4 text-[18px] font-medium text-white/60">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10">
      {products.map((product) => (
        <Link key={product.id} href={`/store/${product.id}`} className="group">
          <div
            className={`relative aspect-video overflow-hidden transition-all rounded-xl ${
              product.type === "textbook"
                ? "bg-gradient-to-br from-white/[0.06] to-white/[0.02]"
                : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
            }`}
          >
            {/* 교재 종류 배지 (교재만) */}
            {product.type === "textbook" && product.textbookType ? (
              <div className="absolute left-2 top-2 z-10">
                <span
                  className={`rounded-md font-semibold text-white backdrop-blur ${
                    String(product.textbookType).trim().toUpperCase() === "PDF"
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 px-1.5 py-0.5 text-[9px] sm:px-2 sm:py-0.5 sm:text-[10px]"
                      : "bg-black/70 px-2 py-0.5 text-[10px]"
                  }`}
                >
                  {product.textbookType}
                </span>
              </div>
            ) : null}

            {(product.thumbnailUrl || (product.type === "course" && product.thumbnailStoredPath)) ? (
              // data URL/CSP 이슈를 피하기 위해 내부 썸네일 API로 통일
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  product.type === "course"
                    ? `/api/courses/${product.id}/thumbnail${
                        product.thumbnailUpdatedAtISO ? `?v=${encodeURIComponent(product.thumbnailUpdatedAtISO)}` : ""
                      }`
                    : `/api/textbooks/${product.id}/thumbnail${
                        product.thumbnailUpdatedAtISO ? `?v=${encodeURIComponent(product.thumbnailUpdatedAtISO)}` : ""
                      }`
                }
                alt={product.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    product.type === "course"
                      ? "bg-gradient-to-br from-blue-500/30 to-purple-500/30"
                      : "bg-gradient-to-br from-amber-500/30 to-orange-500/30"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-white/80"
                    style={{ fontSize: "28px" }}
                    aria-hidden="true"
                  >
                    {product.type === "course" ? "play_circle" : "auto_stories"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 px-0.5">
            <h3 className="text-[14px] font-medium text-white leading-snug line-clamp-2 group-hover:text-white/90">
              {product.title}
            </h3>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[13px] font-semibold text-white">{formatPrice(product.price)}</span>
              {product.originalPrice ? (
                <>
                  <span className="text-[11px] text-white/30 line-through">{formatPrice(product.originalPrice)}</span>
                  <span className="text-[11px] font-semibold text-rose-400">
                    {getDiscount(product.originalPrice, product.price)}%
                  </span>
                </>
              ) : null}
            </div>

            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white">
              <span className="flex items-center gap-0.5">
                <span className="text-yellow-400">⭐</span>
                <span>{(product.rating ?? 0).toFixed(1)}</span>
                <span>({product.reviewCount ?? 0})</span>
              </span>
              {product.teacher ? (
                <>
                  <span className="text-white/70">·</span>
                  <span>{product.teacher}T</span>
                </>
              ) : null}
            </div>

            {product.tags.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {product.tags
                  .filter((t) => t.trim().toUpperCase() !== "ORIGINAL")
                  .slice(0, 6)
                  .map((t, idx) => (
                    <span
                      key={`${product.id}-tag-${t}`}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        idx === 0
                          ? "bg-white text-black"
                          : idx === 1
                            ? "bg-[#6376EC] text-white"
                            : "bg-white/[0.06] text-white/70"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
              </div>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

function ExpandableProductGrid({
  products,
  emptyLabel,
  collapsedRows = 2,
}: {
  products: StorePreviewProduct[];
  emptyLabel: string;
  collapsedRows?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [columns, setColumns] = useState<2 | 4>(2);
  const preloadedSrc = useRef<Set<string>>(new Set());
  const [isGridHovered, setIsGridHovered] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const loopRafRef = useRef<number | null>(null);
  const loopOffsetRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const singleTrackRef = useRef<HTMLDivElement | null>(null);

  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);

  // Tailwind 기준: 기본 2열, lg(1024px~) 4열
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setColumns(mq.matches ? 4 : 2);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const maxVisible = columns * collapsedRows;
  const hasMore = products.length > maxVisible;

  const preloadUpcomingThumbnails = (count: number) => {
    // 현재 숨겨진 구간(더보기로 나타날 카드들)에서 일부 썸네일을 미리 로드해
    // 더보기 클릭 직후에도 이미지가 바로 보이도록 합니다.
    const upcoming = products.slice(maxVisible, maxVisible + Math.max(0, count));
    for (const p of upcoming) {
      const src = getThumbnailSrc(p);
      if (!src) continue;
      if (preloadedSrc.current.has(src)) continue;
      preloadedSrc.current.add(src);
      const img = new Image();
      img.src = src;
    }
  };

  const visibleProducts = useMemo(() => {
    if (expanded || !hasMore) return products;
    return products.slice(0, maxVisible);
  }, [expanded, hasMore, maxVisible, products]);

  // 필터 변경 등으로 상품 수가 줄면 자동으로 접기 상태 정리
  useEffect(() => {
    if (!hasMore && expanded) setExpanded(false);
  }, [expanded, hasMore]);

  // "더보기"가 보이는 시점에 다음 1~2줄 정도는 미리 프리로드
  useEffect(() => {
    if (expanded || !hasMore) return;
    preloadUpcomingThumbnails(columns * 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, expanded, hasMore, maxVisible, products]);

  const cancelLoop = () => {
    if (loopRafRef.current != null) {
      window.cancelAnimationFrame(loopRafRef.current);
      loopRafRef.current = null;
    }
    lastTsRef.current = null;
  };

  // 접힌 상태(더보기 있음)에서 고정된 상품 영역 안에서만 무한 루프 "흘러가기" 효과
  useEffect(() => {
    cancelLoop();

    // 상태/환경 조건
    if (expanded || !hasMore) return;
    if (isGridHovered) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // 높이/트랙 준비될 때까지 대기
    if (!collapsedHeight || collapsedHeight <= 0) return;

    const viewportEl = viewportRef.current;
    const trackOneEl = singleTrackRef.current;
    if (!viewportEl || !trackOneEl) return;

    const trackHeight = trackOneEl.offsetHeight;
    if (!trackHeight || trackHeight <= 0) return;

    const speedPxPerSec = 14; // 아주 천천히
    // NOTE: 중단/재시작 시에도 연속 느낌을 위해 offset은 유지
    lastTsRef.current = null;
    // React 리렌더로 CSS 변수가 초기화되지 않도록, 현재 offset을 다시 주입
    viewportEl.style.setProperty("--unova-loop-y", `${loopOffsetRef.current}px`);

    const step = (ts: number) => {
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      const dt = last == null ? 0 : Math.min(64, ts - last); // ms
      const delta = (speedPxPerSec * dt) / 1000;
      loopOffsetRef.current += delta;

      // 한 바퀴(첫 트랙 높이)만큼 이동하면 자연스럽게 되감기
      if (loopOffsetRef.current >= trackHeight) loopOffsetRef.current -= trackHeight;

      // translateY로만 움직여서 페이지 스크롤은 고정
      viewportEl.style.setProperty("--unova-loop-y", `${loopOffsetRef.current}px`);

      loopRafRef.current = window.requestAnimationFrame(step);
    };

    loopRafRef.current = window.requestAnimationFrame(step);

    return () => cancelLoop();
  }, [collapsedHeight, expanded, hasMore, isGridHovered]);

  // 접힌 상태에서 보여줄 고정 높이(2줄) 측정
  useEffect(() => {
    if (expanded || !hasMore) {
      setCollapsedHeight(null);
      return;
    }
    const el = measureRef.current;
    if (!el) return;

    const update = () => setCollapsedHeight(el.offsetHeight || null);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [columns, expanded, hasMore, maxVisible, products]);

  if (products.length <= 0) {
    return <ProductGrid products={products} emptyLabel={emptyLabel} />;
  }

  const measureProducts = products.slice(0, maxVisible);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setIsGridHovered(true);
        cancelLoop();
      }}
      onMouseLeave={() => setIsGridHovered(false)}
    >
      {/* 높이 측정용(레이아웃 영향 X) */}
      {!expanded && hasMore ? (
        <div className="pointer-events-none absolute -z-10 opacity-0">
          <div ref={measureRef}>
            <ProductGrid products={measureProducts} emptyLabel={emptyLabel} />
          </div>
        </div>
      ) : null}

      {/* 접힌 상태: 화면은 고정, 상품만 루프 */}
      {!expanded && hasMore && collapsedHeight ? (
        <div
          ref={viewportRef}
          className="relative overflow-hidden"
          style={{ height: collapsedHeight }}
        >
          <div
            className="will-change-transform"
            style={{
              transform: "translate3d(0, calc(var(--unova-loop-y) * -1), 0)",
            }}
          >
            <div ref={singleTrackRef}>
              <ProductGrid products={products} emptyLabel={emptyLabel} />
            </div>
            {/* 두 번째 트랙(복제)로 자연스러운 무한 루프 */}
            <ProductGrid products={products} emptyLabel={emptyLabel} />
          </div>
        </div>
      ) : (
        <ProductGrid products={visibleProducts} emptyLabel={emptyLabel} />
      )}

      {!expanded && hasMore ? (
        <>
          {/* 아래 어두운 그라데이션 + ... 느낌 */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#161616] via-[#161616]/90 to-transparent"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              onPointerEnter={() => preloadUpcomingThumbnails(columns * 4)}
              onFocus={() => preloadUpcomingThumbnails(columns * 4)}
              className="group inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/90 backdrop-blur-md will-change-transform animate-[unovaFloat_2.8s_ease-in-out_infinite] motion-reduce:animate-none hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 md:px-4 md:py-2 md:text-[13px]"
              aria-label="상품 더보기"
            >
              <span className="material-symbols-outlined text-[18px] leading-none text-white/70 group-hover:text-white/90">
                expand_more
              </span>
              더보기
            </button>
          </div>
        </>
      ) : null}

      {expanded && hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="group inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white/80 hover:bg-white/[0.08] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 md:px-4 md:py-2 md:text-[13px]"
            aria-label="상품 접기"
          >
            <span className="material-symbols-outlined text-[18px] leading-none text-white/60 group-hover:text-white/80">
              expand_less
            </span>
            접기
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StorePreviewSectionsSimple({
  courses,
  textbooks,
}: {
  courses: StorePreviewProduct[];
  textbooks: StorePreviewProduct[];
}) {
  const [selectedCourseSubject, setSelectedCourseSubject] = useState<string>("전체");
  const [selectedTextbookSubject, setSelectedTextbookSubject] = useState<string>("전체");

  const courseSubjects = useMemo(() => {
    const subjectOrder = ["전체", "수학", "물리학I", "물리학II"];
    const subjectSet = new Set(courses.map((p) => p.subject).filter(Boolean));
    const ordered = subjectOrder.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !subjectOrder.includes(s));
    return [...ordered, ...other];
  }, [courses]);

  const textbookSubjects = useMemo(() => {
    const preferred = ["전체", "국어", "수학", "물리학I", "물리학II", "미적분학", "대학물리학"];
    const subjectSet = new Set(textbooks.map((p) => p.subject).filter(Boolean));
    const ordered = preferred.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !preferred.includes(s));
    return [...ordered, ...other];
  }, [textbooks]);

  const filteredCourses = useMemo(() => {
    if (selectedCourseSubject === "전체") return courses;
    return courses.filter((p) => p.subject === selectedCourseSubject);
  }, [courses, selectedCourseSubject]);

  const filteredTextbooks = useMemo(() => {
    if (selectedTextbookSubject === "전체") return textbooks;
    return textbooks.filter((p) => p.subject === selectedTextbookSubject);
  }, [textbooks, selectedTextbookSubject]);

  useEffect(() => {
    if (selectedCourseSubject === "전체") return;
    if (!courseSubjects.includes(selectedCourseSubject)) setSelectedCourseSubject("전체");
  }, [courseSubjects, selectedCourseSubject]);

  useEffect(() => {
    if (selectedTextbookSubject === "전체") return;
    if (!textbookSubjects.includes(selectedTextbookSubject)) setSelectedTextbookSubject("전체");
  }, [selectedTextbookSubject, textbookSubjects]);

  return (
    <section suppressHydrationWarning className="mx-auto max-w-6xl px-4 pt-4 md:pt-10">
      <div className="mt-6 md:mt-8">
        <h2 className="text-[16px] md:text-[26px] font-bold tracking-[-0.02em]">🚀 강의 구매하기</h2>
        {courseSubjects.length > 1 ? (
          <div className="mt-4">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide md:gap-2 md:flex-wrap md:overflow-visible">
              {courseSubjects.map((subject) => {
                const active = selectedCourseSubject === subject;
                return (
                  <button
                    key={`course-${subject}`}
                    type="button"
                    onClick={() => setSelectedCourseSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`shrink-0 whitespace-nowrap leading-none text-[11px] font-medium md:text-[13px] ${
                      active
                        ? "px-3 py-1.5 rounded-full bg-white text-black md:px-4 md:py-2"
                        : "px-3 py-1.5 rounded-full bg-white/0 text-white/55 hover:bg-white/[0.06] hover:text-white md:px-4 md:py-2"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-6">
          <ProductGrid products={filteredCourses} emptyLabel="등록된 강의 상품이 없습니다" />
        </div>
      </div>

      <div className="mt-14 md:mt-20">
        <h2 className="text-[16px] md:text-[26px] font-bold tracking-[-0.02em]">📖 교재 구매하기</h2>
        {textbookSubjects.length > 1 ? (
          <div className="mt-4">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide md:gap-2 md:flex-wrap md:overflow-visible">
              {textbookSubjects.map((subject) => {
                const active = selectedTextbookSubject === subject;
                return (
                  <button
                    key={`textbook-${subject}`}
                    type="button"
                    onClick={() => setSelectedTextbookSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`shrink-0 whitespace-nowrap leading-none text-[11px] font-medium md:text-[13px] ${
                      active
                        ? "px-3 py-1.5 rounded-full bg-white text-black md:px-4 md:py-2"
                        : "px-3 py-1.5 rounded-full bg-white/0 text-white/55 hover:bg-white/[0.06] hover:text-white md:px-4 md:py-2"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-6">
          <ExpandableProductGrid products={filteredTextbooks} emptyLabel="등록된 교재 상품이 없습니다" collapsedRows={3} />
        </div>
      </div>
    </section>
  );
}

function StorePreviewSections({
  courses,
  textbooks,
}: {
  courses: StorePreviewProduct[];
  textbooks: StorePreviewProduct[];
}) {
  const [selectedCourseSubject, setSelectedCourseSubject] = useState<string>("전체");
  const [selectedSuneungTextbookSubject, setSelectedSuneungTextbookSubject] = useState<string>("전체");
  const [selectedTransferTextbookSubject, setSelectedTransferTextbookSubject] = useState<string>("전체");

  const courseSubjects = useMemo(() => {
    const subjectOrder = ["전체", "수학", "물리학I", "물리학II"];
    const subjectSet = new Set(courses.map((p) => p.subject).filter(Boolean));
    const ordered = subjectOrder.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !subjectOrder.includes(s));
    return [...ordered, ...other];
  }, [courses]);

  const suneungTextbookSubjects = useMemo(() => {
    // 요청 순서 고정: 국어 → 수학 → 물리학I → 물리학II
    const preferred = ["전체", "국어", "수학", "영어", "물리학I", "물리학II"];
    const subjectSet = new Set(textbooks.map((p) => p.subject).filter(Boolean));
    return preferred.filter((s) => s === "전체" || subjectSet.has(s));
  }, [textbooks]);

  const transferTextbookSubjects = useMemo(() => {
    const preferred = ["전체", "미적분학", "대학물리학"];
    const subjectSet = new Set(textbooks.map((p) => p.subject).filter(Boolean));
    return preferred.filter((s) => s === "전체" || subjectSet.has(s));
  }, [textbooks]);

  const filteredCourses = useMemo(() => {
    if (selectedCourseSubject === "전체") return courses;
    return courses.filter((p) => p.subject === selectedCourseSubject);
  }, [courses, selectedCourseSubject]);

  const suneungTextbooks = useMemo(() => {
    const subjectAllow = new Set(["국어", "수학", "영어", "물리학I", "물리학II"]);
    return textbooks.filter((p) => subjectAllow.has(p.subject));
  }, [textbooks]);

  const transferTextbooks = useMemo(() => {
    const subjectAllow = new Set(["미적분학", "대학물리학"]);
    return textbooks.filter((p) => subjectAllow.has(p.subject));
  }, [textbooks]);

  const filteredSuneungTextbooks = useMemo(() => {
    if (selectedSuneungTextbookSubject === "전체") return suneungTextbooks;
    return suneungTextbooks.filter((p) => p.subject === selectedSuneungTextbookSubject);
  }, [selectedSuneungTextbookSubject, suneungTextbooks]);

  const filteredTransferTextbooks = useMemo(() => {
    if (selectedTransferTextbookSubject === "전체") return transferTextbooks;
    return transferTextbooks.filter((p) => p.subject === selectedTransferTextbookSubject);
  }, [selectedTransferTextbookSubject, transferTextbooks]);

  // 선택 과목이 사라진 경우(상품 구성 변경 등) 안전 리셋
  useEffect(() => {
    if (selectedCourseSubject === "전체") return;
    if (!courseSubjects.includes(selectedCourseSubject)) setSelectedCourseSubject("전체");
  }, [courseSubjects, selectedCourseSubject]);

  useEffect(() => {
    if (selectedSuneungTextbookSubject === "전체") return;
    if (!suneungTextbookSubjects.includes(selectedSuneungTextbookSubject)) setSelectedSuneungTextbookSubject("전체");
  }, [selectedSuneungTextbookSubject, suneungTextbookSubjects]);

  useEffect(() => {
    if (selectedTransferTextbookSubject === "전체") return;
    if (!transferTextbookSubjects.includes(selectedTransferTextbookSubject))
      setSelectedTransferTextbookSubject("전체");
  }, [selectedTransferTextbookSubject, transferTextbookSubjects]);

  return (
    <section suppressHydrationWarning className="mx-auto max-w-6xl px-4 pt-4 md:pt-10">
      <div className="mt-6 md:mt-8">
        <h2 className="text-[16px] md:text-[26px] font-bold tracking-[-0.02em]">🚀 강의 구매하기</h2>
        {courseSubjects.length > 1 ? (
          <div className="mt-4">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide md:gap-2 md:flex-wrap md:overflow-visible">
              {courseSubjects.map((subject) => {
                const active = selectedCourseSubject === subject;
                return (
                  <button
                    key={`course-${subject}`}
                    type="button"
                    onClick={() => setSelectedCourseSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`shrink-0 whitespace-nowrap leading-none text-[11px] font-medium md:text-[13px] ${
                      active
                        ? "px-3 py-1.5 rounded-full bg-white text-black md:px-4 md:py-2"
                        : "px-3 py-1.5 rounded-full bg-white/0 text-white/55 hover:bg-white/[0.06] hover:text-white md:px-4 md:py-2"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-6">
          <ProductGrid products={filteredCourses} emptyLabel="등록된 강의 상품이 없습니다" />
        </div>
      </div>

      <div className="mt-14 md:mt-20">
        <h2 className="text-[16px] md:text-[26px] font-bold tracking-[-0.02em]">📖 수능 교재 구매하기</h2>
        {suneungTextbookSubjects.length > 1 ? (
          <div className="mt-4">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide md:gap-2 md:flex-wrap md:overflow-visible">
              {suneungTextbookSubjects.map((subject) => {
                const active = selectedSuneungTextbookSubject === subject;
                return (
                  <button
                    key={`textbook-suneung-${subject}`}
                    type="button"
                    onClick={() => setSelectedSuneungTextbookSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`shrink-0 whitespace-nowrap leading-none text-[11px] font-medium md:text-[13px] ${
                      active
                        ? "px-3 py-1.5 rounded-full bg-white text-black md:px-4 md:py-2"
                        : "px-3 py-1.5 rounded-full bg-white/0 text-white/55 hover:bg-white/[0.06] hover:text-white md:px-4 md:py-2"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-6">
          <ExpandableProductGrid
            products={filteredSuneungTextbooks}
            emptyLabel="등록된 교재 상품이 없습니다"
            collapsedRows={3}
          />
        </div>

        <div className="mt-14 md:mt-16">
          <h3 className="text-[16px] md:text-[26px] font-bold tracking-[-0.02em]">📖 편입 교재 구매하기</h3>
          {transferTextbookSubjects.length > 1 ? (
            <div className="mt-4">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide md:gap-2 md:flex-wrap md:overflow-visible">
                {transferTextbookSubjects.map((subject) => {
                  const active = selectedTransferTextbookSubject === subject;
                  return (
                    <button
                      key={`textbook-transfer-${subject}`}
                      type="button"
                      onClick={() => setSelectedTransferTextbookSubject(subject)}
                      role="tab"
                      aria-selected={active}
                      className={`shrink-0 whitespace-nowrap leading-none text-[11px] font-medium md:text-[13px] ${
                        active
                          ? "px-3 py-1.5 rounded-full bg-white text-black md:px-4 md:py-2"
                          : "px-3 py-1.5 rounded-full bg-white/0 text-white/55 hover:bg-white/[0.06] hover:text-white md:px-4 md:py-2"
                      }`}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="mt-6">
            <ExpandableProductGrid
              products={filteredTransferTextbooks}
              emptyLabel="등록된 교재 상품이 없습니다"
              collapsedRows={3}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StorePreviewTabs({
  courses,
  textbooks,
  defaultType = "교재",
  variant = "tabs",
  sectionsMode = "home",
}: {
  courses: StorePreviewProduct[];
  textbooks: StorePreviewProduct[];
  defaultType?: TypeLabel;
  variant?: Variant;
  sectionsMode?: SectionsMode;
}) {
  if (variant === "sections") {
    return sectionsMode === "simple"
      ? <StorePreviewSectionsSimple courses={courses} textbooks={textbooks} />
      : <StorePreviewSections courses={courses} textbooks={textbooks} />;
  }

  const [selectedType, setSelectedType] = useState<TypeLabel>(defaultType);
  const [selectedSubject, setSelectedSubject] = useState<string>("전체");

  const currentType: "course" | "textbook" = selectedType === "강의" ? "course" : "textbook";
  const productsOfCurrentType = currentType === "course" ? courses : textbooks;

  const subjects = useMemo(() => {
    const subjectOrder = ["전체", "수학", "물리학I", "물리학II"];
    const subjectSet = new Set(productsOfCurrentType.map((p) => p.subject).filter(Boolean));
    const ordered = subjectOrder.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !subjectOrder.includes(s));
    return [...ordered, ...other];
  }, [productsOfCurrentType]);

  const filteredProducts = useMemo(() => {
    if (selectedSubject === "전체") return productsOfCurrentType;
    return productsOfCurrentType.filter((p) => p.subject === selectedSubject);
  }, [productsOfCurrentType, selectedSubject]);

  // 선택 타입/상품이 바뀌면서 현재 과목이 사라진 경우, 안전하게 "전체"로 리셋
  useEffect(() => {
    if (selectedSubject === "전체") return;
    if (!subjects.includes(selectedSubject)) setSelectedSubject("전체");
  }, [selectedSubject, subjects]);

  return (
    <section suppressHydrationWarning className="mx-auto max-w-6xl px-4 pt-4 md:pt-10">
      {/* 상단 탭(교재/강의 + 과목): 스크롤 시에도 사라지지 않도록 sticky 고정 */}
      <div className="sticky top-[70px] z-40 -mx-4 px-4 bg-[#161616]/85 backdrop-blur-xl">
        <div className="py-3 md:py-4">
          {/* 모바일: 세그먼트(교재/강의) + 가로 스크롤 과목 칩 */}
          <div className="md:hidden">
            {/* 타입 선택: 탭 메뉴(과목 탭과 동일한 스타일) */}
            <div>
              <div className="flex gap-6 border-b border-white/10 pb-2" role="tablist" aria-label="교재/강의 선택">
                {types.map((t) => {
                  const active = selectedType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedType(t);
                        setSelectedSubject("전체");
                      }}
                      role="tab"
                      aria-selected={active}
                      className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold ${
                        active ? "text-white" : "text-white/55"
                      }`}
                    >
                      {t}
                      {active ? (
                        <span
                          className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 과목 탭: 가로 스크롤 탭바(underline) */}
            {subjects.length > 1 ? (
              <div className="mt-4">
                <div className="flex gap-4 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide">
                  {subjects.map((subject) => {
                    const active = selectedSubject === subject;
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => setSelectedSubject(subject)}
                        role="tab"
                        aria-selected={active}
                        className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold ${
                          active ? "text-white" : "text-white/55"
                        }`}
                      >
                        {subject}
                        {active ? (
                          <span
                            className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* 데스크탑: 기존 버튼 레이아웃 유지 */}
          <div className="hidden md:flex items-center justify-between gap-3">
            {/* 과목 필터 */}
            {subjects.length > 1 ? (
              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                {subjects.map((subject) => {
                  const active = selectedSubject === subject;
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setSelectedSubject(subject)}
                      role="tab"
                      aria-selected={active}
                      className={`text-[13px] font-medium ${
                        active
                          ? "px-4 py-2 rounded-full bg-white text-black"
                          : "px-4 py-2 rounded-full bg-white/0 text-white/55 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {/* 타입(교재/강의) 탭 */}
            <div className="flex shrink-0 flex-wrap justify-end gap-4" role="tablist" aria-label="교재/강의 선택">
              {types.map((t) => {
                const active = selectedType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSelectedType(t);
                      setSelectedSubject("전체");
                    }}
                    role="tab"
                    aria-selected={active}
                    className={`text-[13px] font-medium ${
                      active
                        ? "px-4 py-2 rounded-full bg-white text-black"
                        : "px-4 py-2 rounded-full bg-white/0 text-white/55 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 상품 그리드 */}
      <div className="mt-6">
        <ProductGrid products={filteredProducts} emptyLabel="해당 조건의 상품이 없습니다" />
      </div>

      {/* 모바일 전체 보기 */}
      {/* (요청사항) 상단/하단 '전체 보기' CTA 제거 */}
    </section>
  );
}


