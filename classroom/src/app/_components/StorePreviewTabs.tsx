"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function getDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

export default function StorePreviewTabs({
  courses,
  textbooks,
  defaultType = "교재",
}: {
  courses: StorePreviewProduct[];
  textbooks: StorePreviewProduct[];
  defaultType?: TypeLabel;
}) {
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
                        active ? "px-4 py-2 rounded-full bg-white text-black" : "px-2 py-2 text-white/55 hover:text-white"
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
                      active ? "px-4 py-2 rounded-full bg-white text-black" : "px-2 py-2 text-white/55 hover:text-white"
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
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10">
            {filteredProducts.map((product) => (
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
                        <span className="text-[11px] text-white/30 line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
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
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="material-symbols-outlined text-white/20" style={{ fontSize: "64px" }} aria-hidden="true">
              search_off
            </span>
            <p className="mt-4 text-[18px] font-medium text-white/60">해당 조건의 상품이 없습니다</p>
            <p className="mt-2 text-[14px] text-white/40">다른 필터를 선택해보세요</p>
          </div>
        )}
      </div>

      {/* 모바일 전체 보기 */}
      {/* (요청사항) 상단/하단 '전체 보기' CTA 제거 */}
    </section>
  );
}


