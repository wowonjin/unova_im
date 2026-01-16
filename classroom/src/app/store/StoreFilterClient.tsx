"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";

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
  type: "course" | "textbook";
  thumbnailUrl: string | null;
  isSoldOut: boolean;
  thumbnailStoredPath?: string | null;
  thumbnailUpdatedAtISO?: string | null;
  rating: number | null;
  reviewCount: number | null;
};

// 입시 유형별 과목 매핑
const EXAM_TYPES = ["전체", "내신", "수능"] as const;
type ExamType = (typeof EXAM_TYPES)[number];

// 교재 유형(실물책/전자책) 필터
const BOOK_FORMATS = ["전체", "실물책", "전자책"] as const;
type BookFormat = (typeof BOOK_FORMATS)[number];

// 편입학(대학 과목) 관련 과목은 스토어에서 숨김 처리
const HIDDEN_SUBJECTS = new Set<string>([
  "미적분학",
  "대학물리학",
  "일반물리학",
  "일반화학",
  "일반생물학",
  "선형대수학",
  "공업수학",
]);

// 입시 유형별 과목 정의
// 내신/수능: 고등학교 교과목 (수학, 물리학I/II 등)
const EXAM_SUBJECTS: Record<ExamType, string[]> = {
  "전체": [], // 전체는 모든 과목 표시
  "내신": ["수학", "수학I", "수학II", "미적분", "확률과 통계", "기하", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II"],
  "수능": ["수학", "수학I", "수학II", "미적분", "확률과 통계", "기하", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II"],
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
  const visibleProducts = useMemo(
    () => products.filter((p) => !HIDDEN_SUBJECTS.has(p.subject)),
    [products]
  );

  const [selectedExamType, setSelectedExamType] = useState<ExamType>(
    EXAM_TYPES.includes(initialExamType as ExamType) ? (initialExamType as ExamType) : "전체"
  );
  const [selectedSubject, setSelectedSubject] = useState(
    initialSubject !== "전체" && HIDDEN_SUBJECTS.has(initialSubject) ? "전체" : initialSubject
  );
  const [selectedBookFormat, setSelectedBookFormat] = useState<BookFormat>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // 현재 입시 유형에서 사용 가능한 과목 목록 계산
  const availableSubjects = useMemo(() => {
    if (selectedExamType === "전체") {
      // 전체인 경우 모든 상품의 과목을 수집
      const subjectSet = new Set(visibleProducts.map((p) => p.subject));
      const subjectOrder = ["전체", "수학", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II"];
      const orderedSubjects = subjectOrder.filter((s) => s === "전체" || subjectSet.has(s));
      const otherSubjects = Array.from(subjectSet).filter((s) => !subjectOrder.includes(s));
      return [...orderedSubjects, ...otherSubjects];
    }
    // 특정 입시 유형이 선택된 경우 해당 과목만 표시
    const examSubjects = EXAM_SUBJECTS[selectedExamType];
    const subjectSet = new Set(visibleProducts.map((p) => p.subject));
    const availableFromExam = examSubjects.filter((s) => subjectSet.has(s));
    return ["전체", ...availableFromExam];
  }, [selectedExamType, visibleProducts]);

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

    // 입시 유형 필터
    if (selectedExamType !== "전체") {
      const examSubjects = EXAM_SUBJECTS[selectedExamType];
      result = result.filter((p) => examSubjects.includes(p.subject));
    }

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
  }, [visibleProducts, selectedExamType, selectedSubject, searchQuery]);

  // 전체를 제외한 입시 유형
  const examTypesWithoutAll = EXAM_TYPES.filter((t) => t !== "전체");
  // 전체를 제외한 과목 목록
  const subjectsWithoutAll = availableSubjects.filter((s) => s !== "전체");
  const bookFormatsWithoutAll = BOOK_FORMATS.filter((t) => t !== "전체");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 왼쪽 사이드바 */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-[90px] space-y-6 pt-2">
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
                {subjectsWithoutAll.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => handleSubjectChange(subject)}
                    className={`text-[12px] font-medium rounded-md min-w-16 px-3 py-1.5 text-center ${
                      selectedSubject === subject
                        ? "bg-white text-black"
                        : "bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white"
                    }`}
                  >
                    {subject}
                  </button>
                ))}
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
                <p className="mt-2 text-[12px] text-white/40">
                  실물책: <span className="text-white/60">실물책+PDF</span> · 전자책: <span className="text-white/60">PDF</span>
                </p>
              </div>
            ) : null}
          </div>
        </aside>

        {/* 오른쪽 상품 목록 */}
        <main className="flex-1 min-w-0">
          {/* 상품 개수 */}
          <div className="mb-5">
            <p className="text-[14px] text-white/50">
              총 <span className="text-white font-medium">{filteredProducts.length}</span>개의 교재
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

                    {/* 품절 배지 */}
                    {product.isSoldOut ? (
                      <div className="absolute right-2 top-2 z-10">
                        <span className="inline-flex items-center rounded-full bg-zinc-700/80 px-3 py-1 text-[10px] font-semibold text-white/90 border border-white/10 backdrop-blur">
                          품절
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

                    {/* 품절 오버레이(가독성/상태 강조) */}
                    {product.isSoldOut ? (
                      <div
                        className="absolute inset-0 bg-black/35"
                        aria-hidden="true"
                      />
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
