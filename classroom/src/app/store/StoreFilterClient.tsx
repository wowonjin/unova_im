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
  thumbnailStoredPath?: string | null;
  thumbnailUpdatedAtISO?: string | null;
  rating: number | null;
  reviewCount: number | null;
};

// 입시 유형별 과목 매핑
const EXAM_TYPES = ["전체", "내신", "수능", "편입학"] as const;
type ExamType = (typeof EXAM_TYPES)[number];

// 입시 유형별 과목 정의
// 내신/수능: 고등학교 교과목 (수학, 물리학I/II 등)
// 편입학: 대학 교과목 (미적분학, 대학물리학 등)
const EXAM_SUBJECTS: Record<ExamType, string[]> = {
  "전체": [], // 전체는 모든 과목 표시
  "내신": ["수학", "수학I", "수학II", "미적분", "확률과 통계", "기하", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II"],
  "수능": ["수학", "수학I", "수학II", "미적분", "확률과 통계", "기하", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II"],
  "편입학": ["미적분학", "대학물리학", "일반물리학", "일반화학", "일반생물학", "선형대수학", "공업수학"],
};

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function getDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
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
  const [selectedExamType, setSelectedExamType] = useState<ExamType>(
    EXAM_TYPES.includes(initialExamType as ExamType) ? (initialExamType as ExamType) : "전체"
  );
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // 현재 입시 유형에서 사용 가능한 과목 목록 계산
  const availableSubjects = useMemo(() => {
    if (selectedExamType === "전체") {
      // 전체인 경우 모든 상품의 과목을 수집
      const subjectSet = new Set(products.map((p) => p.subject));
      const subjectOrder = ["전체", "수학", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II", "일반물리학", "일반화학", "일반생물학", "미적분학", "선형대수학", "공업수학"];
      const orderedSubjects = subjectOrder.filter((s) => s === "전체" || subjectSet.has(s));
      const otherSubjects = Array.from(subjectSet).filter((s) => !subjectOrder.includes(s));
      return [...orderedSubjects, ...otherSubjects];
    }
    // 특정 입시 유형이 선택된 경우 해당 과목만 표시
    const examSubjects = EXAM_SUBJECTS[selectedExamType];
    const subjectSet = new Set(products.map((p) => p.subject));
    const availableFromExam = examSubjects.filter((s) => subjectSet.has(s));
    return ["전체", ...availableFromExam];
  }, [selectedExamType, products]);

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

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    let result = products;

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
  }, [products, selectedExamType, selectedSubject, searchQuery]);

  // 전체를 제외한 입시 유형
  const examTypesWithoutAll = EXAM_TYPES.filter((t) => t !== "전체");
  // 전체를 제외한 과목 목록
  const subjectsWithoutAll = availableSubjects.filter((s) => s !== "전체");

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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10">
              {filteredProducts.map((product) => (
                <Link key={product.id} href={`/store/${product.id}`} className="group">
                  <div
                    className={`relative aspect-video overflow-hidden transition-all rounded-2xl ${
                      product.type === "textbook"
                        ? "bg-gradient-to-br from-white/[0.06] to-white/[0.02]"
                        : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
                    }`}
                  >
                    {/* 교재 종류 배지 (교재만) */}
                    {product.type === "textbook" && product.textbookType ? (
                      <div className="absolute left-3 top-3 z-10">
                        <span
                          className={`rounded-lg font-semibold text-white backdrop-blur ${
                            String(product.textbookType).trim().toUpperCase() === "PDF"
                              ? "bg-gradient-to-r from-blue-500 to-purple-500 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-[11px]"
                              : "bg-black/70 px-2.5 py-1 text-[11px]"
                          }`}
                        >
                          {product.textbookType}
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
                  </div>

                  {/* 상품 정보 */}
                  <div className="mt-3 px-0.5">
                    <h3 className="text-[14px] font-medium text-white leading-snug line-clamp-2 group-hover:text-white/90">
                      {product.title}
                    </h3>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-[13px] font-semibold text-white">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && (
                        <>
                          <span className="text-[11px] text-white/30 line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                          <span className="text-[11px] font-semibold text-rose-400">
                            {getDiscount(product.originalPrice, product.price)}%
                          </span>
                        </>
                      )}
                    </div>
                    {/* 평점, 강사, 과목 */}
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white">
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
                    )}
                  </div>
                </Link>
              ))}
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
