"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
const LECTURE_GRADES = [
  { key: "G1", label: "고1" },
  { key: "G2", label: "고2" },
  { key: "G3", label: "고3" },
] as const;
type LectureGrade = (typeof LECTURE_GRADES)[number]["key"];
const LECTURE_SUBJECTS_BY_GRADE: Record<LectureGrade, string[]> = {
  G1: [],
  G2: ["내신 수학", "내신 물리학"],
  G3: ["수학", "물리학I", "물리학II"],
};

const TRANSFER_SUBJECTS = [
  "미적분학",
  "대학물리학",
  "일반물리학",
  "일반화학",
  "일반생물학",
  "선형대수학",
  "공업수학",
];

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

function normalizeText(v: string | null | undefined): string {
  return String(v ?? "").replace(/\s+/g, "").toLowerCase();
}

function matchLectureSubject(product: Product, subject: string): boolean {
  const haystack = [
    normalizeText(product.subject),
    normalizeText(product.title),
    ...product.tags.map((t) => normalizeText(t)),
  ].join(" ");
  const isNaesin = haystack.includes("내신");

  if (subject === "내신 수학") return isNaesin && haystack.includes("수학");
  if (subject === "내신 물리학") return isNaesin && (haystack.includes("물리학") || haystack.includes("물리"));
  if (subject === "수학") return haystack.includes("수학") && !isNaesin;
  if (subject === "물리학I") return haystack.includes("물리학i") || haystack.includes("물리학1");
  if (subject === "물리학II") return haystack.includes("물리학ii") || haystack.includes("물리학2");
  return false;
}

interface StoreFilterClientProps {
  products: Product[];
  selectedType: string;
  initialSubject?: string;
  initialExamType?: string;
  initialLectureGrade?: string;
}

