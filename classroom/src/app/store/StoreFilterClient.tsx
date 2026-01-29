"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";

function UnderlineTabBar({
  items,
  activeKey,
  onSelect,
  ariaLabel,
  className = "",
}: {
  items: { key: string; label: string }[];
  activeKey: string;
  onSelect: (key: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2.5 sm:gap-3 md:gap-4 overflow-x-auto border-b border-white/10 pb-1.5 sm:pb-2 scrollbar-hide ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((it) => {
        const active = activeKey === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onSelect(it.key)}
            role="tab"
            aria-selected={active}
            className={`relative shrink-0 px-0.5 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-semibold transition-colors ${
              active ? "text-white" : "text-white/55"
            }`}
          >
            {it.label}
            {active ? (
              <span
                className="absolute left-0 right-0 -bottom-1.5 sm:-bottom-2 h-[2px] rounded-full bg-white"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

type Product = {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  price: number;
  originalPrice: number | null;
  tag: string | null;
  tags: string[];
  textbookType: string | null;
  gradeCategory?: "G1_2" | "SUNEUNG" | "TRANSFER" | null;
  type: "course" | "textbook";
  thumbnailUrl: string | null;
  isSoldOut: boolean;
  thumbnailStoredPath?: string | null;
  thumbnailUpdatedAtISO?: string | null;
  rating: number | null;
  reviewCount: number | null;
};

// 입시 유형별 과목 매핑
// - 내신/수능: 고등학교 교과
// - 편입: 대학 과목(편입 대비)
const EXAM_TYPES = ["전체", "내신", "수능", "편입"] as const;
type ExamType = (typeof EXAM_TYPES)[number];

// 교재 유형(실물책/전자책) 필터
const BOOK_FORMATS = ["전체", "실물책", "전자책"] as const;
type BookFormat = (typeof BOOK_FORMATS)[number];

const TRANSFER_SUBJECTS = [
  "미적분학",
  "대학물리학",
  "일반물리학",
  "일반화학",
  "일반생물학",
  "선형대수학",
  "공업수학",
];

// 편입 과목별 오른쪽 보조 라벨(요청사항)
const TRANSFER_SUBJECT_RIGHT_LABEL: Partial<Record<string, string>> = {
  "대학물리학": "연세대학교 · 고려대학교 · 중앙대학교",
};

// 입시 유형별 과목 정의
// 내신/수능: 고등학교 교과목 (수학, 물리학I/II 등)
const EXAM_SUBJECTS: Record<ExamType, string[]> = {
  "전체": [], // 전체는 모든 과목 표시
  "내신": ["수학", "수학I", "수학II", "미적분", "확률과 통계", "기하", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II"],
  "수능": ["수학", "수학I", "수학II", "미적분", "확률과 통계", "기하", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II"],
  "편입": TRANSFER_SUBJECTS,
};

const EXAM_TO_GRADE_CATEGORY: Record<Exclude<ExamType, "전체">, "G1_2" | "SUNEUNG" | "TRANSFER"> = {
  내신: "G1_2",
  수능: "SUNEUNG",
  편입: "TRANSFER",
};

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function getDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

function normalizeTextbookType(v: string | null | undefined): string {
  return String(v ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

interface StoreFilterClientProps {
  products: Product[];
  selectedType: string;
  initialSubject?: string;
  initialExamType?: string;
}

export default function StoreFilterClient({
  products,
  selectedType,
  initialSubject = "전체",
  initialExamType = "전체",
}: StoreFilterClientProps) {
  const allowedExamTypes: ExamType[] =
    selectedType === "강의"
      ? (EXAM_TYPES.filter((t) => t !== "편입") as ExamType[])
      : (EXAM_TYPES as ExamType[]);

  const initialExamTypeNormalized: ExamType =
    allowedExamTypes.includes(initialExamType as ExamType) ? (initialExamType as ExamType) : "전체";

  const [selectedExamType, setSelectedExamType] = useState<ExamType>(
    initialExamTypeNormalized
  );
  const [selectedSubject, setSelectedSubject] = useState(
    initialSubject
  );
  const [selectedBookFormat, setSelectedBookFormat] = useState<BookFormat>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const visibleProducts = useMemo(() => {
    // 교재 페이지에서는 DB의 gradeCategory 기준으로 입시(내신/수능/편입)를 나눕니다.
    if (selectedType === "교재" && selectedExamType !== "전체") {
      const target = EXAM_TO_GRADE_CATEGORY[selectedExamType];
      return products.filter((p) => p.type === "textbook" && (p.gradeCategory ?? "G1_2") === target);
    }

    // 강의 페이지(또는 전체): 기존처럼 과목 기반 필터를 유지합니다.
    if (selectedType !== "교재" && selectedExamType !== "전체") {
      const examSubjects = EXAM_SUBJECTS[selectedExamType];
      return products.filter((p) => examSubjects.includes(p.subject));
    }

    return products;
  }, [products, selectedExamType, selectedType]);

  // 현재 입시 유형에서 사용 가능한 과목 목록 계산
  const availableSubjects = useMemo(() => {
    const subjectSet = new Set(visibleProducts.map((p) => p.subject));
    // "해당 입시"에 맞는 과목만 보이게: 현재 visibleProducts(=입시 필터 적용 결과)에서 과목을 뽑습니다.
    const order =
      selectedExamType === "편입"
        ? ["전체", ...TRANSFER_SUBJECTS]
        : ["전체", "수학", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II"];

    const ordered = order.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !order.includes(s));
    return [...ordered, ...other];
  }, [selectedExamType, visibleProducts]);

  // UX: 입시(내신/수능/편입) 선택 시 과목을 자동으로 "첫 번째 과목"으로 맞춤
  // - 전체(토글 해제)로 돌아가면 과목도 전체로 유지
  useEffect(() => {
    if (selectedExamType === "전체") return;
    if (selectedSubject !== "전체") return;
    const first = availableSubjects.find((s) => s !== "전체") ?? "전체";
    if (first !== "전체") setSelectedSubject(first);
  }, [availableSubjects, selectedExamType, selectedSubject]);

  const availableBookFormats = useMemo(() => {
    if (selectedType !== "교재") return BOOK_FORMATS as unknown as string[];
    const hasPdf = visibleProducts.some((p) => p.type === "textbook" && normalizeTextbookType(p.textbookType) === "PDF");
    const hasPhysical = visibleProducts.some(
      (p) => p.type === "textbook" && normalizeTextbookType(p.textbookType) === normalizeTextbookType("실물책+PDF")
    );
    const out: string[] = ["전체"];
    if (hasPhysical) out.push("실물책");
    if (hasPdf) out.push("전자책");
    return out;
  }, [selectedType, visibleProducts]);

  // 입시 유형 변경 시 과목 초기화 (토글 기능)
  const handleExamTypeChange = useCallback((examType: ExamType) => {
    if (selectedExamType === examType) {
      // 이미 선택된 항목 클릭 시 선택 해제
      setSelectedExamType("전체");
    } else {
      setSelectedExamType(examType);
    }
    setSelectedSubject("전체");
  }, [selectedExamType]);

  // 과목 변경 (토글 기능)
  const handleSubjectChange = useCallback((subject: string) => {
    if (selectedSubject === subject) {
      // 이미 선택된 항목 클릭 시 선택 해제
      setSelectedSubject("전체");
    } else {
      setSelectedSubject(subject);
    }
  }, [selectedSubject]);

  const handleBookFormatChange = useCallback((fmt: BookFormat) => {
    if (selectedBookFormat === fmt) setSelectedBookFormat("전체");
    else setSelectedBookFormat(fmt);
  }, [selectedBookFormat]);

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    let result = visibleProducts;

    // 교재 유형 필터(교재 페이지에서만)
    if (selectedType === "교재" && selectedBookFormat !== "전체") {
      if (selectedBookFormat === "전자책") {
        // "PDF" 배지인 교재만
        result = result.filter((p) => p.type !== "textbook" ? false : normalizeTextbookType(p.textbookType) === "PDF");
      } else if (selectedBookFormat === "실물책") {
        // "실물책+PDF" 배지인 교재만
        result = result.filter((p) =>
          p.type !== "textbook" ? false : normalizeTextbookType(p.textbookType) === normalizeTextbookType("실물책+PDF")
        );
      }
    }

    // 입시 유형 필터는 visibleProducts 단계에서 이미 적용됨

    // 과목 필터
    if (selectedSubject !== "전체") {
      result = result.filter((p) => p.subject === selectedSubject);
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.teacher.toLowerCase().includes(query) ||
          p.subject.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    return result;
  }, [visibleProducts, selectedType, selectedBookFormat, selectedExamType, selectedSubject, searchQuery]);

  // 전체를 제외한 입시 유형
  const examTypesWithoutAll = allowedExamTypes.filter((t) => t !== "전체");
  // 전체를 제외한 과목 목록
  const subjectsWithoutAll = availableSubjects.filter((s) => s !== "전체");
  const bookFormatsWithoutAll = availableBookFormats.filter((t) => t !== "전체") as BookFormat[];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <div className="flex flex-col lg:flex-row gap-1 sm:gap-6 lg:gap-8">
        {/* 왼쪽 사이드바 */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-[90px] space-y-6 pt-2">
            {/* 모바일: 메인과 동일한 탭바 UI */}
            <div className="lg:hidden space-y-2.5">
              {/* 모바일에서는 검색 UI를 숨깁니다. (요청사항) */}

              {/* 입시: 탭바 */}
              <div>
                <h3 className="sr-only">입시</h3>
                <UnderlineTabBar
                  ariaLabel="입시 선택"
                  items={allowedExamTypes.map((t) => ({ key: t, label: t }))}
                  activeKey={selectedExamType}
                  onSelect={(k) => handleExamTypeChange(k as ExamType)}
                />
              </div>

              {/* 과목: 탭바 */}
              <div>
                <h3 className="sr-only">과목</h3>
                <UnderlineTabBar
                  ariaLabel="과목 선택"
                  items={availableSubjects.map((s) => {
                    const rightLabel =
                      selectedExamType === "편입" ? TRANSFER_SUBJECT_RIGHT_LABEL[s] : undefined;
                    return {
                      key: s,
                      // 모바일 탭바는 공간이 좁아도 가로 스크롤이 가능하므로 텍스트로 결합
                      label: rightLabel ? `${s}  ${rightLabel}` : s,
                    };
                  })}
                  activeKey={selectedSubject}
                  onSelect={(k) => handleSubjectChange(k)}
                />
              </div>

              {/* 종류(교재만): 실물책/전자책 */}
              {selectedType === "교재" ? (
                <div>
                  <h3 className="sr-only">종류</h3>
                  <UnderlineTabBar
                    ariaLabel="교재 종류 선택"
                    items={availableBookFormats.map((fmt) => ({ key: fmt, label: fmt }))}
                    activeKey={selectedBookFormat}
                    onSelect={(k) => handleBookFormatChange(k as BookFormat)}
                  />
                </div>
              ) : null}
            </div>

            {/* 데스크톱: 기존 버튼 UI 유지 */}
            <div className="hidden lg:block space-y-6">
            {/* 검색 */}
            <div>
              <h3 className="text-[13px] font-medium text-white/50 mb-3">검색</h3>
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                  isSearchFocused
                    ? "bg-white/[0.12]"
                    : "bg-white/[0.08] hover:bg-white/[0.12]"
                }`}
              >
                <input
                  type="text"
                  placeholder="교재명, 선생님..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="flex-1 bg-transparent text-[13px] text-white placeholder-white/40 outline-none"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.1] text-white/60 transition-colors hover:bg-white/[0.15] hover:text-white"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : (
                  <span className="material-symbols-outlined text-[16px] text-white/40">search</span>
                )}
              </div>
            </div>

            {/* 입시 유형 */}
            <div>
              <h3 className="text-[13px] font-medium text-white/50 mb-3">입시</h3>
              <div className="flex flex-wrap gap-2">
                {examTypesWithoutAll.map((examType) => (
                  <button
                    key={examType}
                    onClick={() => handleExamTypeChange(examType)}
                    className={`text-[12px] font-medium rounded-md w-16 py-1.5 text-center ${
                      selectedExamType === examType
                        ? "bg-white text-black"
                        : "bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white"
                    }`}
                  >
                    {examType}
                  </button>
                ))}
              </div>
            </div>

            {/* 과목 */}
            <div>
              <h3 className="text-[13px] font-medium text-white/50 mb-3">과목</h3>
              <div className="flex flex-wrap gap-2">
                {subjectsWithoutAll.map((subject) => {
                  const active = selectedSubject === subject;
                  const rightLabel =
                    selectedExamType === "편입" ? TRANSFER_SUBJECT_RIGHT_LABEL[subject] : undefined;

                  return (
                    <button
                      key={subject}
                      onClick={() => handleSubjectChange(subject)}
                      className={`text-[12px] font-medium rounded-md px-3 py-1.5 ${
                        active
                          ? "bg-white text-black"
                          : "bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white"
                      } ${rightLabel ? "min-w-[220px] text-left" : "min-w-16 text-center"}`}
                    >
                      {rightLabel ? (
                        <span className="flex w-full items-center justify-between gap-3">
                          <span className="shrink-0">{subject}</span>
                          <span className={`text-[11px] ${active ? "text-black/60" : "text-white/40"}`}>
                            {rightLabel}
                          </span>
                        </span>
                      ) : (
                        subject
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 종류(교재만): 실물책/전자책 */}
            {selectedType === "교재" ? (
              <div>
                <h3 className="text-[13px] font-medium text-white/50 mb-3">종류</h3>
                <div className="flex flex-wrap gap-2">
                  {bookFormatsWithoutAll.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleBookFormatChange(fmt)}
                      className={`text-[12px] font-medium rounded-md min-w-16 px-3 py-1.5 text-center ${
                        selectedBookFormat === fmt
                          ? "bg-white text-black"
                          : "bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          </div>
        </aside>

        {/* 오른쪽 상품 목록 */}
        <main className="flex-1 min-w-0">
          {/* 상품 개수 */}
          <div className="mb-0 sm:mb-5">
            <p className="hidden sm:block text-[14px] text-white/50">
              총 <span className="text-white font-medium">{filteredProducts.length}</span>개의{" "}
              {selectedType === "강의" ? "강의" : "교재"}
              {searchQuery && (
                <span className="ml-2 text-white/40">
                  · &quot;{searchQuery}&quot; 검색 결과
                </span>
              )}
            </p>
          </div>

          {/* 상품 그리드 */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-9 sm:gap-x-6 sm:gap-y-12">
              {filteredProducts.map((product, idx) => {
                // 스토어 목록은 썸네일이 많아서, 전부 eager 로딩 시 네트워크/메인스레드가 잠겨
                // "페이지가 늦게 뜨는" 체감이 커집니다. 상단 일부만 eager, 나머지는 lazy로 분산합니다.
                const eager = idx < 6;

                const Card = (
                  <>
                    <div
                      className={`relative aspect-video overflow-hidden transition-all rounded-xl ${
                        product.type === "textbook"
                          ? "bg-gradient-to-br from-white/[0.06] to-white/[0.02]"
                          : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
                      }`}
                    >
                    {/* 교재 종류 배지 (교재만) */}
                    {product.type === "textbook" && product.textbookType ? (
                      <div className="absolute left-1 top-1 z-10 sm:left-2 sm:top-2">
                        <span
                          className={`inline-flex max-w-[12ch] items-center truncate rounded-md font-semibold text-white backdrop-blur sm:max-w-none ${
                            String(product.textbookType).trim().toUpperCase() === "PDF"
                              ? "bg-gradient-to-r from-blue-500 to-purple-500 px-1.5 py-0.5 text-[9px] sm:px-2 sm:py-0.5 sm:text-[10px]"
                              : "bg-black/70 px-1.5 py-0.5 text-[9px] sm:px-2 sm:py-0.5 sm:text-[10px]"
                          }`}
                        >
                          {product.textbookType}
                        </span>
                      </div>
                    ) : null}

                    {/* 준비중 배지 */}
                    {product.isSoldOut ? (
                      <div className="absolute right-2 top-2 z-10">
                        <span className="inline-flex items-center rounded-full bg-zinc-700/80 px-3 py-1 text-[10px] font-semibold text-white/90 border border-white/10 backdrop-blur">
                          준비중
                        </span>
                      </div>
                    ) : null}

                    {/* 상품 이미지 영역 */}
                    {product.thumbnailUrl ||
                    (product.type === "course" && product.thumbnailStoredPath) ? (
                      <img
                        src={
                          product.type === "course"
                            ? `/api/courses/${product.id}/thumbnail${product.thumbnailUpdatedAtISO ? `?v=${encodeURIComponent(product.thumbnailUpdatedAtISO)}` : ""}`
                            : `/api/textbooks/${product.id}/thumbnail${product.thumbnailUpdatedAtISO ? `?v=${encodeURIComponent(product.thumbnailUpdatedAtISO)}` : ""}`
                        }
                        alt={product.title}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading={eager ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={eager ? "high" : "low"}
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
                          >
                            {product.type === "course" ? "play_circle" : "auto_stories"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 준비중(=isSoldOut) 상품은 예전처럼 썸네일을 살짝 어둡게 처리 */}
                    {product.isSoldOut ? (
                      <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden="true" />
                    ) : null}
                    </div>

                    {/* 상품 정보 */}
                    <div className="mt-3 px-0.5">
                    <h3 className="text-[15px] font-medium text-white leading-snug line-clamp-2 group-hover:text-white/90">
                      {product.title}
                    </h3>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-[14px] font-semibold text-white">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && (
                        <>
                          <span className="text-[12px] text-white/30 line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                          <span className="text-[12px] font-semibold text-rose-400">
                            {getDiscount(product.originalPrice, product.price)}%
                          </span>
                        </>
                      )}
                    </div>
                    {/* 평점, 강사, 과목 */}
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] text-white">
                      <span className="flex items-center gap-0.5">
                        <span className="text-yellow-400">⭐</span>
                        <span>{(product.rating ?? 0).toFixed(1)}</span>
                        <span>({product.reviewCount ?? 0})</span>
                      </span>
                      {product.teacher && (
                        <>
                          <span className="text-white/70">·</span>
                          <span>{product.teacher}T</span>
                        </>
                      )}
                    </div>
                    {/* 태그 (관리자 상세 탭에서 입력한 쉼표 구분 태그들) */}
                    {product.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {product.tags
                          .filter((t) => t.trim().toUpperCase() !== "ORIGINAL")
                          .slice(0, 6)
                          .map((t, idx) => (
                            <span
                              key={`${product.id}-tag-${t}`}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
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
                    )}
                    </div>
                  </>
                );

                return (
                  <Link
                    key={product.id}
                    href={`/store/${product.id}`}
                    className={`group ${product.isSoldOut ? "opacity-90" : ""}`}
                    title={product.isSoldOut ? "준비중인 상품입니다" : undefined}
                  >
                    {Card}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <span className="material-symbols-outlined text-white/20" style={{ fontSize: "64px" }}>
                search_off
              </span>
              <p className="mt-4 text-[18px] font-medium text-white/60">
                {searchQuery ? "검색 결과가 없습니다" : "해당 조건의 상품이 없습니다"}
              </p>
              <p className="mt-2 text-[14px] text-white/40">
                {searchQuery ? "다른 검색어를 입력해보세요" : "다른 필터를 선택해보세요"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
