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
  // 서버에서 DB 값 기준으로 계산된 무료 여부(가격 null을 0으로 표시하는 경우가 있어 price===0만으로 판단하면 안 됨)
  isFree?: boolean;
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
  eagerCount = 0,
}: {
  products: StorePreviewProduct[];
  emptyLabel: string;
  eagerCount?: number;
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
      {products.map((product, idx) => {
        const eager = eagerCount > 0 && idx < eagerCount;
        return (
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
                loading={eager ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={eager ? "high" : "auto"}
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
              <span className="text-[13px] font-semibold text-white">
                {product.type === "textbook" && product.isFree ? "무료" : formatPrice(product.price)}
              </span>
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
        );
      })}
    </div>
  );
}

function ExpandableProductGrid({
  products,
  emptyLabel,
  collapsedRows = 2,
  eagerCount = 0,
}: {
  products: StorePreviewProduct[];
  emptyLabel: string;
  collapsedRows?: number;
  eagerCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [columns, setColumns] = useState<2 | 4>(2);
  const preloadedSrc = useRef<Set<string>>(new Set());

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

  if (products.length <= 0) {
    return <ProductGrid products={products} emptyLabel={emptyLabel} eagerCount={eagerCount} />;
  }

  return (
    <div className="relative">
      {/* 자동 흘러가기(무한 루프) 효과 제거: 접힌 상태에서는 단순히 일부만 보여줌 */}
      <ProductGrid products={visibleProducts} emptyLabel={emptyLabel} eagerCount={eagerCount} />

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
  const [selectedFreeTextbookSubject, setSelectedFreeTextbookSubject] = useState<string>("전체");
  const [selectedTextbookSubject, setSelectedTextbookSubject] = useState<string>("전체");

  const courseSubjects = useMemo(() => {
    const subjectOrder = ["전체", "수학", "물리학I", "물리학II"];
    const subjectSet = new Set(courses.map((p) => p.subject).filter(Boolean));
    const ordered = subjectOrder.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !subjectOrder.includes(s));
    return [...ordered, ...other];
  }, [courses]);

  const freeTextbooks = useMemo(() => {
    return textbooks.filter((p) => Boolean(p.isFree));
  }, [textbooks]);

  const freeTextbookSubjects = useMemo(() => {
    const preferred = ["전체", "국어", "수학", "영어", "물리학I", "물리학II", "미적분학", "대학물리학"];
    const subjectSet = new Set(freeTextbooks.map((p) => p.subject).filter(Boolean));
    const ordered = preferred.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !preferred.includes(s));
    return [...ordered, ...other];
  }, [freeTextbooks]);

  const textbookSubjects = useMemo(() => {
    const preferred = ["전체", "국어", "수학", "물리학I", "물리학II", "미적분학", "대학물리학"];
    const subjectSet = new Set(textbooks.filter((p) => !p.isFree).map((p) => p.subject).filter(Boolean));
    const ordered = preferred.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !preferred.includes(s));
    return [...ordered, ...other];
  }, [textbooks]);

  const filteredCourses = useMemo(() => {
    if (selectedCourseSubject === "전체") return courses;
    return courses.filter((p) => p.subject === selectedCourseSubject);
  }, [courses, selectedCourseSubject]);

  const filteredFreeTextbooks = useMemo(() => {
    if (selectedFreeTextbookSubject === "전체") return freeTextbooks;
    return freeTextbooks.filter((p) => p.subject === selectedFreeTextbookSubject);
  }, [freeTextbooks, selectedFreeTextbookSubject]);

  const filteredTextbooks = useMemo(() => {
    const paid = textbooks.filter((p) => !p.isFree);
    if (selectedTextbookSubject === "전체") return paid;
    return paid.filter((p) => p.subject === selectedTextbookSubject);
  }, [textbooks, selectedTextbookSubject]);

  useEffect(() => {
    if (selectedCourseSubject === "전체") return;
    if (!courseSubjects.includes(selectedCourseSubject)) setSelectedCourseSubject("전체");
  }, [courseSubjects, selectedCourseSubject]);

  useEffect(() => {
    if (selectedFreeTextbookSubject === "전체") return;
    if (!freeTextbookSubjects.includes(selectedFreeTextbookSubject)) setSelectedFreeTextbookSubject("전체");
  }, [freeTextbookSubjects, selectedFreeTextbookSubject]);

  useEffect(() => {
    if (selectedTextbookSubject === "전체") return;
    if (!textbookSubjects.includes(selectedTextbookSubject)) setSelectedTextbookSubject("전체");
  }, [selectedTextbookSubject, textbookSubjects]);

  return (
    <section suppressHydrationWarning className="mx-auto max-w-6xl px-4 pt-4 md:pt-10">
      <div className="mt-4 md:mt-6">
        <h2 className="inline-flex items-center text-[20px] md:text-[26px] font-bold tracking-[-0.02em] leading-none">
          <span aria-hidden="true" className="-translate-y-[0.5px]">|&nbsp;</span>
          <span>강의 구매하기</span>
        </h2>
        {courseSubjects.length > 1 ? (
          <div className="mt-2 md:mt-8">
            {/* 모바일: 탭 메뉴 스타일 */}
            <div className="flex gap-4 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide md:hidden">
              {courseSubjects.map((subject) => {
                const active = selectedCourseSubject === subject;
                return (
                  <button
                    key={`course-simple-${subject}`}
                    type="button"
                    onClick={() => setSelectedCourseSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {subject}
                    {active ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {/* 데스크톱: 탭 메뉴 스타일 */}
            <div className="hidden md:flex gap-6 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide">
              {courseSubjects.map((subject) => {
                const active = selectedCourseSubject === subject;
                return (
                  <button
                    key={`course-simple-${subject}-desktop`}
                    type="button"
                    onClick={() => setSelectedCourseSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`relative shrink-0 px-1 py-2 text-[15px] font-semibold ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {subject}
                    {active ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-6">
          <ProductGrid products={filteredCourses} emptyLabel="등록된 강의 상품이 없습니다" eagerCount={8} />
        </div>
      </div>

      <div className="mt-14 md:mt-20">
        {/* 무료 자료 다운로드 (선생님 페이지 simple 모드 지원) */}
        {freeTextbooks.length > 0 ? (
          <div className="mb-14 md:mb-16">
            <h2 className="inline-flex items-center text-[20px] md:text-[26px] font-bold tracking-[-0.02em] leading-none">
              <span aria-hidden="true" className="-translate-y-[0.5px]">|&nbsp;</span>
              <span>무료 자료 다운로드</span>
            </h2>
            {freeTextbookSubjects.length > 1 ? (
              <div className="mt-2 md:mt-8">
                {/* 모바일: 탭 메뉴 스타일 */}
                <div className="flex gap-4 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide md:hidden">
                  {freeTextbookSubjects.map((subject) => {
                    const active = selectedFreeTextbookSubject === subject;
                    return (
                      <button
                        key={`textbook-free-simple-${subject}`}
                        type="button"
                        onClick={() => setSelectedFreeTextbookSubject(subject)}
                        role="tab"
                        aria-selected={active}
                        className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold ${
                          active ? "text-white" : "text-white/55"
                        }`}
                      >
                        {subject}
                        {active ? (
                          <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {/* 데스크톱: 탭 메뉴 스타일 */}
                <div className="hidden md:flex gap-6 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide">
                  {freeTextbookSubjects.map((subject) => {
                    const active = selectedFreeTextbookSubject === subject;
                    return (
                      <button
                        key={`textbook-free-simple-${subject}-desktop`}
                        type="button"
                        onClick={() => setSelectedFreeTextbookSubject(subject)}
                        role="tab"
                        aria-selected={active}
                        className={`relative shrink-0 px-1 py-2 text-[15px] font-semibold ${
                          active ? "text-white" : "text-white/55"
                        }`}
                      >
                        {subject}
                        {active ? (
                          <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="mt-6">
              <ExpandableProductGrid
                products={filteredFreeTextbooks}
                emptyLabel="등록된 무료 자료가 없습니다"
                collapsedRows={3}
                eagerCount={8}
              />
            </div>
          </div>
        ) : null}

        <h2 className="inline-flex items-center text-[20px] md:text-[26px] font-bold tracking-[-0.02em] leading-none">
          <span aria-hidden="true" className="-translate-y-[0.5px]">|&nbsp;</span>
          <span>교재 구매하기</span>
        </h2>
        {textbookSubjects.length > 1 ? (
          <div className="mt-2 md:mt-8">
            {/* 모바일: 탭 메뉴 스타일 */}
            <div className="flex gap-4 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide md:hidden">
              {textbookSubjects.map((subject) => {
                const active = selectedTextbookSubject === subject;
                return (
                  <button
                    key={`textbook-${subject}`}
                    type="button"
                    onClick={() => setSelectedTextbookSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {subject}
                    {active ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {/* 데스크톱: 탭 메뉴 스타일 */}
            <div className="hidden md:flex gap-6 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide">
              {textbookSubjects.map((subject) => {
                const active = selectedTextbookSubject === subject;
                return (
                  <button
                    key={`textbook-${subject}-desktop`}
                    type="button"
                    onClick={() => setSelectedTextbookSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`relative shrink-0 px-1 py-2 text-[15px] font-semibold ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {subject}
                    {active ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-6">
          <ExpandableProductGrid
            products={filteredTextbooks}
            emptyLabel="등록된 교재 상품이 없습니다"
            collapsedRows={3}
            eagerCount={8}
          />
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
  const [selectedFreeTextbookSubject, setSelectedFreeTextbookSubject] = useState<string>("전체");
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
    const subjectAllow = new Set(["국어", "수학", "영어", "물리학I", "물리학II"]);
    const subjectSet = new Set(
      textbooks
        .filter((p) => subjectAllow.has(p.subject) && !p.isFree)
        .map((p) => p.subject)
        .filter(Boolean)
    );
    return preferred.filter((s) => s === "전체" || subjectSet.has(s));
  }, [textbooks]);

  const freeTextbooks = useMemo(() => {
    return textbooks.filter((p) => Boolean(p.isFree));
  }, [textbooks]);

  const freeTextbookSubjects = useMemo(() => {
    const preferred = ["전체", "국어", "수학", "영어", "물리학I", "물리학II", "미적분학", "대학물리학"];
    const subjectSet = new Set(freeTextbooks.map((p) => p.subject).filter(Boolean));
    const ordered = preferred.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !preferred.includes(s));
    return [...ordered, ...other];
  }, [freeTextbooks]);

  const transferTextbookSubjects = useMemo(() => {
    const preferred = ["전체", "미적분학", "대학물리학"];
    const subjectAllow = new Set(["미적분학", "대학물리학"]);
    const subjectSet = new Set(
      textbooks
        .filter((p) => subjectAllow.has(p.subject) && !p.isFree)
        .map((p) => p.subject)
        .filter(Boolean)
    );
    return preferred.filter((s) => s === "전체" || subjectSet.has(s));
  }, [textbooks]);

  const filteredCourses = useMemo(() => {
    if (selectedCourseSubject === "전체") return courses;
    return courses.filter((p) => p.subject === selectedCourseSubject);
  }, [courses, selectedCourseSubject]);

  const filteredFreeTextbooks = useMemo(() => {
    if (selectedFreeTextbookSubject === "전체") return freeTextbooks;
    return freeTextbooks.filter((p) => p.subject === selectedFreeTextbookSubject);
  }, [freeTextbooks, selectedFreeTextbookSubject]);

  const suneungTextbooks = useMemo(() => {
    const subjectAllow = new Set(["국어", "수학", "영어", "물리학I", "물리학II"]);
    return textbooks.filter((p) => subjectAllow.has(p.subject) && !p.isFree);
  }, [textbooks]);

  const transferTextbooks = useMemo(() => {
    const subjectAllow = new Set(["미적분학", "대학물리학"]);
    return textbooks.filter((p) => subjectAllow.has(p.subject) && !p.isFree);
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
    if (selectedFreeTextbookSubject === "전체") return;
    if (!freeTextbookSubjects.includes(selectedFreeTextbookSubject)) setSelectedFreeTextbookSubject("전체");
  }, [selectedFreeTextbookSubject, freeTextbookSubjects]);

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
      <div className="mt-4 md:mt-6">
        <h2 className="inline-flex items-center text-[20px] md:text-[26px] font-bold tracking-[-0.02em] leading-none">
          <span aria-hidden="true" className="-translate-y-[0.5px]">|&nbsp;</span>
          <span>강의 구매하기</span>
        </h2>
        {courseSubjects.length > 1 ? (
          <div className="mt-2 md:mt-8">
            {/* 모바일: 탭 메뉴 스타일 */}
            <div className="flex gap-4 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide md:hidden">
              {courseSubjects.map((subject) => {
                const active = selectedCourseSubject === subject;
                return (
                  <button
                    key={`course-home-${subject}`}
                    type="button"
                    onClick={() => setSelectedCourseSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {subject}
                    {active ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {/* 데스크톱: 탭 메뉴 스타일 */}
            <div className="hidden md:flex gap-6 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide">
              {courseSubjects.map((subject) => {
                const active = selectedCourseSubject === subject;
                return (
                  <button
                    key={`course-home-${subject}-desktop`}
                    type="button"
                    onClick={() => setSelectedCourseSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`relative shrink-0 px-1 py-2 text-[15px] font-semibold ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {subject}
                    {active ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-6">
          <ProductGrid products={filteredCourses} emptyLabel="등록된 강의 상품이 없습니다" eagerCount={8} />
        </div>
      </div>

      <div className="mt-14 md:mt-20">
        {/* 무료 자료 다운로드 */}
        {freeTextbooks.length > 0 ? (
          <div className="mb-14 md:mb-16">
            <h2 className="inline-flex items-center text-[20px] md:text-[26px] font-bold tracking-[-0.02em] leading-none">
              <span aria-hidden="true" className="-translate-y-[0.5px]">|&nbsp;</span>
              <span>무료 자료 다운로드</span>
            </h2>
            {freeTextbookSubjects.length > 1 ? (
              <div className="mt-2 md:mt-8">
                {/* 모바일: 탭 메뉴 스타일 */}
                <div className="flex gap-4 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide md:hidden">
                  {freeTextbookSubjects.map((subject) => {
                    const active = selectedFreeTextbookSubject === subject;
                    return (
                      <button
                        key={`textbook-free-home-${subject}`}
                        type="button"
                        onClick={() => setSelectedFreeTextbookSubject(subject)}
                        role="tab"
                        aria-selected={active}
                        className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold ${
                          active ? "text-white" : "text-white/55"
                        }`}
                      >
                        {subject}
                        {active ? (
                          <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {/* 데스크톱: 탭 메뉴 스타일 */}
                <div className="hidden md:flex gap-6 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide">
                  {freeTextbookSubjects.map((subject) => {
                    const active = selectedFreeTextbookSubject === subject;
                    return (
                      <button
                        key={`textbook-free-home-${subject}-desktop`}
                        type="button"
                        onClick={() => setSelectedFreeTextbookSubject(subject)}
                        role="tab"
                        aria-selected={active}
                        className={`relative shrink-0 px-1 py-2 text-[15px] font-semibold ${
                          active ? "text-white" : "text-white/55"
                        }`}
                      >
                        {subject}
                        {active ? (
                          <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="mt-6">
              <ExpandableProductGrid
                products={filteredFreeTextbooks}
                emptyLabel="등록된 무료 자료가 없습니다"
                collapsedRows={3}
                eagerCount={8}
              />
            </div>
          </div>
        ) : null}

        <h2 className="inline-flex items-center text-[20px] md:text-[26px] font-bold tracking-[-0.02em] leading-none">
          <span aria-hidden="true" className="-translate-y-[0.5px]">|&nbsp;</span>
          <span>수능 교재 구매하기</span>
        </h2>
        {suneungTextbookSubjects.length > 1 ? (
          <div className="mt-2 md:mt-8">
            {/* 모바일: 탭 메뉴 스타일 */}
            <div className="flex gap-4 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide md:hidden">
              {suneungTextbookSubjects.map((subject) => {
                const active = selectedSuneungTextbookSubject === subject;
                return (
                  <button
                    key={`textbook-suneung-home-${subject}`}
                    type="button"
                    onClick={() => setSelectedSuneungTextbookSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {subject}
                    {active ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {/* 데스크톱: 탭 메뉴 스타일 */}
            <div className="hidden md:flex gap-6 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide">
              {suneungTextbookSubjects.map((subject) => {
                const active = selectedSuneungTextbookSubject === subject;
                return (
                  <button
                    key={`textbook-suneung-home-${subject}-desktop`}
                    type="button"
                    onClick={() => setSelectedSuneungTextbookSubject(subject)}
                    role="tab"
                    aria-selected={active}
                    className={`relative shrink-0 px-1 py-2 text-[15px] font-semibold ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {subject}
                    {active ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
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
            eagerCount={8}
          />
        </div>

        <div className="mt-14 md:mt-16">
          <h3 className="inline-flex items-center text-[20px] md:text-[26px] font-bold tracking-[-0.02em] leading-none">
            <span aria-hidden="true" className="-translate-y-[0.5px]">|&nbsp;</span>
            <span>편입 교재 구매하기</span>
          </h3>
          {transferTextbookSubjects.length > 1 ? (
            <div className="mt-2 md:mt-8">
              {/* 모바일: 탭 메뉴 스타일 */}
              <div className="flex gap-4 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide md:hidden">
                {transferTextbookSubjects.map((subject) => {
                  const active = selectedTransferTextbookSubject === subject;
                  return (
                    <button
                      key={`textbook-transfer-home-${subject}`}
                      type="button"
                      onClick={() => setSelectedTransferTextbookSubject(subject)}
                      role="tab"
                      aria-selected={active}
                      className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold ${
                        active ? "text-white" : "text-white/55"
                      }`}
                    >
                      {subject}
                      {active ? (
                        <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {/* 데스크톱: 탭 메뉴 스타일 */}
              <div className="hidden md:flex gap-6 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide">
                {transferTextbookSubjects.map((subject) => {
                  const active = selectedTransferTextbookSubject === subject;
                  return (
                    <button
                      key={`textbook-transfer-home-${subject}-desktop`}
                      type="button"
                      onClick={() => setSelectedTransferTextbookSubject(subject)}
                      role="tab"
                      aria-selected={active}
                      className={`relative shrink-0 px-1 py-2 text-[15px] font-semibold ${
                        active ? "text-white" : "text-white/55"
                      }`}
                    >
                      {subject}
                      {active ? (
                        <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                      ) : null}
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
              eagerCount={8}
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
              <div className="mt-6">
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

          {/* 데스크탑: 탭 메뉴 스타일로 통일 */}
          <div className="hidden md:flex items-end justify-between gap-6">
            {/* 과목 필터 */}
            {subjects.length > 1 ? (
              <div className="flex min-w-0 flex-1 gap-6 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide" role="tablist">
                {subjects.map((subject) => {
                  const active = selectedSubject === subject;
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setSelectedSubject(subject)}
                      role="tab"
                      aria-selected={active}
                      className={`relative shrink-0 px-1 py-2 text-[15px] font-semibold ${
                        active ? "text-white" : "text-white/55"
                      }`}
                    >
                      {subject}
                      {active ? (
                        <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {/* 타입(교재/강의) 탭 */}
            <div
              className="flex shrink-0 justify-end gap-6 border-b border-white/10 pb-2"
              role="tablist"
              aria-label="교재/강의 선택"
            >
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
                    className={`relative shrink-0 px-1 py-2 text-[15px] font-semibold ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {t}
                    {active ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
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