export default function StoreFilterClient({
  products,
  selectedType,
  initialSubject = "전체",
  initialExamType = "전체",
  initialLectureGrade = "G2",
}: StoreFilterClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allowedExamTypes: readonly ExamType[] =
    selectedType === "강의"
      ? EXAM_TYPES.filter((t): t is Exclude<ExamType, "편입"> => t !== "편입")
      : EXAM_TYPES;

  const initialExamTypeNormalized: ExamType =
    allowedExamTypes.includes(initialExamType as ExamType) ? (initialExamType as ExamType) : "전체";

  const isDefaultMathPhysicalTextbookLanding =
    selectedType === "교재" &&
    (initialExamTypeNormalized === "수능" || initialExamTypeNormalized === "내신");
  const isDefaultTransferEbookLanding =
    selectedType === "교재" && initialExamTypeNormalized === "편입";
  const isLectureLanding = selectedType === "강의";
  const initialLectureGradeNormalized: LectureGrade = (() => {
    if (initialLectureGrade === "G1" || initialLectureGrade === "G2" || initialLectureGrade === "G3") {
      return initialLectureGrade;
    }
    return "G2";
  })();
  const initialLectureGradeValue: LectureGrade = (() => {
    if (initialSubject !== "전체") {
      if (LECTURE_SUBJECTS_BY_GRADE.G2.includes(initialSubject)) return "G2";
      if (LECTURE_SUBJECTS_BY_GRADE.G3.includes(initialSubject)) return "G3";
    }
    return initialLectureGradeNormalized;
  })();
  const initialLectureSubjectValue =
    initialSubject === "전체"
      ? (LECTURE_SUBJECTS_BY_GRADE[initialLectureGradeValue][0] ?? "전체")
      : initialSubject;
  const initialSubjectValue = isLectureLanding
    ? initialLectureSubjectValue
    : initialSubject !== "전체"
    ? initialSubject
    : isDefaultMathPhysicalTextbookLanding
      ? "수학"
      : isDefaultTransferEbookLanding
        ? "미적분학"
        : initialSubject;
  const initialBookFormatValue: BookFormat =
    isDefaultMathPhysicalTextbookLanding
      ? "실물책"
      : isDefaultTransferEbookLanding
        ? "전자책"
        : "전체";

  const selectedExamType = initialExamTypeNormalized;
  const [selectedLectureGrade, setSelectedLectureGrade] = useState<LectureGrade>(initialLectureGradeValue);
  const [selectedSubject, setSelectedSubject] = useState(
    initialSubjectValue
  );
  const [selectedBookFormat, setSelectedBookFormat] = useState<BookFormat>(initialBookFormatValue);

  // 교재 페이지 과목 선택을 URL 쿼리에 동기화해 상단 타이틀(서버 렌더)도 같은 선택을 반영합니다.
  useEffect(() => {
    if (selectedType !== "교재") return;
    const currentSubject = searchParams.get("subject") || "전체";
    if (currentSubject === selectedSubject) return;

    const next = new URLSearchParams(searchParams.toString());
    if (selectedSubject === "전체") next.delete("subject");
    else next.set("subject", selectedSubject);

    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectedSubject, selectedType]);

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
    if (selectedType === "강의") {
      return LECTURE_SUBJECTS_BY_GRADE[selectedLectureGrade];
    }
    const subjectSet = new Set(visibleProducts.map((p) => p.subject));
    // "해당 입시"에 맞는 과목만 보이게: 현재 visibleProducts(=입시 필터 적용 결과)에서 과목을 뽑습니다.
    const order =
      selectedExamType === "편입"
        ? ["전체", ...TRANSFER_SUBJECTS]
        : ["전체", "수학", "물리학I", "물리학II", "화학I", "화학II", "생명과학I", "생명과학II", "지구과학I", "지구과학II"];

    const ordered = order.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !order.includes(s));
    return [...ordered, ...other];
  }, [selectedExamType, selectedLectureGrade, selectedType, visibleProducts]);

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

  // 과목 변경 (토글 기능)
  const handleSubjectChange = useCallback((subject: string) => {
    if (selectedType === "강의") {
      setSelectedSubject(subject);
      return;
    }
    if (selectedSubject === subject) {
      // 이미 선택된 항목 클릭 시 선택 해제
      setSelectedSubject("전체");
    } else {
      setSelectedSubject(subject);
    }
  }, [selectedSubject, selectedType]);

  const handleLectureGradeChange = useCallback((grade: LectureGrade) => {
    setSelectedLectureGrade(grade);
    const nextSubjects = LECTURE_SUBJECTS_BY_GRADE[grade];
    setSelectedSubject(nextSubjects[0] ?? "전체");
  }, []);

  const handleBookFormatChange = useCallback((fmt: BookFormat) => {
    if (selectedBookFormat === fmt) setSelectedBookFormat("전체");
    else setSelectedBookFormat(fmt);
  }, [selectedBookFormat]);

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    let result = visibleProducts;

    if (selectedType === "강의") {
      if (selectedLectureGrade === "G1") return [];
      if (selectedSubject === "전체") {
        return result.filter((p) =>
          LECTURE_SUBJECTS_BY_GRADE[selectedLectureGrade].some((subject) =>
            matchLectureSubject(p, subject)
          )
        );
      }
      return result.filter((p) => matchLectureSubject(p, selectedSubject));
    }

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

    return result;
  }, [visibleProducts, selectedType, selectedBookFormat, selectedSubject, selectedLectureGrade]);

  // 전체를 제외한 과목 목록
  const subjectsWithoutAll = availableSubjects.filter((s) => s !== "전체");
  const bookFormatsWithoutAll = availableBookFormats.filter((t) => t !== "전체") as BookFormat[];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <div className="space-y-4 pt-6 md:pt-8">
        {/* 상품 위 툴바: 왼쪽 과목 / 오른쪽 종류 */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 md:flex-1">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {subjectsWithoutAll.map((subject) => {
                const active = selectedSubject === subject;
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => handleSubjectChange(subject)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      active
                        ? "bg-white text-black"
                        : "bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedType === "강의" ? (
            <div className="flex items-center gap-2 md:justify-end">
              {LECTURE_GRADES.map((grade) => (
                <button
                  key={grade.key}
                  type="button"
                  onClick={() => handleLectureGradeChange(grade.key)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    selectedLectureGrade === grade.key
                      ? "bg-white text-black"
                      : "bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white"
                  }`}
                >
                  {grade.label}
                </button>
              ))}
            </div>
          ) : null}

          {selectedType === "교재" && bookFormatsWithoutAll.length > 0 ? (
            <div className="flex items-center gap-2 md:justify-end">
              {bookFormatsWithoutAll.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleBookFormatChange(fmt)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    selectedBookFormat === fmt
                      ? "bg-white text-black"
                      : "bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <main className="min-w-0">
          <div className="mb-0 sm:mb-5">
            <p className="hidden sm:block text-[14px] text-white/50">
              총 <span className="text-white font-medium">{filteredProducts.length}</span>개의{" "}
              {selectedType === "강의" ? "강의" : "교재"}
            </p>
          </div>

          {/* 상품 그리드 */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-9 sm:gap-x-6 sm:gap-y-12">
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
                해당 조건의 상품이 없습니다
              </p>
              <p className="mt-2 text-[14px] text-white/40">
                다른 과목/종류를 선택해보세요
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
